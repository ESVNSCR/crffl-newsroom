import { supabase } from './supabase.js';
import { getLeagueOverview, getLeagueMatchups, getNflState } from './sleeper.js';
import { getSleeperPlayerMap, resolvePlayerName } from './sleeperPlayers.js';

function isTuesdayOrLaterPacific() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
  });
  const pacificDay = formatter.format(new Date());
  return ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(pacificDay);
}

/**
 * Fetch Sleeper player statistics for a regular season week
 */
export async function fetchSleeperStats(season = 2026, week = 1) {
  try {
    const res = await fetch(`https://api.sleeper.app/v1/stats/nfl/regular/${season}/${week}`, { cache: 'no-store' });
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.warn(`Could not fetch Sleeper stats for ${season} week ${week}:`, err.message);
    return {};
  }
}

/**
 * Fetch Sleeper player projections for a regular season week
 */
export async function fetchSleeperProjections(season = 2026, week = 1) {
  try {
    const res = await fetch(`https://api.sleeper.app/v1/projections/nfl/regular/${season}/${week}`, { cache: 'no-store' });
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.warn(`Could not fetch Sleeper projections for ${season} week ${week}:`, err.message);
    return {};
  }
}

/**
 * Calculates a player's projected points using league custom scoring settings
 */
export function calculatePlayerProjection(playerProjectionStats, scoringSettings = {}) {
  if (!playerProjectionStats) return 0;

  if (scoringSettings && Object.keys(scoringSettings).length > 0) {
    let customSum = 0;
    let matched = 0;
    for (const [stat, val] of Object.entries(playerProjectionStats)) {
      if (typeof val === 'number' && scoringSettings[stat] !== undefined) {
        customSum += val * scoringSettings[stat];
        matched++;
      }
    }
    if (matched > 0) {
      return Number(customSum.toFixed(2));
    }
  }

  // Fallback to standard points if no custom scoring match
  return Number(
    (
      playerProjectionStats.pts_half_ppr ??
      playerProjectionStats.pts_ppr ??
      playerProjectionStats.pts_std ??
      0
    ).toFixed(2)
  );
}

/**
 * Solves the optimal lineup for a team's full roster
 * Roster spots: 1 QB, 2 RB, 2 WR, 2 FLEX (RB/WR/TE), 1 REC_FLEX (WR/TE), 1 SUPER_FLEX (QB/RB/WR/TE), 1 K, 1 DEF
 */
function calculateOptimalScore(matchup, playerMap) {
  const players = (matchup.players || []).map((pid) => {
    const info = playerMap[pid] || {};
    return {
      pid,
      pos: info.pos || 'N/A',
      name: info.name || pid,
      pts: Number(matchup.players_points?.[pid] || 0),
    };
  });

  // Sort descending by points
  players.sort((a, b) => b.pts - a.pts);

  const used = new Set();
  const optimalSlots = [];

  const pickBest = (filterFn, count = 1) => {
    let picked = 0;
    for (const p of players) {
      if (!used.has(p.pid) && filterFn(p.pos)) {
        used.add(p.pid);
        optimalSlots.push(p);
        picked++;
        if (picked >= count) break;
      }
    }
  };

  // 1. Core mandatory positions
  pickBest((pos) => pos === 'QB', 1);
  pickBest((pos) => pos === 'RB', 2);
  pickBest((pos) => pos === 'WR', 2);

  // 2. Flex spots
  pickBest((pos) => ['RB', 'WR', 'TE'].includes(pos), 2); // 2 FLEX
  pickBest((pos) => ['WR', 'TE'].includes(pos), 1);        // 1 REC_FLEX
  pickBest((pos) => ['QB', 'RB', 'WR', 'TE'].includes(pos), 1); // 1 SUPER_FLEX

  // 3. Specials
  pickBest((pos) => pos === 'K', 1);
  pickBest((pos) => pos === 'DEF', 1);

  const optimalScore = optimalSlots.reduce((sum, p) => sum + p.pts, 0);
  return { optimalScore, optimalSlots };
}

/**
 * Evaluates and adjudicates the weekly regular season contest for a given week.
 * Updates the Supabase weekly_contests table upon completion.
 */
export async function adjudicateWeekContest(weekNumber, { force = false, preview = false } = {}) {
  const week = Number(weekNumber);
  if (!week || week < 1 || week > 14) {
    throw new Error(`Invalid week number for contest adjudication: ${weekNumber}`);
  }

  // 1. Fetch overview, matchups, player map, and NFL state
  const [overview, rawMatchups, playerMap, nflState] = await Promise.all([
    getLeagueOverview(),
    getLeagueMatchups(week),
    getSleeperPlayerMap(),
    getNflState(),
  ]);

  if (!rawMatchups || rawMatchups.length === 0) {
    return { success: false, reason: `No matchups found on Sleeper for Week ${week}.` };
  }

  // Check if games have actually been played
  const totalLeaguePoints = rawMatchups.reduce((sum, m) => sum + (m.points || 0), 0);
  if (totalLeaguePoints === 0) {
    return { success: false, reason: `Matchups for Week ${week} have not been played yet (0 total points).` };
  }

  // Enrich matchups with manager and team metadata
  const matchups = rawMatchups.map((m) => {
    const meta = overview.rosters[m.roster_id] || {
      managerName: `Manager #${m.roster_id}`,
      teamName: `Team #${m.roster_id}`,
    };
    return {
      ...m,
      managerName: meta.managerName,
      teamName: meta.teamName,
      logoUrl: meta.logoUrl,
    };
  });

  let winnerManager = null;
  let winnerTeam = null;
  let winningScore = null;
  let explanation = '';

  switch (week) {
    // -------------------------------------------------------------
    // Week 1: Breakout — Starter exceeding projected points by largest margin
    // -------------------------------------------------------------
    case 1: {
      const projections = await fetchSleeperProjections(2026, 1);
      const scoringSettings = overview.scoringSettings || {};
      let maxDiff = -Infinity;
      let topStarter = null;

      for (const m of matchups) {
        for (const pid of m.starters || []) {
          const actual = Number(m.players_points?.[pid] || 0);
          const proj = calculatePlayerProjection(projections?.[pid], scoringSettings);
          const diff = actual - proj;

          if (diff > maxDiff) {
            maxDiff = diff;
            topStarter = {
              pid,
              name: resolvePlayerName(pid, playerMap),
              actual,
              proj,
              diff,
              managerName: m.managerName,
              teamName: m.teamName,
            };
          }
        }
      }

      if (topStarter) {
        winnerManager = topStarter.managerName;
        winnerTeam = topStarter.teamName;
        winningScore = `+${topStarter.diff.toFixed(2)} pts`;
        explanation = `${topStarter.name} scored ${topStarter.actual.toFixed(2)} pts against a ${topStarter.proj.toFixed(2)} projection (+${topStarter.diff.toFixed(2)} margin).`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 2: Cold Shower — Highest scoring bench player
    // -------------------------------------------------------------
    case 2: {
      let maxBenchPts = -Infinity;
      let topBenchPlayer = null;

      for (const m of matchups) {
        const startersSet = new Set(m.starters || []);
        const benchPids = (m.players || []).filter((pid) => !startersSet.has(pid));

        for (const pid of benchPids) {
          const pts = Number(m.players_points?.[pid] || 0);
          if (pts > maxBenchPts) {
            maxBenchPts = pts;
            topBenchPlayer = {
              pid,
              name: resolvePlayerName(pid, playerMap),
              pts,
              managerName: m.managerName,
              teamName: m.teamName,
            };
          }
        }
      }

      if (topBenchPlayer) {
        winnerManager = topBenchPlayer.managerName;
        winnerTeam = topBenchPlayer.teamName;
        winningScore = `${topBenchPlayer.pts.toFixed(2)} pts`;
        explanation = `${topBenchPlayer.name} exploded for ${topBenchPlayer.pts.toFixed(2)} pts while sitting on the bench.`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 3: Flexual Healing — Highest scoring player in WR/RB/TE flex spot
    // Slots 5, 6, 7 are FLEX / REC_FLEX
    // -------------------------------------------------------------
    case 3: {
      let maxFlexPts = -Infinity;
      let topFlexPlayer = null;

      for (const m of matchups) {
        const flexPids = [m.starters?.[5], m.starters?.[6], m.starters?.[7]].filter(Boolean);
        for (const pid of flexPids) {
          const pts = Number(m.players_points?.[pid] || 0);
          if (pts > maxFlexPts) {
            maxFlexPts = pts;
            topFlexPlayer = {
              pid,
              name: resolvePlayerName(pid, playerMap),
              pts,
              managerName: m.managerName,
              teamName: m.teamName,
            };
          }
        }
      }

      if (topFlexPlayer) {
        winnerManager = topFlexPlayer.managerName;
        winnerTeam = topFlexPlayer.teamName;
        winningScore = `${topFlexPlayer.pts.toFixed(2)} pts`;
        explanation = `${topFlexPlayer.name} dominated the flex spot with ${topFlexPlayer.pts.toFixed(2)} pts.`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 4: The Anchor — Lowest scoring player on a WINNING team (> 0 pts)
    // -------------------------------------------------------------
    case 4: {
      // Group by matchup_id to find winning teams
      const matchupGroups = {};
      for (const m of matchups) {
        matchupGroups[m.matchup_id] = matchupGroups[m.matchup_id] || [];
        matchupGroups[m.matchup_id].push(m);
      }

      const winningTeams = [];
      for (const pair of Object.values(matchupGroups)) {
        if (pair.length === 2) {
          winningTeams.push(pair[0].points >= pair[1].points ? pair[0] : pair[1]);
        }
      }

      let minAnchorPts = Infinity;
      let anchorPlayer = null;

      for (const m of winningTeams) {
        for (const pid of m.starters || []) {
          const pts = Number(m.players_points?.[pid] || 0);
          // Must be active and scored points (> 0)
          if (pts > 0 && pts < minAnchorPts) {
            minAnchorPts = pts;
            anchorPlayer = {
              pid,
              name: resolvePlayerName(pid, playerMap),
              pts,
              managerName: m.managerName,
              teamName: m.teamName,
            };
          }
        }
      }

      if (anchorPlayer) {
        winnerManager = anchorPlayer.managerName;
        winnerTeam = anchorPlayer.teamName;
        winningScore = `${anchorPlayer.pts.toFixed(2)} pts`;
        explanation = `${anchorPlayer.name} dragged down a winning roster with just ${anchorPlayer.pts.toFixed(2)} pts.`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 5: Air Raid — Highest combined score from WR1 & WR2 spots
    // Slots 3 & 4
    // -------------------------------------------------------------
    case 5: {
      let maxAirRaid = -Infinity;
      let topDuo = null;

      for (const m of matchups) {
        const wr1Pid = m.starters?.[3];
        const wr2Pid = m.starters?.[4];
        const wr1Pts = Number(m.players_points?.[wr1Pid] || 0);
        const wr2Pts = Number(m.players_points?.[wr2Pid] || 0);
        const total = wr1Pts + wr2Pts;

        if (total > maxAirRaid) {
          maxAirRaid = total;
          topDuo = {
            total,
            wr1Name: resolvePlayerName(wr1Pid, playerMap),
            wr1Pts,
            wr2Name: resolvePlayerName(wr2Pid, playerMap),
            wr2Pts,
            managerName: m.managerName,
            teamName: m.teamName,
          };
        }
      }

      if (topDuo) {
        winnerManager = topDuo.managerName;
        winnerTeam = topDuo.teamName;
        winningScore = `${topDuo.total.toFixed(2)} combined pts`;
        explanation = `${topDuo.wr1Name} (${topDuo.wr1Pts.toFixed(1)}) and ${topDuo.wr2Name} (${topDuo.wr2Pts.toFixed(1)}) combined for ${topDuo.total.toFixed(2)} pts.`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 6: Bad Beat — Highest scoring team that still loses
    // -------------------------------------------------------------
    case 6: {
      const matchupGroups = {};
      for (const m of matchups) {
        matchupGroups[m.matchup_id] = matchupGroups[m.matchup_id] || [];
        matchupGroups[m.matchup_id].push(m);
      }

      let maxLosingScore = -Infinity;
      let badBeatTeam = null;

      for (const pair of Object.values(matchupGroups)) {
        if (pair.length === 2) {
          const loser = pair[0].points < pair[1].points ? pair[0] : pair[1];
          const winner = pair[0].points < pair[1].points ? pair[1] : pair[0];

          if (loser.points > maxLosingScore) {
            maxLosingScore = loser.points;
            badBeatTeam = {
              loser,
              winner,
            };
          }
        }
      }

      if (badBeatTeam) {
        winnerManager = badBeatTeam.loser.managerName;
        winnerTeam = badBeatTeam.loser.teamName;
        winningScore = `${badBeatTeam.loser.points.toFixed(2)} pts`;
        explanation = `Put up a monstrous ${badBeatTeam.loser.points.toFixed(2)} pts but still lost to ${badBeatTeam.winner.teamName} (${badBeatTeam.winner.points.toFixed(2)} pts).`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 7: Running Wild — Highest combined score from RB1 & RB2 spots
    // Slots 1 & 2
    // -------------------------------------------------------------
    case 7: {
      let maxRunningWild = -Infinity;
      let topRbDuo = null;

      for (const m of matchups) {
        const rb1Pid = m.starters?.[1];
        const rb2Pid = m.starters?.[2];
        const rb1Pts = Number(m.players_points?.[rb1Pid] || 0);
        const rb2Pts = Number(m.players_points?.[rb2Pid] || 0);
        const total = rb1Pts + rb2Pts;

        if (total > maxRunningWild) {
          maxRunningWild = total;
          topRbDuo = {
            total,
            rb1Name: resolvePlayerName(rb1Pid, playerMap),
            rb1Pts,
            rb2Name: resolvePlayerName(rb2Pid, playerMap),
            rb2Pts,
            managerName: m.managerName,
            teamName: m.teamName,
          };
        }
      }

      if (topRbDuo) {
        winnerManager = topRbDuo.managerName;
        winnerTeam = topRbDuo.teamName;
        winningScore = `${topRbDuo.total.toFixed(2)} combined pts`;
        explanation = `${topRbDuo.rb1Name} (${topRbDuo.rb1Pts.toFixed(1)}) and ${topRbDuo.rb2Name} (${topRbDuo.rb2Pts.toFixed(1)}) powered ${topRbDuo.total.toFixed(2)} backfield pts.`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 8: Ghost Town — Team with most single-digit starters (< 10 pts)
    // -------------------------------------------------------------
    case 8: {
      let maxSingleDigitCount = -1;
      let ghostTeam = null;

      for (const m of matchups) {
        let singleDigitCount = 0;
        for (const pid of m.starters || []) {
          const pts = Number(m.players_points?.[pid] || 0);
          if (pts < 10.0) {
            singleDigitCount++;
          }
        }

        if (singleDigitCount > maxSingleDigitCount) {
          maxSingleDigitCount = singleDigitCount;
          ghostTeam = {
            count: singleDigitCount,
            managerName: m.managerName,
            teamName: m.teamName,
            totalPts: m.points,
          };
        }
      }

      if (ghostTeam) {
        winnerManager = ghostTeam.managerName;
        winnerTeam = ghostTeam.teamName;
        winningScore = `${ghostTeam.count} single-digit starters`;
        explanation = `Rostered ${ghostTeam.count} of 11 starters scoring in single digits (< 10.0 pts).`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 9: Highlight Reel — Starter with longest run/reception from scrimmage
    // -------------------------------------------------------------
    case 9: {
      const stats = await fetchSleeperStats(2026, 9);
      let maxPlay = -Infinity;
      let topPlay = null;

      for (const m of matchups) {
        for (const pid of m.starters || []) {
          const pInfo = playerMap[pid] || {};
          if (pInfo.pos === 'K' || pInfo.pos === 'DEF') continue;

          const pStats = stats[pid] || {};
          const rushLng = Number(pStats.rush_lng || 0);
          const recLng = Number(pStats.rec_lng || 0);
          const best = Math.max(rushLng, recLng);

          if (best > maxPlay) {
            maxPlay = best;
            topPlay = {
              yards: best,
              type: rushLng >= recLng ? 'rush' : 'reception',
              name: resolvePlayerName(pid, playerMap),
              managerName: m.managerName,
              teamName: m.teamName,
            };
          }
        }
      }

      if (topPlay) {
        winnerManager = topPlay.managerName;
        winnerTeam = topPlay.teamName;
        winningScore = `${topPlay.yards} yards`;
        explanation = `${topPlay.name} broke free for a ${topPlay.yards}-yard ${topPlay.type} from scrimmage.`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 10: Managerial Malpractice — Largest gap between optimal and actual
    // -------------------------------------------------------------
    case 10: {
      let maxGap = -Infinity;
      let worstManager = null;

      for (const m of matchups) {
        const { optimalScore } = calculateOptimalScore(m, playerMap);
        const actualScore = Number(m.points || 0);
        const gap = optimalScore - actualScore;

        if (gap > maxGap) {
          maxGap = gap;
          worstManager = {
            gap,
            optimalScore,
            actualScore,
            managerName: m.managerName,
            teamName: m.teamName,
          };
        }
      }

      if (worstManager) {
        winnerManager = worstManager.managerName;
        winnerTeam = worstManager.teamName;
        winningScore = `+${worstManager.gap.toFixed(2)} pt gap`;
        explanation = `Left ${worstManager.gap.toFixed(2)} pts on the pine (Optimal: ${worstManager.optimalScore.toFixed(2)} vs Actual: ${worstManager.actualScore.toFixed(2)}).`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 11: Special Forces — Highest combined Kicker and Defense score
    // Slots 9 (K) and 10 (DEF)
    // -------------------------------------------------------------
    case 11: {
      let maxSpecial = -Infinity;
      let topSpecialTeam = null;

      for (const m of matchups) {
        const kPid = m.starters?.[9];
        const defPid = m.starters?.[10];
        const kPts = Number(m.players_points?.[kPid] || 0);
        const defPts = Number(m.players_points?.[defPid] || 0);
        const total = kPts + defPts;

        if (total > maxSpecial) {
          maxSpecial = total;
          topSpecialTeam = {
            total,
            kName: resolvePlayerName(kPid, playerMap),
            kPts,
            defName: resolvePlayerName(defPid, playerMap),
            defPts,
            managerName: m.managerName,
            teamName: m.teamName,
          };
        }
      }

      if (topSpecialTeam) {
        winnerManager = topSpecialTeam.managerName;
        winnerTeam = topSpecialTeam.teamName;
        winningScore = `${topSpecialTeam.total.toFixed(2)} combined pts`;
        explanation = `${topSpecialTeam.kName} (${topSpecialTeam.kPts.toFixed(1)}) and ${topSpecialTeam.defName} (${topSpecialTeam.defPts.toFixed(1)}) produced ${topSpecialTeam.total.toFixed(2)} special units pts.`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 12: The Turkey — Lowest Team Score (Must field complete roster)
    // -------------------------------------------------------------
    case 12: {
      let minScore = Infinity;
      let turkeyTeam = null;

      for (const m of matchups) {
        // Complete roster has 11 starters
        if ((m.starters || []).length >= 11) {
          const score = Number(m.points || 0);
          if (score > 0 && score < minScore) {
            minScore = score;
            turkeyTeam = {
              score,
              managerName: m.managerName,
              teamName: m.teamName,
            };
          }
        }
      }

      if (turkeyTeam) {
        winnerManager = turkeyTeam.managerName;
        winnerTeam = turkeyTeam.teamName;
        winningScore = `${turkeyTeam.score.toFixed(2)} pts`;
        explanation = `Served up a holiday turkey with a league-low ${turkeyTeam.score.toFixed(2)} total points while fielding a full lineup.`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 13: Nail Biter — Smallest margin of victory
    // -------------------------------------------------------------
    case 13: {
      const matchupGroups = {};
      for (const m of matchups) {
        matchupGroups[m.matchup_id] = matchupGroups[m.matchup_id] || [];
        matchupGroups[m.matchup_id].push(m);
      }

      let smallestMargin = Infinity;
      let nailBiterGame = null;

      for (const pair of Object.values(matchupGroups)) {
        if (pair.length === 2) {
          const diff = Math.abs(pair[0].points - pair[1].points);
          const winner = pair[0].points >= pair[1].points ? pair[0] : pair[1];
          const loser = pair[0].points >= pair[1].points ? pair[1] : pair[0];

          if (diff > 0 && diff < smallestMargin) {
            smallestMargin = diff;
            nailBiterGame = {
              diff,
              winner,
              loser,
            };
          }
        }
      }

      if (nailBiterGame) {
        winnerManager = nailBiterGame.winner.managerName;
        winnerTeam = nailBiterGame.winner.teamName;
        winningScore = `${nailBiterGame.diff.toFixed(2)} pt margin`;
        explanation = `Survived a razor-thin ${nailBiterGame.diff.toFixed(2)} pt nail-biter (${nailBiterGame.winner.points.toFixed(2)} to ${nailBiterGame.loser.points.toFixed(2)} over ${nailBiterGame.loser.teamName}).`;
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 14: The Hoarder — Highest combined bench score
    // -------------------------------------------------------------
    case 14: {
      let maxBenchTotal = -Infinity;
      let hoarderTeam = null;

      for (const m of matchups) {
        const startersSet = new Set(m.starters || []);
        const benchPids = (m.players || []).filter((pid) => !startersSet.has(pid));
        const benchTotal = benchPids.reduce(
          (sum, pid) => sum + Number(m.players_points?.[pid] || 0),
          0
        );

        if (benchTotal > maxBenchTotal) {
          maxBenchTotal = benchTotal;
          hoarderTeam = {
            benchTotal,
            managerName: m.managerName,
            teamName: m.teamName,
          };
        }
      }

      if (hoarderTeam) {
        winnerManager = hoarderTeam.managerName;
        winnerTeam = hoarderTeam.teamName;
        winningScore = `${hoarderTeam.benchTotal.toFixed(2)} bench pts`;
        explanation = `Hoarded an unbelievable ${hoarderTeam.benchTotal.toFixed(2)} points in bench depth.`;
      }
      break;
    }

    default:
      throw new Error(`Unsupported week number: ${week}`);
  }

  if (!winnerManager) {
    return {
      success: false,
      reason: `Could not determine a definitive winner for Week ${week}.`,
    };
  }

  // Determine whether the week can officially lock
  const currentNflWeek = nflState?.week || 1;
  const isPastWeek = week < currentNflWeek;
  const isTuesdayOrLater = isTuesdayOrLaterPacific();
  const shouldFinalize = (isPastWeek || isTuesdayOrLater || force) && !preview;

  // If games are still active (Sunday / Monday) and not forced, return in-progress tracking without locking DB
  if (!shouldFinalize) {
    return {
      success: true,
      week,
      status: 'in_progress',
      isFinal: false,
      winner_manager: winnerManager,
      winner_team: winnerTeam,
      winning_score: winningScore,
      detail: explanation,
      explanation: `${explanation} (Live in-progress leader — official winner locks Tuesday morning).`,
      notice: `Unofficial standing. Games are still underway (Monday Night Football remains). Official winner locks Tuesday morning after MNF.`,
      record: null,
    };
  }

  // Save / update in Supabase weekly_contests table (only when officially finalized on Tuesday morning or later)
  const { data: updatedRecord, error } = await supabase
    .from('weekly_contests')
    .update({
      winner_manager: winnerManager,
      winner_team: winnerTeam,
      winning_score: winningScore,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('week_number', week)
    .select()
    .single();

  if (error) {
    console.error('Error updating weekly_contests in Supabase:', error);
  }

  return {
    success: true,
    week,
    status: 'completed',
    isFinal: true,
    winner_manager: winnerManager,
    winner_team: winnerTeam,
    winning_score: winningScore,
    explanation,
    record: updatedRecord,
  };
}
