import { supabase } from './supabase.js';
import { getLeagueOverview, getLeagueMatchups, getNflState } from './sleeper.js';
import { getSleeperPlayerMap, resolvePlayerName } from './sleeperPlayers.js';

export const STAT_CORRECTION_THRESHOLD = 2.0;

/**
 * Query ESPN Scoreboard to check whether all NFL games for a week are completed,
 * whether any have started, and game event completion states.
 */
export async function getNflWeekGamesStatus(weekNumber) {
  try {
    const espnRes = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${weekNumber}&seasonType=2`,
      { cache: 'no-store' }
    );
    if (!espnRes.ok) throw new Error(`ESPN responded with status ${espnRes.status}`);
    const espnData = await espnRes.json();
    const events = espnData.events || [];

    const allGamesFinal = events.length > 0 && events.every((e) => e.status?.type?.completed);
    const anyGamesStarted = events.some((e) => e.status?.type?.state === 'in' || e.status?.type?.completed);

    return { allGamesFinal, anyGamesStarted, events };
  } catch (err) {
    console.warn(`getNflWeekGamesStatus error for week ${weekNumber}:`, err.message);
    return { allGamesFinal: false, anyGamesStarted: false, events: [] };
  }
}

/**
 * Calculate the Wednesday 10:00 AM PT stat correction lock deadline for a given week
 * based on the latest game kickoff time (typically Monday Night Football).
 */
export function getWednesdayStatCorrectionDeadlineForWeek(events, fallbackWeekNumber) {
  let latestGameDate = null;
  if (events && events.length > 0) {
    for (const e of events) {
      if (e.date) {
        const d = new Date(e.date);
        if (!latestGameDate || d > latestGameDate) latestGameDate = d;
      }
    }
  }

  if (!latestGameDate) {
    // Fallback based on 2026 NFL season kickoff
    const baseSunday = new Date('2026-09-13T17:00:00Z');
    baseSunday.setUTCDate(baseSunday.getUTCDate() + (fallbackWeekNumber - 1) * 7);
    latestGameDate = baseSunday;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });

  const cursor = new Date(latestGameDate.getTime());
  for (let i = 0; i < 7; i++) {
    const parts = formatter.formatToParts(cursor);
    const weekday = parts.find((p) => p.type === 'weekday').value;
    if (weekday === 'Wed') {
      const y = parts.find((p) => p.type === 'year').value;
      const m = String(parts.find((p) => p.type === 'month').value).padStart(2, '0');
      const d = String(parts.find((p) => p.type === 'day').value).padStart(2, '0');

      const isPdt = new Date(`${y}-${m}-${d}T12:00:00Z`)
        .toLocaleString('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'short' })
        .includes('PDT');
      const offsetStr = isPdt ? '-07:00' : '-08:00';
      return new Date(`${y}-${m}-${d}T10:00:00${offsetStr}`);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return null;
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
 * Supports live in-progress tracking, post-MNF instant finalization (margin >= 2.0 pts),
 * and Wednesday 10:00 AM PT stat correction hold (< 2.0 pts).
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
    return { success: false, status: 'upcoming', reason: `No matchups found on Sleeper for Week ${week}.` };
  }

  // Check if games have actually been played
  const totalLeaguePoints = rawMatchups.reduce((sum, m) => sum + (m.points || 0), 0);
  if (totalLeaguePoints === 0) {
    return {
      success: false,
      week,
      status: 'upcoming',
      reason: `Matchups for Week ${week} have not been played yet (0 total points).`,
    };
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
  let runnerUp = null;
  let margin = 0;
  let isClose = false;

  switch (week) {
    // -------------------------------------------------------------
    // Week 1: Breakout — Starter exceeding projected points by largest margin
    // -------------------------------------------------------------
    case 1: {
      const projections = await fetchSleeperProjections(2026, 1);
      const scoringSettings = overview.scoringSettings || {};
      const candidates = [];

      for (const m of matchups) {
        for (const pid of m.starters || []) {
          const actual = Number(m.players_points?.[pid] || 0);
          const proj = calculatePlayerProjection(projections?.[pid], scoringSettings);
          const diff = actual - proj;

          candidates.push({
            pid,
            name: resolvePlayerName(pid, playerMap),
            actual,
            proj,
            diff,
            managerName: m.managerName,
            teamName: m.teamName,
          });
        }
      }

      candidates.sort((a, b) => b.diff - a.diff);
      const top = candidates[0];
      const second = candidates[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `+${top.diff.toFixed(2)} pts`;
        margin = second ? Number((top.diff - second.diff).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `+${second.diff.toFixed(2)} pts`,
            name: second.name,
          };
          explanation = `${top.name} exceeded projection by +${top.diff.toFixed(2)} pts (${top.actual.toFixed(2)} scored vs ${top.proj.toFixed(2)} proj). Runner-up: ${second.name} (${second.teamName}) at +${second.diff.toFixed(2)} pts (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `${top.name} scored ${top.actual.toFixed(2)} pts against a ${top.proj.toFixed(2)} projection (+${top.diff.toFixed(2)} margin).`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 2: Cold Shower — Highest scoring bench player
    // -------------------------------------------------------------
    case 2: {
      const benchPlayers = [];

      for (const m of matchups) {
        const startersSet = new Set(m.starters || []);
        const benchPids = (m.players || []).filter((pid) => !startersSet.has(pid));

        for (const pid of benchPids) {
          const pts = Number(m.players_points?.[pid] || 0);
          benchPlayers.push({
            pid,
            name: resolvePlayerName(pid, playerMap),
            pts,
            managerName: m.managerName,
            teamName: m.teamName,
          });
        }
      }

      benchPlayers.sort((a, b) => b.pts - a.pts);
      const top = benchPlayers[0];
      const second = benchPlayers[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `${top.pts.toFixed(2)} pts`;
        margin = second ? Number((top.pts - second.pts).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `${second.pts.toFixed(2)} pts`,
            name: second.name,
          };
          explanation = `${top.name} exploded for ${top.pts.toFixed(2)} pts while sitting on the bench. Runner-up: ${second.name} (${second.teamName}) with ${second.pts.toFixed(2)} pts (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `${top.name} exploded for ${top.pts.toFixed(2)} pts while sitting on the bench.`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 3: Flexual Healing — Highest scoring player in WR/RB/TE flex spot
    // Slots 5, 6, 7 are FLEX / REC_FLEX
    // -------------------------------------------------------------
    case 3: {
      const flexPlayers = [];

      for (const m of matchups) {
        const flexPids = [m.starters?.[5], m.starters?.[6], m.starters?.[7]].filter(Boolean);
        for (const pid of flexPids) {
          const pts = Number(m.players_points?.[pid] || 0);
          flexPlayers.push({
            pid,
            name: resolvePlayerName(pid, playerMap),
            pts,
            managerName: m.managerName,
            teamName: m.teamName,
          });
        }
      }

      flexPlayers.sort((a, b) => b.pts - a.pts);
      const top = flexPlayers[0];
      const second = flexPlayers[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `${top.pts.toFixed(2)} pts`;
        margin = second ? Number((top.pts - second.pts).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `${second.pts.toFixed(2)} pts`,
            name: second.name,
          };
          explanation = `${top.name} dominated the flex spot with ${top.pts.toFixed(2)} pts. Runner-up: ${second.name} (${second.teamName}) with ${second.pts.toFixed(2)} pts (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `${top.name} dominated the flex spot with ${top.pts.toFixed(2)} pts.`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 4: The Anchor — Lowest scoring player on a WINNING team (> 0 pts)
    // -------------------------------------------------------------
    case 4: {
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

      const anchorPlayers = [];
      for (const m of winningTeams) {
        for (const pid of m.starters || []) {
          const pts = Number(m.players_points?.[pid] || 0);
          if (pts > 0) {
            anchorPlayers.push({
              pid,
              name: resolvePlayerName(pid, playerMap),
              pts,
              managerName: m.managerName,
              teamName: m.teamName,
            });
          }
        }
      }

      anchorPlayers.sort((a, b) => a.pts - b.pts);
      const top = anchorPlayers[0];
      const second = anchorPlayers[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `${top.pts.toFixed(2)} pts`;
        margin = second ? Number((second.pts - top.pts).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `${second.pts.toFixed(2)} pts`,
            name: second.name,
          };
          explanation = `${top.name} dragged down a winning roster with just ${top.pts.toFixed(2)} pts. Runner-up: ${second.name} (${second.teamName}) with ${second.pts.toFixed(2)} pts (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `${top.name} dragged down a winning roster with just ${top.pts.toFixed(2)} pts.`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 5: Air Raid — Highest combined score from WR1 & WR2 spots
    // Slots 3 & 4
    // -------------------------------------------------------------
    case 5: {
      const duos = [];

      for (const m of matchups) {
        const wr1Pid = m.starters?.[3];
        const wr2Pid = m.starters?.[4];
        const wr1Pts = Number(m.players_points?.[wr1Pid] || 0);
        const wr2Pts = Number(m.players_points?.[wr2Pid] || 0);
        const total = wr1Pts + wr2Pts;

        duos.push({
          total,
          wr1Name: resolvePlayerName(wr1Pid, playerMap),
          wr1Pts,
          wr2Name: resolvePlayerName(wr2Pid, playerMap),
          wr2Pts,
          managerName: m.managerName,
          teamName: m.teamName,
        });
      }

      duos.sort((a, b) => b.total - a.total);
      const top = duos[0];
      const second = duos[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `${top.total.toFixed(2)} combined pts`;
        margin = second ? Number((top.total - second.total).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `${second.total.toFixed(2)} combined pts`,
          };
          explanation = `${top.wr1Name} (${top.wr1Pts.toFixed(1)}) and ${top.wr2Name} (${top.wr2Pts.toFixed(1)}) combined for ${top.total.toFixed(2)} pts. Runner-up: ${second.teamName} with ${second.total.toFixed(2)} pts (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `${top.wr1Name} (${top.wr1Pts.toFixed(1)}) and ${top.wr2Name} (${top.wr2Pts.toFixed(1)}) combined for ${top.total.toFixed(2)} pts.`;
        }
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

      const badBeats = [];
      for (const pair of Object.values(matchupGroups)) {
        if (pair.length === 2) {
          const loser = pair[0].points < pair[1].points ? pair[0] : pair[1];
          const winner = pair[0].points < pair[1].points ? pair[1] : pair[0];
          badBeats.push({ loser, winner });
        }
      }

      badBeats.sort((a, b) => b.loser.points - a.loser.points);
      const top = badBeats[0];
      const second = badBeats[1] || null;

      if (top) {
        winnerManager = top.loser.managerName;
        winnerTeam = top.loser.teamName;
        winningScore = `${top.loser.points.toFixed(2)} pts`;
        margin = second ? Number((top.loser.points - second.loser.points).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.loser.managerName,
            teamName: second.loser.teamName,
            score: `${second.loser.points.toFixed(2)} pts`,
          };
          explanation = `Put up a monstrous ${top.loser.points.toFixed(2)} pts but still lost to ${top.winner.teamName} (${top.winner.points.toFixed(2)} pts). Runner-up: ${second.loser.teamName} with ${second.loser.points.toFixed(2)} pts (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `Put up a monstrous ${top.loser.points.toFixed(2)} pts but still lost to ${top.winner.teamName} (${top.winner.points.toFixed(2)} pts).`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 7: Running Wild — Highest combined score from RB1 & RB2 spots
    // Slots 1 & 2
    // -------------------------------------------------------------
    case 7: {
      const duos = [];

      for (const m of matchups) {
        const rb1Pid = m.starters?.[1];
        const rb2Pid = m.starters?.[2];
        const rb1Pts = Number(m.players_points?.[rb1Pid] || 0);
        const rb2Pts = Number(m.players_points?.[rb2Pid] || 0);
        const total = rb1Pts + rb2Pts;

        duos.push({
          total,
          rb1Name: resolvePlayerName(rb1Pid, playerMap),
          rb1Pts,
          rb2Name: resolvePlayerName(rb2Pid, playerMap),
          rb2Pts,
          managerName: m.managerName,
          teamName: m.teamName,
        });
      }

      duos.sort((a, b) => b.total - a.total);
      const top = duos[0];
      const second = duos[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `${top.total.toFixed(2)} combined pts`;
        margin = second ? Number((top.total - second.total).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `${second.total.toFixed(2)} combined pts`,
          };
          explanation = `${top.rb1Name} (${top.rb1Pts.toFixed(1)}) and ${top.rb2Name} (${top.rb2Pts.toFixed(1)}) powered ${top.total.toFixed(2)} backfield pts. Runner-up: ${second.teamName} with ${second.total.toFixed(2)} pts (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `${top.rb1Name} (${top.rb1Pts.toFixed(1)}) and ${top.rb2Name} (${top.rb2Pts.toFixed(1)}) powered ${top.total.toFixed(2)} backfield pts.`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 8: Ghost Town — Team with most single-digit starters (< 10 pts)
    // -------------------------------------------------------------
    case 8: {
      const ghostTeams = [];

      for (const m of matchups) {
        let singleDigitCount = 0;
        for (const pid of m.starters || []) {
          const pts = Number(m.players_points?.[pid] || 0);
          if (pts < 10.0) {
            singleDigitCount++;
          }
        }

        ghostTeams.push({
          count: singleDigitCount,
          managerName: m.managerName,
          teamName: m.teamName,
          totalPts: m.points,
        });
      }

      // Tiebreaker: lowest total team points
      ghostTeams.sort((a, b) => b.count - a.count || a.totalPts - b.totalPts);
      const top = ghostTeams[0];
      const second = ghostTeams[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `${top.count} single-digit starters`;
        margin = second ? top.count - second.count : 999;
        // Count difference: if tied (margin === 0), it is close
        isClose = margin === 0;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `${second.count} single-digit starters`,
          };
          explanation = `Rostered ${top.count} of 11 starters scoring in single digits (< 10.0 pts). Runner-up: ${second.teamName} with ${second.count} single-digit starters (Margin: ${margin} starters).`;
        } else {
          explanation = `Rostered ${top.count} of 11 starters scoring in single digits (< 10.0 pts).`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 9: Highlight Reel — Starter with longest run/reception from scrimmage
    // -------------------------------------------------------------
    case 9: {
      const stats = await fetchSleeperStats(2026, 9);
      const plays = [];

      for (const m of matchups) {
        for (const pid of m.starters || []) {
          const pInfo = playerMap[pid] || {};
          if (pInfo.pos === 'K' || pInfo.pos === 'DEF') continue;

          const pStats = stats[pid] || {};
          const rushLng = Number(pStats.rush_lng || 0);
          const recLng = Number(pStats.rec_lng || 0);
          const best = Math.max(rushLng, recLng);

          if (best > 0) {
            plays.push({
              yards: best,
              type: rushLng >= recLng ? 'rush' : 'reception',
              name: resolvePlayerName(pid, playerMap),
              managerName: m.managerName,
              teamName: m.teamName,
            });
          }
        }
      }

      plays.sort((a, b) => b.yards - a.yards);
      const top = plays[0];
      const second = plays[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `${top.yards} yards`;
        margin = second ? top.yards - second.yards : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `${second.yards} yards`,
            name: second.name,
          };
          explanation = `${top.name} broke free for a ${top.yards}-yard ${top.type} from scrimmage. Runner-up: ${second.name} (${second.teamName}) with a ${second.yards}-yard play (Margin: ${margin} yards).`;
        } else {
          explanation = `${top.name} broke free for a ${top.yards}-yard ${top.type} from scrimmage.`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 10: Managerial Malpractice — Largest gap between optimal and actual
    // -------------------------------------------------------------
    case 10: {
      const malpractices = [];

      for (const m of matchups) {
        const { optimalScore } = calculateOptimalScore(m, playerMap);
        const actualScore = Number(m.points || 0);
        const gap = optimalScore - actualScore;

        malpractices.push({
          gap,
          optimalScore,
          actualScore,
          managerName: m.managerName,
          teamName: m.teamName,
        });
      }

      malpractices.sort((a, b) => b.gap - a.gap);
      const top = malpractices[0];
      const second = malpractices[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `+${top.gap.toFixed(2)} pt gap`;
        margin = second ? Number((top.gap - second.gap).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `+${second.gap.toFixed(2)} pt gap`,
          };
          explanation = `Left ${top.gap.toFixed(2)} pts on the pine (Optimal: ${top.optimalScore.toFixed(2)} vs Actual: ${top.actualScore.toFixed(2)}). Runner-up: ${second.teamName} with +${second.gap.toFixed(2)} pt gap (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `Left ${top.gap.toFixed(2)} pts on the pine (Optimal: ${top.optimalScore.toFixed(2)} vs Actual: ${top.actualScore.toFixed(2)}).`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 11: Special Forces — Highest combined Kicker and Defense score
    // Slots 9 (K) and 10 (DEF)
    // -------------------------------------------------------------
    case 11: {
      const specials = [];

      for (const m of matchups) {
        const kPid = m.starters?.[9];
        const defPid = m.starters?.[10];
        const kPts = Number(m.players_points?.[kPid] || 0);
        const defPts = Number(m.players_points?.[defPid] || 0);
        const total = kPts + defPts;

        specials.push({
          total,
          kName: resolvePlayerName(kPid, playerMap),
          kPts,
          defName: resolvePlayerName(defPid, playerMap),
          defPts,
          managerName: m.managerName,
          teamName: m.teamName,
        });
      }

      specials.sort((a, b) => b.total - a.total);
      const top = specials[0];
      const second = specials[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `${top.total.toFixed(2)} combined pts`;
        margin = second ? Number((top.total - second.total).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `${second.total.toFixed(2)} combined pts`,
          };
          explanation = `${top.kName} (${top.kPts.toFixed(1)}) and ${top.defName} (${top.defPts.toFixed(1)}) produced ${top.total.toFixed(2)} special units pts. Runner-up: ${second.teamName} with ${second.total.toFixed(2)} pts (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `${top.kName} (${top.kPts.toFixed(1)}) and ${top.defName} (${top.defPts.toFixed(1)}) produced ${top.total.toFixed(2)} special units pts.`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 12: The Turkey — Lowest Team Score (Must field complete roster)
    // -------------------------------------------------------------
    case 12: {
      const turkeys = [];

      for (const m of matchups) {
        if ((m.starters || []).length >= 11) {
          const score = Number(m.points || 0);
          if (score > 0) {
            turkeys.push({
              score,
              managerName: m.managerName,
              teamName: m.teamName,
            });
          }
        }
      }

      turkeys.sort((a, b) => a.score - b.score);
      const top = turkeys[0];
      const second = turkeys[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `${top.score.toFixed(2)} pts`;
        margin = second ? Number((second.score - top.score).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `${second.score.toFixed(2)} pts`,
          };
          explanation = `Served up a holiday turkey with a league-low ${top.score.toFixed(2)} total points while fielding a full lineup. Runner-up: ${second.teamName} with ${second.score.toFixed(2)} pts (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `Served up a holiday turkey with a league-low ${top.score.toFixed(2)} total points while fielding a full lineup.`;
        }
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

      const nailBiters = [];
      for (const pair of Object.values(matchupGroups)) {
        if (pair.length === 2) {
          const diff = Math.abs(pair[0].points - pair[1].points);
          const winner = pair[0].points >= pair[1].points ? pair[0] : pair[1];
          const loser = pair[0].points >= pair[1].points ? pair[1] : pair[0];

          if (diff > 0) {
            nailBiters.push({
              diff,
              winner,
              loser,
            });
          }
        }
      }

      nailBiters.sort((a, b) => a.diff - b.diff);
      const top = nailBiters[0];
      const second = nailBiters[1] || null;

      if (top) {
        winnerManager = top.winner.managerName;
        winnerTeam = top.winner.teamName;
        winningScore = `${top.diff.toFixed(2)} pt margin`;
        margin = second ? Number((second.diff - top.diff).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.winner.managerName,
            teamName: second.winner.teamName,
            score: `${second.diff.toFixed(2)} pt margin`,
          };
          explanation = `Survived a razor-thin ${top.diff.toFixed(2)} pt nail-biter (${top.winner.points.toFixed(2)} to ${top.loser.points.toFixed(2)} over ${top.loser.teamName}). Runner-up: ${second.winner.teamName} with a ${second.diff.toFixed(2)} pt margin (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `Survived a razor-thin ${top.diff.toFixed(2)} pt nail-biter (${top.winner.points.toFixed(2)} to ${top.loser.points.toFixed(2)} over ${top.loser.teamName}).`;
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // Week 14: The Hoarder — Highest combined bench score
    // -------------------------------------------------------------
    case 14: {
      const hoarders = [];

      for (const m of matchups) {
        const startersSet = new Set(m.starters || []);
        const benchPids = (m.players || []).filter((pid) => !startersSet.has(pid));
        const benchTotal = benchPids.reduce(
          (sum, pid) => sum + Number(m.players_points?.[pid] || 0),
          0
        );

        hoarders.push({
          benchTotal,
          managerName: m.managerName,
          teamName: m.teamName,
        });
      }

      hoarders.sort((a, b) => b.benchTotal - a.benchTotal);
      const top = hoarders[0];
      const second = hoarders[1] || null;

      if (top) {
        winnerManager = top.managerName;
        winnerTeam = top.teamName;
        winningScore = `${top.benchTotal.toFixed(2)} bench pts`;
        margin = second ? Number((top.benchTotal - second.benchTotal).toFixed(2)) : 999;
        isClose = margin < STAT_CORRECTION_THRESHOLD;

        if (second) {
          runnerUp = {
            managerName: second.managerName,
            teamName: second.teamName,
            score: `${second.benchTotal.toFixed(2)} bench pts`,
          };
          explanation = `Hoarded an unbelievable ${top.benchTotal.toFixed(2)} points in bench depth. Runner-up: ${second.teamName} with ${second.benchTotal.toFixed(2)} bench pts (Margin: ${margin.toFixed(2)} pts).`;
        } else {
          explanation = `Hoarded an unbelievable ${top.benchTotal.toFixed(2)} points in bench depth.`;
        }
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

  // 2. Determine match completion and stat correction status
  const currentNflWeek = nflState?.week || 1;
  const isPastWeek = week < currentNflWeek;

  // Check game status on ESPN Scoreboard
  const { allGamesFinal, anyGamesStarted, events } = await getNflWeekGamesStatus(week);
  const isMnfCompleted = allGamesFinal || isPastWeek;

  // Calculate Wednesday 10:00 AM PT deadline
  const wednesdayDeadline = getWednesdayStatCorrectionDeadlineForWeek(events, week);
  const now = new Date();
  const isPastWedDeadline = wednesdayDeadline ? now >= wednesdayDeadline : false;

  // Rule:
  // 1. If MNF is not complete: week is strictly in_progress
  // 2. If MNF is complete:
  //    - If isClose (< 2.0 pts) and !isPastWedDeadline and !force: hold in stat_correction_pending
  //    - If !isClose (>= 2.0 pts) OR isPastWedDeadline OR force: officially completed!
  const shouldFinalize = force || (isMnfCompleted && (!isClose || isPastWedDeadline));

  // Case A: Games in progress (before MNF finishes)
  if (!isMnfCompleted) {
    return {
      success: true,
      week,
      status: 'in_progress',
      isFinal: false,
      winner_manager: winnerManager,
      winner_team: winnerTeam,
      winning_score: winningScore,
      margin,
      isClose,
      runner_up: runnerUp,
      detail: explanation,
      explanation: `${explanation} (Live in-progress leader — official winner declared after Monday Night Football).`,
      notice: 'Unofficial standing. Games are still underway (Monday Night Football remains). Official winner declared after MNF.',
      record: null,
    };
  }

  // Case B: MNF complete, but margin is close (< 2.0 pts) and waiting for Wednesday 10:00 AM PT
  if (!shouldFinalize) {
    return {
      success: true,
      week,
      status: 'stat_correction_pending',
      isFinal: false,
      winner_manager: winnerManager,
      winner_team: winnerTeam,
      winning_score: winningScore,
      margin,
      isClose: true,
      runner_up: runnerUp,
      detail: explanation,
      explanation: `${explanation} (Stat correction hold — margin under ${STAT_CORRECTION_THRESHOLD.toFixed(1)} pts. Locks Wednesday at 10:00 AM PT).`,
      notice: `All Week ${week} matches complete! Margin between 1st and 2nd is ${margin.toFixed(2)} pts (< ${STAT_CORRECTION_THRESHOLD.toFixed(1)} pts). Official winner locks Wednesday at 10:00 AM PT following stat corrections.`,
      record: null,
    };
  }

  // Case C: Officially Finalized (Decisive margin >= 2.0 pts, past Wednesday deadline, or forced)
  // Save / update in Supabase weekly_contests table
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
    margin,
    isClose: false,
    runner_up: runnerUp,
    detail: explanation,
    explanation,
    record: updatedRecord,
  };
}
