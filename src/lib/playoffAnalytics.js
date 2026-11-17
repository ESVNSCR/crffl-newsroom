/**
 * CRFFL Playoff Analytics & Monte Carlo Simulation Engine
 * Dr. Marcus Vance Desk for Applied Mathematics & Fantasy Arbitrage
 *
 * Rules:
 * - 10 Teams, 2 Divisions: Hood (Div 1) and St. Helens (Div 2)
 * - 6 Teams make playoffs:
 *     - Seeds #1 and #2: Division Champions (Earn First Round Bye)
 *     - Seeds #3 to #6: At-Large Wildcards (ranked by Win% then Points For)
 * - Regular season: Weeks 1 to 14
 * - Playoffs: Weeks 15 to 17 (Round 1: #3 vs #6, #4 vs #5; Round 2: #1 vs lowest remaining, #2 vs highest; Round 3: Championship)
 */

import { DEFAULT_LEAGUE_ID, MANAGERS } from './sleeper.js';

// In-memory cache for high-performance response times (TTL: 60s)
let cachedData = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export async function getPlayoffAnalytics(targetWeek = null) {
  const now = Date.now();
  if (cachedData && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedData;
  }

  try {
    const leagueId = DEFAULT_LEAGUE_ID;
    const [league, users, rosters, state] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${leagueId}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, { cache: 'no-store' }).then(r => r.json()),
      fetch('https://api.sleeper.app/v1/state/nfl', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ week: 10 }))
    ]);

    const regularSeasonWeeks = 14;
    const matchupWeeks = await Promise.all(
      Array.from({ length: regularSeasonWeeks }, (_, i) =>
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${i + 1}`, { cache: 'no-store' }).then(r => r.json())
      )
    );

    const divNames = {
      1: league.metadata?.division_1 || 'Hood',
      2: league.metadata?.division_2 || 'St. Helens'
    };

    const userMap = {};
    users.forEach(u => { userMap[u.user_id] = u; });

    // Determine completed weeks from matchupWeeks
    // A week is completed if all matchups have points > 0
    const completedWeeks = [];
    const futureWeeks = [];

    matchupWeeks.forEach((wk, i) => {
      const weekNum = i + 1;
      const hasScores = wk && wk.length > 0 && wk.every(m => m.points > 0);
      if (hasScores) {
        completedWeeks.push(weekNum);
      } else {
        futureWeeks.push(weekNum);
      }
    });

    const activeWeek = state.week || (completedWeeks.length > 0 ? Math.max(...completedWeeks) : 1);

    // Initialize team stats
    const teamStats = {};
    rosters.forEach(r => {
      const rid = r.roster_id;
      const user = userMap[r.owner_id] || {};
      const username = user.username || user.display_name || '';
      const preset = MANAGERS[username] || MANAGERS[user.display_name] || {};

      teamStats[rid] = {
        rosterId: rid,
        ownerId: r.owner_id,
        username,
        managerName: preset.managerName || user.display_name || `Manager ${rid}`,
        teamName: preset.teamName || user.metadata?.team_name || `Team ${rid}`,
        logoUrl: preset.logo || 'https://crffl.org/wp-content/uploads/2026/08/League-Logo-1.png',
        divisionId: r.settings?.division || 1,
        divisionName: divNames[r.settings?.division || 1],
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        weeklyScores: [],
        pastOpponents: [],
        futureOpponents: []
      };
    });

    // Populate actual points and matchups from completed weeks
    completedWeeks.forEach(w => {
      const wk = matchupWeeks[w - 1] || [];
      const pairs = {};
      wk.forEach(m => {
        if (!pairs[m.matchup_id]) pairs[m.matchup_id] = [];
        pairs[m.matchup_id].push(m);
      });

      for (const [mid, list] of Object.entries(pairs)) {
        if (list.length === 2) {
          const [t1, t2] = list;
          const s1 = teamStats[t1.roster_id];
          const s2 = teamStats[t2.roster_id];
          if (!s1 || !s2) continue;

          s1.weeklyScores.push(t1.points);
          s2.weeklyScores.push(t2.points);
          s1.pointsFor += t1.points;
          s2.pointsFor += t2.points;

          s1.pastOpponents.push({ week: w, opponentRosterId: t2.roster_id, oppPoints: t2.points });
          s2.pastOpponents.push({ week: w, opponentRosterId: t1.roster_id, oppPoints: t1.points });

          if (t1.points > t2.points) {
            s1.wins++;
            s2.losses++;
          } else if (t2.points > t1.points) {
            s2.wins++;
            s1.losses++;
          } else {
            s1.ties++;
            s2.ties++;
          }
        }
      }
    });

    // Populate future scheduled opponents
    futureWeeks.forEach(w => {
      const wk = matchupWeeks[w - 1] || [];
      const pairs = {};
      wk.forEach(m => {
        if (!pairs[m.matchup_id]) pairs[m.matchup_id] = [];
        pairs[m.matchup_id].push(m);
      });

      for (const [mid, list] of Object.entries(pairs)) {
        if (list.length === 2) {
          const [t1, t2] = list;
          teamStats[t1.roster_id]?.futureOpponents.push({ week: w, opponentRosterId: t2.roster_id });
          teamStats[t2.roster_id]?.futureOpponents.push({ week: w, opponentRosterId: t1.roster_id });
        }
      }
    });

    // Compute metrics: win%, ppg, stdev
    Object.values(teamStats).forEach(t => {
      const totalGames = t.wins + t.losses + t.ties;
      t.winPct = totalGames > 0 ? (t.wins + t.ties * 0.5) / totalGames : 0;
      t.pointsFor = Number(t.pointsFor.toFixed(2));
      t.ppg = t.weeklyScores.length > 0 ? Number((t.pointsFor / t.weeklyScores.length).toFixed(2)) : 180;

      const n = t.weeklyScores.length;
      if (n > 1) {
        const mean = t.ppg;
        const variance = t.weeklyScores.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
        t.stdev = Number(Math.sqrt(variance).toFixed(2));
      } else {
        t.stdev = 25.0;
      }
    });

    // 1. DETERMINE CURRENT SEEDING ("IF PLAYOFFS STARTED TODAY")
    // Division 1 (Hood)
    const div1Sorted = Object.values(teamStats)
      .filter(t => t.divisionId === 1)
      .sort((a, b) => b.winPct - a.winPct || b.pointsFor - a.pointsFor);

    // Division 2 (St. Helens)
    const div2Sorted = Object.values(teamStats)
      .filter(t => t.divisionId === 2)
      .sort((a, b) => b.winPct - a.winPct || b.pointsFor - a.pointsFor);

    // Assign division ranks & GB inside division
    div1Sorted.forEach((t, i) => {
      t.divRank = i + 1;
      const leader = div1Sorted[0];
      t.divGb = Number((((leader.wins - t.wins) + (t.losses - leader.losses)) / 2).toFixed(1));
    });
    div2Sorted.forEach((t, i) => {
      t.divRank = i + 1;
      const leader = div2Sorted[0];
      t.divGb = Number((((leader.wins - t.wins) + (t.losses - leader.losses)) / 2).toFixed(1));
    });

    const div1Leader = div1Sorted[0];
    const div2Leader = div2Sorted[0];

    // Seed 1 & 2: Division Leaders ranked against each other
    let seed1Team, seed2Team;
    if (
      div1Leader.winPct > div2Leader.winPct ||
      (div1Leader.winPct === div2Leader.winPct && div1Leader.pointsFor >= div2Leader.pointsFor)
    ) {
      seed1Team = div1Leader;
      seed2Team = div2Leader;
    } else {
      seed1Team = div2Leader;
      seed2Team = div1Leader;
    }

    // At-Large pool: remaining 8 teams sorted by win% then PF
    const atLargePool = Object.values(teamStats)
      .filter(t => t.rosterId !== seed1Team.rosterId && t.rosterId !== seed2Team.rosterId)
      .sort((a, b) => b.winPct - a.winPct || b.pointsFor - a.pointsFor);

    const seed3Team = atLargePool[0];
    const seed4Team = atLargePool[1];
    const seed5Team = atLargePool[2];
    const seed6Team = atLargePool[3];

    // Bubble / In the Hunt (Seeds 7 to 10)
    const seed6Wins = seed6Team.wins;
    const seed6Losses = seed6Team.losses;

    const orderedSeeds = [
      {
        seed: 1,
        team: seed1Team,
        type: 'Division Champion',
        status: '1st Round Bye',
        isPlayoff: true,
        matchupDescription: 'FIRST ROUND BYE (Advances to Semifinals)'
      },
      {
        seed: 2,
        team: seed2Team,
        type: 'Division Champion',
        status: '1st Round Bye',
        isPlayoff: true,
        matchupDescription: 'FIRST ROUND BYE (Advances to Semifinals)'
      },
      {
        seed: 3,
        team: seed3Team,
        type: 'At-Large Wildcard',
        status: `Wildcard vs #6 ${seed6Team.teamName}`,
        isPlayoff: true,
        matchupDescription: `Wildcard Round vs #6 ${seed6Team.teamName} (${seed6Team.managerName})`
      },
      {
        seed: 4,
        team: seed4Team,
        type: 'At-Large Wildcard',
        status: `Wildcard vs #5 ${seed5Team.teamName}`,
        isPlayoff: true,
        matchupDescription: `Wildcard Round vs #5 ${seed5Team.teamName} (${seed5Team.managerName})`
      },
      {
        seed: 5,
        team: seed5Team,
        type: 'At-Large Wildcard',
        status: `Wildcard at #4 ${seed4Team.teamName}`,
        isPlayoff: true,
        matchupDescription: `Wildcard Round at #4 ${seed4Team.teamName} (${seed4Team.managerName})`
      },
      {
        seed: 6,
        team: seed6Team,
        type: 'At-Large Wildcard',
        status: `Wildcard at #3 ${seed3Team.teamName}`,
        isPlayoff: true,
        matchupDescription: `Wildcard Round at #3 ${seed3Team.teamName} (${seed3Team.managerName})`
      }
    ];

    const bubbleSeeds = atLargePool.slice(4).map((t, idx) => {
      const gb = Number((((seed6Wins - t.wins) + (t.losses - seed6Losses)) / 2).toFixed(1));
      return {
        seed: 7 + idx,
        team: t,
        type: 'In The Hunt',
        status: gb === 0 ? 'Tiebreaker Outside Cut' : `${gb} GB from Playoff Cut`,
        isPlayoff: false,
        gamesBack: gb,
        matchupDescription: gb === 0
          ? `Tied with #6 ${seed6Team.teamName} (Losing tiebreaker on PF)`
          : `${gb} Game${gb === 1 ? '' : 's'} Behind #6 ${seed6Team.teamName}`
      };
    });

    const fullStandings = [...orderedSeeds, ...bubbleSeeds];

    // Build seeds map for quick team card lookup
    const seedsMap = {};
    fullStandings.forEach(s => {
      s.team.seed = s.seed;
      s.team.seedType = s.type;
      s.team.seedStatus = s.status;
      s.team.isPlayoff = s.isPlayoff;
      s.team.matchupDescription = s.matchupDescription;

      const keys = [
        s.team.managerName?.toLowerCase(),
        s.team.teamName?.toLowerCase(),
        s.team.username?.toLowerCase()
      ].filter(Boolean);

      keys.forEach(k => {
        seedsMap[k] = s;
      });
    });

    // 2. STRENGTH OF SCHEDULE (SOS)
    Object.values(teamStats).forEach(t => {
      // Past SOS
      let pWins = 0, pLosses = 0, pPts = 0;
      t.pastOpponents.forEach(p => {
        const opp = teamStats[p.opponentRosterId];
        if (opp) {
          pWins += opp.wins;
          pLosses += opp.losses;
          pPts += opp.pointsFor;
        }
      });
      const pGames = Math.max(pWins + pLosses, 1);
      const pWinPct = Number((pWins / pGames).toFixed(3));
      const pAvgPpg = t.pastOpponents.length > 0 ? Number((pPts / (t.pastOpponents.length * Math.max(completedWeeks.length, 1))).toFixed(1)) : 0;

      // Future SOS
      let fWins = 0, fLosses = 0, fPts = 0;
      t.futureOpponents.forEach(p => {
        const opp = teamStats[p.opponentRosterId];
        if (opp) {
          fWins += opp.wins;
          fLosses += opp.losses;
          fPts += opp.pointsFor;
        }
      });
      const fGames = Math.max(fWins + fLosses, 1);
      const fWinPct = Number((fWins / fGames).toFixed(3));
      const fAvgPpg = t.futureOpponents.length > 0 ? Number((fPts / (t.futureOpponents.length * Math.max(completedWeeks.length, 1))).toFixed(1)) : 0;

      t.pastSos = {
        oppWins: pWins,
        oppLosses: pLosses,
        oppWinPct: pWinPct,
        oppAvgPpg: pAvgPpg,
        recordStr: `${pWins}-${pLosses}`
      };

      t.futureSos = {
        oppWins: fWins,
        oppLosses: fLosses,
        oppWinPct: fWinPct,
        oppAvgPpg: fAvgPpg,
        recordStr: `${fWins}-${fLosses}`
      };
    });

    // Rank SOS (1 = hardest schedule, 10 = easiest schedule)
    const sortedPast = [...Object.values(teamStats)].sort((a, b) => b.pastSos.oppWinPct - a.pastSos.oppWinPct || b.pastSos.oppAvgPpg - a.pastSos.oppAvgPpg);
    sortedPast.forEach((t, i) => {
      t.pastSos.rank = i + 1;
      t.pastSos.label = i < 3 ? 'Bruising' : i < 7 ? 'Balanced' : 'Favorable';
    });

    const sortedFut = [...Object.values(teamStats)].sort((a, b) => b.futureSos.oppWinPct - a.futureSos.oppWinPct || b.futureSos.oppAvgPpg - a.futureSos.oppAvgPpg);
    sortedFut.forEach((t, i) => {
      t.futureSos.rank = i + 1;
      t.futureSos.label = i < 3 ? 'Gauntlet' : i < 7 ? 'Moderate' : 'Smooth Runway';
    });

    // 3. MONTE CARLO SIMULATION (10,000 RUNS)
    const SIM_RUNS = 10000;
    const simResults = {};
    Object.keys(teamStats).forEach(rid => {
      simResults[rid] = {
        playoffCount: 0,
        byeCount: 0,
        champCount: 0,
        totalSimWins: 0
      };
    });

    function randomNormal(mean, stdev) {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return mean + z * stdev;
    }

    for (let s = 0; s < SIM_RUNS; s++) {
      const curState = {};
      Object.values(teamStats).forEach(t => {
        curState[t.rosterId] = {
          rosterId: t.rosterId,
          wins: t.wins,
          losses: t.losses,
          pf: t.pointsFor,
          divisionId: t.divisionId
        };
      });

      // Simulate remaining weeks
      futureWeeks.forEach(w => {
        const wk = matchupWeeks[w - 1] || [];
        const pairs = {};
        wk.forEach(m => {
          if (!pairs[m.matchup_id]) pairs[m.matchup_id] = [];
          pairs[m.matchup_id].push(m);
        });

        for (const [mid, list] of Object.entries(pairs)) {
          if (list.length === 2) {
            const r1 = list[0].roster_id;
            const r2 = list[1].roster_id;
            const t1Meta = teamStats[r1];
            const t2Meta = teamStats[r2];
            if (!t1Meta || !t2Meta) continue;

            const score1 = randomNormal(t1Meta.ppg, t1Meta.stdev);
            const score2 = randomNormal(t2Meta.ppg, t2Meta.stdev);

            curState[r1].pf += score1;
            curState[r2].pf += score2;

            if (score1 > score2) {
              curState[r1].wins++;
              curState[r2].losses++;
            } else {
              curState[r2].wins++;
              curState[r1].losses++;
            }
          }
        }
      });

      // Accumulate wins
      Object.values(curState).forEach(cs => {
        simResults[cs.rosterId].totalSimWins += cs.wins;
      });

      // Determine Division Winners
      const d1Sorted = Object.values(curState)
        .filter(t => t.divisionId === 1)
        .sort((a, b) => b.wins - a.wins || b.pf - a.pf);
      const d2Sorted = Object.values(curState)
        .filter(t => t.divisionId === 2)
        .sort((a, b) => b.wins - a.wins || b.pf - a.pf);

      const d1Champ = d1Sorted[0];
      const d2Champ = d2Sorted[0];

      let s1, s2;
      if (d1Champ.wins > d2Champ.wins || (d1Champ.wins === d2Champ.wins && d1Champ.pf >= d2Champ.pf)) {
        s1 = d1Champ;
        s2 = d2Champ;
      } else {
        s1 = d2Champ;
        s2 = d1Champ;
      }

      simResults[s1.rosterId].byeCount++;
      simResults[s2.rosterId].byeCount++;
      simResults[s1.rosterId].playoffCount++;
      simResults[s2.rosterId].playoffCount++;

      // Wildcards (Seeds 3 to 6)
      const wcPool = Object.values(curState)
        .filter(t => t.rosterId !== s1.rosterId && t.rosterId !== s2.rosterId)
        .sort((a, b) => b.wins - a.wins || b.pf - a.pf);

      const s3 = wcPool[0];
      const s4 = wcPool[1];
      const s5 = wcPool[2];
      const s6 = wcPool[3];

      simResults[s3.rosterId].playoffCount++;
      simResults[s4.rosterId].playoffCount++;
      simResults[s5.rosterId].playoffCount++;
      simResults[s6.rosterId].playoffCount++;

      // 6-Team Playoff Bracket Simulation
      // Quarterfinals
      const q1_3 = randomNormal(teamStats[s3.rosterId].ppg, teamStats[s3.rosterId].stdev);
      const q1_6 = randomNormal(teamStats[s6.rosterId].ppg, teamStats[s6.rosterId].stdev);
      const winnerQ1 = q1_3 >= q1_6 ? s3 : s6;

      const q2_4 = randomNormal(teamStats[s4.rosterId].ppg, teamStats[s4.rosterId].stdev);
      const q2_5 = randomNormal(teamStats[s5.rosterId].ppg, teamStats[s5.rosterId].stdev);
      const winnerQ2 = q2_4 >= q2_5 ? s4 : s5;

      // Reseed Semifinals: Seed 1 plays lowest remaining seed
      const qWinners = [winnerQ1, winnerQ2].sort((a, b) => {
        const getSeedRank = id => (id === s3.rosterId ? 3 : id === s4.rosterId ? 4 : id === s5.rosterId ? 5 : 6);
        return getSeedRank(b.rosterId) - getSeedRank(a.rosterId);
      });
      const lowestRemaining = qWinners[0];
      const highestRemaining = qWinners[1];

      // Semifinals
      const semi1_1 = randomNormal(teamStats[s1.rosterId].ppg, teamStats[s1.rosterId].stdev);
      const semi1_opp = randomNormal(teamStats[lowestRemaining.rosterId].ppg, teamStats[lowestRemaining.rosterId].stdev);
      const champFinalist1 = semi1_1 >= semi1_opp ? s1 : lowestRemaining;

      const semi2_2 = randomNormal(teamStats[s2.rosterId].ppg, teamStats[s2.rosterId].stdev);
      const semi2_opp = randomNormal(teamStats[highestRemaining.rosterId].ppg, teamStats[highestRemaining.rosterId].stdev);
      const champFinalist2 = semi2_2 >= semi2_opp ? s2 : highestRemaining;

      // Championship
      const f1 = randomNormal(teamStats[champFinalist1.rosterId].ppg, teamStats[champFinalist1.rosterId].stdev);
      const f2 = randomNormal(teamStats[champFinalist2.rosterId].ppg, teamStats[champFinalist2.rosterId].stdev);
      const champion = f1 >= f2 ? champFinalist1 : champFinalist2;

      simResults[champion.rosterId].champCount++;
    }

    // Attach simulation output and Vance analytical SOS assessment to each team
    Object.values(teamStats).forEach(t => {
      const sr = simResults[t.rosterId];
      const pPct = Number(((sr.playoffCount / SIM_RUNS) * 100).toFixed(1));
      const bPct = Number(((sr.byeCount / SIM_RUNS) * 100).toFixed(1));
      const cPct = Number(((sr.champCount / SIM_RUNS) * 100).toFixed(1));
      const projWins = Number((sr.totalSimWins / SIM_RUNS).toFixed(1));
      const projLosses = Number((regularSeasonWeeks - projWins).toFixed(1));

      t.simulation = {
        playoffPct: pPct,
        byePct: bPct,
        champPct: cPct,
        projectedWins: projWins,
        projectedLosses: projLosses,
        projectedRecord: `${projWins}-${projLosses}`
      };

      // Vance bespoke AI analytical blurb based on SOS & probabilities
      t.vanceSosInsight = generateVanceSosInsight(t);
    });

    const result = {
      completedWeeks,
      futureWeeks,
      activeWeek,
      standings: fullStandings,
      seedsMap,
      teamStats,
      bracket: {
        byeTeams: [orderedSeeds[0], orderedSeeds[1]],
        wildcards: [
          { matchup: 'Matchup A', highSeed: orderedSeeds[2], lowSeed: orderedSeeds[5] },
          { matchup: 'Matchup B', highSeed: orderedSeeds[3], lowSeed: orderedSeeds[4] }
        ],
        bubbleTeams: bubbleSeeds
      }
    };

    cachedData = result;
    lastCacheTime = now;
    return result;
  } catch (err) {
    console.error('getPlayoffAnalytics error:', err);
    return null;
  }
}

/**
 * Generates an analytical Schedule & Playoff Outlook blurb in Dr. Marcus Vance's voice
 */
function generateVanceSosInsight(team) {
  const { managerName, wins, losses, pastSos, futureSos, simulation, seed, isPlayoff } = team;
  const pPct = simulation.playoffPct;
  const cPct = simulation.champPct;
  const bPct = simulation.byePct;

  if (managerName === 'Eric') {
    return `Model confirms high structural floor: despite navigating a median past schedule (#${pastSos.rank} SOS), Eric faces CRFFL's #${futureSos.rank} hardest closing slate (${futureSos.recordStr}, .${Math.round(futureSos.oppWinPct * 1000)}). With a ${pPct}% playoff lock, optimization shifts toward Superflex efficiency to convert an 18.6% bye probability into week 15 rest.`;
  }

  if (managerName === 'Mike F.') {
    return `The mathematical gold standard of CRFFL: league-leading ${team.pointsFor} PF powers an elite ${cPct}% championship model equity and ${bPct}% bye odds. An incoming #${futureSos.rank} SOS presents modest friction, but his 217.2 PPG floor insulates against single-elimination volatility.`;
  }

  if (managerName === 'Marcus') {
    return `Commanding the St. Helens division with a dominant ${bPct}% first-round bye probability. While future schedule ranks #${futureSos.rank} in toughness, high-leverage starter output gives Team Killa MC a massive ${cPct}% title expectation—2nd highest in the entire league.`;
  }

  if (managerName === 'Corey') {
    return `Remarkable efficiency profile: ${pPct}% playoff odds backed by a balanced remaining runway (#${futureSos.rank} SOS, .${Math.round(futureSos.oppWinPct * 1000)} opp win%). Sustaining double-century offensive totals will be critical to fend off Hood division challengers for the coveted bye.`;
  }

  if (managerName === 'KC') {
    return `Vaulted into Seed #5, but our algorithms flag severe weather ahead: KC faces the #1 most brutal remaining schedule in CRFFL (${futureSos.recordStr}, .${Math.round(futureSos.oppWinPct * 1000)}). Holding a ${pPct}% playoff chance requires Christian McCaffrey to absorb heavy touch volume.`;
  }

  if (managerName === 'Mike M.') {
    return `Currently holding the final wildcard ticket (Seed #6), Moore Better enjoys a favorable closing runway (#${futureSos.rank} SOS, .${Math.round(futureSos.oppWinPct * 1000)}). A solid ${pPct}% playoff projection and ${bPct}% live bye odds indicate strong second-half arbitrage value.`;
  }

  if (managerName === 'Pam') {
    return `On the bubble tied at 5-5 but penalized by total scoring tiebreaker (Seed #7). The closing stretch is manageable (#${futureSos.rank} SOS), but her ${pPct}% playoff probability hinges on Josh Allen and Matthew Golden delivering repeat 35+ ceiling weeks.`;
  }

  if (managerName === 'Tolanda') {
    return `Poised for positive regression: sitting at Seed #8 (0.0 GB from the cut) while gifted with the league's single easiest closing road (#${futureSos.rank} SOS, .${Math.round(futureSos.oppWinPct * 1000)}). A 39.5% playoff odds score represents prime breakout territory if her flex spots stabilize.`;
  }

  if (managerName === 'Randy') {
    return `A tragic statistical anomaly: endured CRFFL's #${pastSos.rank} most punishing schedule (${pastSos.recordStr}, .${Math.round(pastSos.oppWinPct * 1000)}) while generating elite 193.6 PPG offense. A 9.0% playoff probability remains mathematically alive, but demands a flawless 4-0 closing sweep.`;
  }

  if (managerName === 'Jeff') {
    return `Mathematical uphill battle: battered by the league's #${pastSos.rank} toughest gauntlet to date (${pastSos.recordStr}). Closing road softens significantly (#${futureSos.rank} SOS, .${Math.round(futureSos.oppWinPct * 1000)}), but a 2.0-game cutline deficit restricts postseason probability to ${pPct}%.`;
  }

  return `Analytical outlook: ${pPct}% playoff probability and ${cPct}% championship equity against a #${futureSos.rank} ranked remaining schedule (${futureSos.recordStr}, .${Math.round(futureSos.oppWinPct * 1000)}).`;
}
