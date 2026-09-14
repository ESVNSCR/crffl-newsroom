/**
 * CRFFL Bench Points & Optimal Lineup Audit Engine
 * 
 * Accurately models the Columbia River Fantasy Football League's 11 starting slots:
 * - 1 QB
 * - 2 RB
 * - 2 WR
 * - 2 FLEX (RB, WR, TE)
 * - 1 REC_FLEX (WR, TE only — no RBs allowed)
 * - 1 SUPER_FLEX (QB, RB, WR, TE)
 * - 1 K
 * - 1 DEF
 */

export function calculateOptimalLineup(matchupTeam, playerMap = {}) {
  const allPlayers = (matchupTeam.players || []).map(pid => {
    const pInfo = playerMap[pid] || {};
    const pts = Number(matchupTeam.players_points?.[pid] || 0);
    const isStarter = (matchupTeam.starters || []).includes(pid);
    return {
      id: pid,
      name: pInfo.name || pid,
      pos: (pInfo.pos || 'UNK').toUpperCase(),
      team: pInfo.team || 'FA',
      points: Math.round(pts * 100) / 100,
      isStarter
    };
  }).sort((a, b) => b.points - a.points);

  const qbs = allPlayers.filter(p => p.pos === 'QB');
  const rbs = allPlayers.filter(p => p.pos === 'RB');
  const wrs = allPlayers.filter(p => p.pos === 'WR');
  const tes = allPlayers.filter(p => p.pos === 'TE');
  const ks = allPlayers.filter(p => p.pos === 'K');
  const defs = allPlayers.filter(p => p.pos === 'DEF');

  const optimalLineup = [];
  const used = new Set();

  function pick(player, slot) {
    if (!player) return;
    optimalLineup.push({ slot, player });
    used.add(player.id);
  }

  // 1. Mandatory Single Position Slots
  pick(qbs.find(p => !used.has(p.id)), 'QB');
  pick(rbs.find(p => !used.has(p.id)), 'RB1');
  pick(rbs.find(p => !used.has(p.id)), 'RB2');
  pick(wrs.find(p => !used.has(p.id)), 'WR1');
  pick(wrs.find(p => !used.has(p.id)), 'WR2');
  pick(ks.find(p => !used.has(p.id)), 'K');
  pick(defs.find(p => !used.has(p.id)), 'DEF');

  // 2. Flexible Slots Pool:
  // - REC_FLEX: WR or TE
  // - FLEX (x2): RB, WR, or TE
  // - SUPER_FLEX: QB, RB, WR, or TE
  const remainingFlexCandidates = allPlayers.filter(
    p => !used.has(p.id) && ['QB', 'RB', 'WR', 'TE'].includes(p.pos)
  );

  let bestFlexPts = -1;
  let bestAssignment = null;

  // Search optimal combination of 4 unassigned flex slots from top candidate pool
  const pool = remainingFlexCandidates.slice(0, 12);
  for (let i = 0; i < pool.length; i++) {
    for (let j = 0; j < pool.length; j++) {
      if (j === i) continue;
      for (let k = 0; k < pool.length; k++) {
        if (k === i || k === j) continue;
        for (let l = 0; l < pool.length; l++) {
          if (l === i || l === j || l === k) continue;
          const pRec = pool[i];  // REC_FLEX
          const pF1 = pool[j];   // FLEX1
          const pF2 = pool[k];   // FLEX2
          const pSf = pool[l];   // SUPER_FLEX

          if (!['WR', 'TE'].includes(pRec.pos)) continue;
          if (!['RB', 'WR', 'TE'].includes(pF1.pos)) continue;
          if (!['RB', 'WR', 'TE'].includes(pF2.pos)) continue;
          if (!['QB', 'RB', 'WR', 'TE'].includes(pSf.pos)) continue;

          const total = pRec.points + pF1.points + pF2.points + pSf.points;
          if (total > bestFlexPts) {
            bestFlexPts = total;
            bestAssignment = [
              { slot: 'REC_FLEX', player: pRec },
              { slot: 'FLEX', player: pF1 },
              { slot: 'FLEX', player: pF2 },
              { slot: 'SUPER_FLEX', player: pSf },
            ];
          }
        }
      }
    }
  }

  if (bestAssignment) {
    bestAssignment.forEach(item => {
      optimalLineup.push(item);
      used.add(item.player.id);
    });
  }

  const optimalPoints = Math.round(optimalLineup.reduce((sum, item) => sum + item.player.points, 0) * 100) / 100;
  const actualPoints = Math.round(Number(matchupTeam.points || 0) * 100) / 100;
  const benchPointsLost = Math.max(0, Math.round((optimalPoints - actualPoints) * 100) / 100);

  const optimalStartersSet = new Set(optimalLineup.map(i => i.player.id));
  const benchMistakes = allPlayers
    .filter(p => !p.isStarter && optimalStartersSet.has(p.id))
    .map(p => ({
      id: p.id,
      name: p.name,
      pos: p.pos,
      points: p.points
    }));

  return {
    roster_id: matchupTeam.roster_id,
    actualPoints,
    optimalPoints,
    benchPointsLost,
    benchMistakes,
    optimalLineup
  };
}

/**
 * Computes weekly bench blunder statistics and formats an editorial report for Marty Sullivan.
 */
export function calculateWeeklyBenchAudit(matchups = [], playerMap = {}, rosters = {}) {
  if (!matchups || matchups.length === 0) {
    return {
      formattedReport: 'No matchup data available to audit bench points.',
      fatalBlunders: [],
      matchupAudits: []
    };
  }

  // Group matchups by matchup_id
  const byMatchup = {};
  matchups.forEach(m => {
    if (!byMatchup[m.matchup_id]) byMatchup[m.matchup_id] = [];
    byMatchup[m.matchup_id].push(m);
  });

  const fatalBlunders = [];
  const helplessLosses = [];
  const survivedBlunders = [];
  const matchupAudits = [];

  for (const [mid, pair] of Object.entries(byMatchup)) {
    if (pair.length < 2) continue;

    const teamAOptimal = calculateOptimalLineup(pair[0], playerMap);
    const teamBOptimal = calculateOptimalLineup(pair[1], playerMap);

    const rA = rosters[teamAOptimal.roster_id] || {};
    const rB = rosters[teamBOptimal.roster_id] || {};

    const nameA = rA.managerName || `Manager #${teamAOptimal.roster_id}`;
    const teamNameA = rA.teamName || `Team #${teamAOptimal.roster_id}`;
    const nameB = rB.managerName || `Manager #${teamBOptimal.roster_id}`;
    const teamNameB = rB.teamName || `Team #${teamBOptimal.roster_id}`;

    const ptsA = teamAOptimal.actualPoints;
    const ptsB = teamBOptimal.actualPoints;

    let winner = null;
    let loser = null;

    if (ptsA > ptsB) {
      winner = { ...teamAOptimal, name: nameA, teamName: teamNameA };
      loser = { ...teamBOptimal, name: nameB, teamName: teamNameB, opponentScore: ptsA };
    } else if (ptsB > ptsA) {
      winner = { ...teamBOptimal, name: nameB, teamName: teamNameB };
      loser = { ...teamAOptimal, name: nameA, teamName: teamNameA, opponentScore: ptsB };
    }

    if (winner && loser) {
      const margin = Math.round((winner.actualPoints - loser.actualPoints) * 100) / 100;
      const couldHaveWon = loser.optimalPoints > winner.actualPoints;
      const swingPoints = Math.round((loser.optimalPoints - winner.actualPoints) * 100) / 100;

      const auditEntry = {
        matchupId: mid,
        winner: {
          name: winner.name,
          teamName: winner.teamName,
          score: winner.actualPoints,
          optimalScore: winner.optimalPoints,
          benchPointsLost: winner.benchPointsLost,
          benchMistakes: winner.benchMistakes
        },
        loser: {
          name: loser.name,
          teamName: loser.teamName,
          score: loser.actualPoints,
          optimalScore: loser.optimalPoints,
          benchPointsLost: loser.benchPointsLost,
          benchMistakes: loser.benchMistakes,
          margin,
          couldHaveWon,
          swingPoints
        }
      };

      matchupAudits.push(auditEntry);

      if (couldHaveWon) {
        fatalBlunders.push({
          manager: loser.name,
          team: loser.teamName,
          opponent: winner.name,
          opponentTeam: winner.teamName,
          score: loser.actualPoints,
          opponentScore: winner.actualPoints,
          margin,
          optimalScore: loser.optimalPoints,
          benchPointsLost: loser.benchPointsLost,
          benchMistakes: loser.benchMistakes
        });
      } else if (loser.benchPointsLost > 15) {
        helplessLosses.push({
          manager: loser.name,
          team: loser.teamName,
          opponent: winner.name,
          score: loser.actualPoints,
          opponentScore: winner.actualPoints,
          optimalScore: loser.optimalPoints,
          benchPointsLost: loser.benchPointsLost,
          benchMistakes: loser.benchMistakes
        });
      }

      if (winner.benchPointsLost > 15) {
        survivedBlunders.push({
          manager: winner.name,
          team: winner.teamName,
          benchPointsLost: winner.benchPointsLost,
          benchMistakes: winner.benchMistakes
        });
      }
    }
  }

  // Format textual summary for LLM prompt injection
  const lines = [
    '=== CRFFL LINEUP OPTIMIZATION & BENCH BLUNDER AUDIT (MATHEMATICAL MATRIX) ===',
    `Roster Slots Verified: 1 QB, 2 RB, 2 WR, 2 FLEX (RB/WR/TE), 1 REC_FLEX (WR/TE only), 1 SUPER_FLEX (QB/RB/WR/TE), 1 K, 1 DEF.`,
    ''
  ];

  if (fatalBlunders.length > 0) {
    lines.push('🚨 FATAL BENCH BLUNDERS (MANAGERS WHO LOST BECAUSE OF SITTING THE WRONG PLAYERS):');
    lines.push('These managers legally had the points on their bench to WIN their matchup, but blew it by making poor lineup decisions:');
    fatalBlunders.forEach(fb => {
      const mistakesStr = fb.benchMistakes.map(p => `${p.name} (${p.pos}: ${p.points} pts)`).join(', ');
      lines.push(`• ${fb.manager} (${fb.team}): LOST to ${fb.opponent} by ${fb.margin} points (${fb.score} to ${fb.opponentScore}).`);
      lines.push(`  - Left ${fb.benchPointsLost} PLAYABLE points on bench.`);
      lines.push(`  - Optimal lineup would have scored ${fb.optimalScore} and WON the game!`);
      lines.push(`  - Bench weapons left stranded on the pine: ${mistakesStr}`);
    });
    lines.push('');
  } else {
    lines.push('No managers suffered a direct defeat strictly caused by bench mistakes this week.');
    lines.push('');
  }

  if (helplessLosses.length > 0) {
    lines.push('⚠️ HEAVY BENCH POINTS IN DEFEAT (Didn\'t cost the win, but still left points behind):');
    helplessLosses.forEach(hl => {
      const mistakesStr = hl.benchMistakes.map(p => `${p.name} (${p.pos}: ${p.points} pts)`).join(', ');
      lines.push(`• ${hl.manager} (${hl.team}): Lost to ${hl.opponent} (${hl.score} vs ${hl.opponentScore}). Left ${hl.benchPointsLost} pts on bench (optimal: ${hl.optimalScore}). Stranded: ${mistakesStr}`);
    });
    lines.push('');
  }

  if (survivedBlunders.length > 0) {
    lines.push('🍀 SURVIVED THEIR OWN MISTAKES (Won despite leaving big points on the pine):');
    survivedBlunders.forEach(sb => {
      const mistakesStr = sb.benchMistakes.map(p => `${p.name} (${p.pos}: ${p.points} pts)`).join(', ');
      lines.push(`• ${sb.manager} (${sb.team}): Won their matchup, but still left ${sb.benchPointsLost} pts on the bench (${mistakesStr}).`);
    });
    lines.push('');
  }

  return {
    formattedReport: lines.join('\n'),
    fatalBlunders,
    helplessLosses,
    survivedBlunders,
    matchupAudits
  };
}

