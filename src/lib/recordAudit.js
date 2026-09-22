import { supabase } from './supabase.js';
import recordsFallback from '../data/recordsFallback.json' with { type: 'json' };

export const RECORD_TITLES = {
  HIGHEST_STARTER: 'Highest Scoring Starter',
  HIGHEST_QB: 'Highest Scoring QB',
  HIGHEST_RB: 'Highest Scoring RB',
  HIGHEST_WR: 'Highest Scoring WR',
  HIGHEST_TE: 'Highest Scoring TE',
  HIGHEST_DEF: 'Highest Scoring DEF',
  HIGHEST_BENCH: 'Highest Scoring Bench Player (non DEF)',
  HIGHEST_TEAM_SCORE: 'Highest Team Score',
  LOWEST_TEAM_SCORE: 'Lowest Team Score',
  HIGHEST_SCORE_IN_LOSS: 'Highest Team Score in a Loss',
  LOWEST_SCORE_IN_WIN: 'Lowest Team Score in a Win',
  BIGGEST_BLOWOUT: 'Biggest Blowout',
  NARROWEST_VICTORY: 'Narrowest Victory',
  LONGEST_WIN_STREAK: 'Longest Win Streak',
  LONGEST_LOSE_STREAK: 'Longest Losing Streak',
};

function parseNumeric(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const match = String(val).match(/^([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

function cleanManagerName(name) {
  if (!name) return 'Unknown';
  const n = name.trim();
  if (n.toLowerCase() === 'mikef5630' || n.toLowerCase().includes('mike f')) return 'Mike F.';
  if (n.toLowerCase() === 'iammichael2u' || n.toLowerCase().includes('mike m')) return 'Mike M.';
  return n;
}

/**
 * Audits a single week's matchups against the all-time Hall of Fame record book.
 * Returns broken records, near misses, and an editorial report formatted for Marty Sullivan.
 */
export async function auditWeeklyRecordsAgainstHallOfFame({
  weekNumber,
  rawMatchups = [],
  playerMap = {},
  rosters = {},
  season = 2026,
} = {}) {
  // 1. Fetch current Hall of Fame records from Supabase (or fallback)
  let currentRecordsDb = null;
  try {
    const { data } = await supabase.from('hof_records').select('*');
    if (data && data.length > 0) currentRecordsDb = data;
  } catch (err) {
    console.warn('Could not fetch hof_records from Supabase, using fallback:', err.message);
  }

  const recordsMap = {};
  const baseList = (currentRecordsDb && currentRecordsDb.length > 0) ? currentRecordsDb : recordsFallback;
  for (const r of baseList) {
    recordsMap[r.title] = { ...r };
  }

  const brokenRecords = [];
  const nearMisses = [];

  const checkRecord = ({
    title,
    currentValue,
    candidateValue,
    candidateHolder,
    candidateDetail,
    isLowerBetter = false,
    nearMissThreshold = 0.88,
  }) => {
    const oldNum = parseNumeric(currentValue);
    const newNum = Number(candidateValue);
    if (isNaN(newNum) || newNum <= 0) return;

    const existingRecord = recordsMap[title] || {};

    if (isLowerBetter) {
      if (newNum < oldNum) {
        brokenRecords.push({
          title,
          oldValue: String(currentValue),
          newValue: String(newNum),
          previousHolder: existingRecord.holder_manager || 'Unknown',
          previousDetail: existingRecord.detail || '',
          previousSeasonWeek: existingRecord.season_week || '',
          newHolder: candidateHolder,
          newDetail: candidateDetail,
          seasonWeek: `${season} Week ${weekNumber}`,
          diff: (oldNum - newNum).toFixed(2),
        });
      }
    } else {
      if (newNum > oldNum) {
        brokenRecords.push({
          title,
          oldValue: String(currentValue),
          newValue: String(newNum),
          previousHolder: existingRecord.holder_manager || 'Unknown',
          previousDetail: existingRecord.detail || '',
          previousSeasonWeek: existingRecord.season_week || '',
          newHolder: candidateHolder,
          newDetail: candidateDetail,
          seasonWeek: `${season} Week ${weekNumber}`,
          diff: (newNum - oldNum).toFixed(2),
        });
      } else if (newNum >= oldNum * nearMissThreshold) {
        nearMisses.push({
          title,
          recordValue: String(currentValue),
          attemptValue: String(newNum),
          holder: candidateHolder,
          detail: candidateDetail,
          percentOfRecord: Math.round((newNum / oldNum) * 100),
        });
      }
    }
  };

  // Group matchups by matchup_id
  const matchupGroups = {};
  for (const m of rawMatchups) {
    if (m.matchup_id === null || m.matchup_id === undefined) continue;
    if (!matchupGroups[m.matchup_id]) matchupGroups[m.matchup_id] = [];
    matchupGroups[m.matchup_id].push(m);
  }

  // Helper to resolve player name & pos
  const getPlayerInfo = (pid) => {
    if (!pid) return { name: 'Unknown', pos: 'UNKNOWN' };
    const p = playerMap[pid];
    if (p) {
      return {
        name: p.name || pid,
        pos: p.pos || (['DEF', 'DST'].includes(pid) || pid.length <= 3 ? 'DEF' : 'UNKNOWN'),
      };
    }
    if (pid.length <= 3 || pid.toUpperCase() === pid) {
      return { name: `${pid} Defense`, pos: 'DEF' };
    }
    return { name: `Player #${pid}`, pos: 'UNKNOWN' };
  };

  // Audit each head-to-head matchup
  for (const pair of Object.values(matchupGroups)) {
    if (pair.length !== 2) continue;
    const [t1, t2] = pair;

    const r1 = rosters[t1.roster_id] || { managerName: `Manager ${t1.roster_id}`, teamName: `Team ${t1.roster_id}` };
    const r2 = rosters[t2.roster_id] || { managerName: `Manager ${t2.roster_id}`, teamName: `Team ${t2.roster_id}` };

    const mgr1 = cleanManagerName(r1.managerName);
    const mgr2 = cleanManagerName(r2.managerName);
    const team1 = r1.teamName || mgr1;
    const team2 = r2.teamName || mgr2;

    const s1 = Number(t1.points || 0);
    const s2 = Number(t2.points || 0);
    if (s1 === 0 && s2 === 0) continue; // Unplayed

    const diff = Math.abs(Number((s1 - s2).toFixed(2)));
    const winnerMgr = s1 > s2 ? mgr1 : (s2 > s1 ? mgr2 : 'Tie');
    const winnerTeam = s1 > s2 ? team1 : team2;
    const loserMgr = s1 > s2 ? mgr2 : mgr1;
    const loserTeam = s1 > s2 ? team2 : team1;
    const winScore = Math.max(s1, s2);
    const loseScore = Math.min(s1, s2);

    // 1. Highest Team Score
    checkRecord({
      title: RECORD_TITLES.HIGHEST_TEAM_SCORE,
      currentValue: recordsMap[RECORD_TITLES.HIGHEST_TEAM_SCORE]?.record_value,
      candidateValue: s1,
      candidateHolder: mgr1,
      candidateDetail: team1,
    });
    checkRecord({
      title: RECORD_TITLES.HIGHEST_TEAM_SCORE,
      currentValue: recordsMap[RECORD_TITLES.HIGHEST_TEAM_SCORE]?.record_value,
      candidateValue: s2,
      candidateHolder: mgr2,
      candidateDetail: team2,
    });

    // 2. Lowest Team Score
    if (s1 > 0) {
      checkRecord({
        title: RECORD_TITLES.LOWEST_TEAM_SCORE,
        currentValue: recordsMap[RECORD_TITLES.LOWEST_TEAM_SCORE]?.record_value,
        candidateValue: s1,
        candidateHolder: mgr1,
        candidateDetail: team1,
        isLowerBetter: true,
      });
    }
    if (s2 > 0) {
      checkRecord({
        title: RECORD_TITLES.LOWEST_TEAM_SCORE,
        currentValue: recordsMap[RECORD_TITLES.LOWEST_TEAM_SCORE]?.record_value,
        candidateValue: s2,
        candidateHolder: mgr2,
        candidateDetail: team2,
        isLowerBetter: true,
      });
    }

    // 3. Highest Team Score in a Loss
    if (s1 !== s2) {
      checkRecord({
        title: RECORD_TITLES.HIGHEST_SCORE_IN_LOSS,
        currentValue: recordsMap[RECORD_TITLES.HIGHEST_SCORE_IN_LOSS]?.record_value,
        candidateValue: loseScore,
        candidateHolder: loserMgr,
        candidateDetail: loserTeam,
      });

      // 4. Lowest Team Score in a Win
      if (winScore > 0) {
        checkRecord({
          title: RECORD_TITLES.LOWEST_SCORE_IN_WIN,
          currentValue: recordsMap[RECORD_TITLES.LOWEST_SCORE_IN_WIN]?.record_value,
          candidateValue: winScore,
          candidateHolder: winnerMgr,
          candidateDetail: winnerTeam,
          isLowerBetter: true,
        });
      }

      // 5. Biggest Blowout
      checkRecord({
        title: RECORD_TITLES.BIGGEST_BLOWOUT,
        currentValue: recordsMap[RECORD_TITLES.BIGGEST_BLOWOUT]?.record_value,
        candidateValue: diff,
        candidateHolder: winnerMgr,
        candidateDetail: `${winnerTeam} def. ${loserTeam} by ${diff} pts`,
      });

      // 6. Narrowest Victory
      if (diff > 0) {
        checkRecord({
          title: RECORD_TITLES.NARROWEST_VICTORY,
          currentValue: recordsMap[RECORD_TITLES.NARROWEST_VICTORY]?.record_value,
          candidateValue: diff,
          candidateHolder: winnerMgr,
          candidateDetail: `${winnerTeam} def. ${loserTeam} by ${diff} pts`,
          isLowerBetter: true,
        });
      }
    }

    // Individual Starters Audit
    const auditStarters = (teamData, mgr) => {
      const starters = teamData.starters || [];
      const starterPts = teamData.starters_points || [];
      for (let i = 0; i < starters.length; i++) {
        const pid = starters[i];
        const pts = Number(starterPts[i] || 0);
        if (pts <= 0) continue;
        const pInfo = getPlayerInfo(pid);

        // Highest Starter
        checkRecord({
          title: RECORD_TITLES.HIGHEST_STARTER,
          currentValue: recordsMap[RECORD_TITLES.HIGHEST_STARTER]?.record_value,
          candidateValue: pts,
          candidateHolder: mgr,
          candidateDetail: `${pInfo.name} (${pInfo.pos})`,
          nearMissThreshold: 0.85,
        });

        // Position Specific
        if (pInfo.pos === 'QB') {
          checkRecord({
            title: RECORD_TITLES.HIGHEST_QB,
            currentValue: recordsMap[RECORD_TITLES.HIGHEST_QB]?.record_value,
            candidateValue: pts,
            candidateHolder: mgr,
            candidateDetail: pInfo.name,
            nearMissThreshold: 0.82,
          });
        } else if (pInfo.pos === 'RB') {
          checkRecord({
            title: RECORD_TITLES.HIGHEST_RB,
            currentValue: recordsMap[RECORD_TITLES.HIGHEST_RB]?.record_value,
            candidateValue: pts,
            candidateHolder: mgr,
            candidateDetail: pInfo.name,
            nearMissThreshold: 0.82,
          });
        } else if (pInfo.pos === 'WR') {
          checkRecord({
            title: RECORD_TITLES.HIGHEST_WR,
            currentValue: recordsMap[RECORD_TITLES.HIGHEST_WR]?.record_value,
            candidateValue: pts,
            candidateHolder: mgr,
            candidateDetail: pInfo.name,
            nearMissThreshold: 0.82,
          });
        } else if (pInfo.pos === 'TE') {
          checkRecord({
            title: RECORD_TITLES.HIGHEST_TE,
            currentValue: recordsMap[RECORD_TITLES.HIGHEST_TE]?.record_value,
            candidateValue: pts,
            candidateHolder: mgr,
            candidateDetail: pInfo.name,
            nearMissThreshold: 0.82,
          });
        } else if (pInfo.pos === 'DEF' || pInfo.pos === 'DST') {
          checkRecord({
            title: RECORD_TITLES.HIGHEST_DEF,
            currentValue: recordsMap[RECORD_TITLES.HIGHEST_DEF]?.record_value,
            candidateValue: pts,
            candidateHolder: mgr,
            candidateDetail: pInfo.name,
            nearMissThreshold: 0.80,
          });
        }
      }
    };

    // Bench Audit (non-DEF)
    const auditBench = (teamData, mgr) => {
      const startersSet = new Set(teamData.starters || []);
      const allPlayers = teamData.players || [];
      const playersPoints = teamData.players_points || {};

      for (const pid of allPlayers) {
        if (startersSet.has(pid)) continue;
        const pts = Number(playersPoints[pid] || 0);
        if (pts <= 0) continue;
        const pInfo = getPlayerInfo(pid);
        if (pInfo.pos === 'DEF' || pInfo.pos === 'DST') continue;

        checkRecord({
          title: RECORD_TITLES.HIGHEST_BENCH,
          currentValue: recordsMap[RECORD_TITLES.HIGHEST_BENCH]?.record_value,
          candidateValue: pts,
          candidateHolder: mgr,
          candidateDetail: `${pInfo.name} (${pInfo.pos})`,
          nearMissThreshold: 0.80,
        });
      }
    };

    auditStarters(t1, mgr1);
    auditStarters(t2, mgr2);
    auditBench(t1, mgr1);
    auditBench(t2, mgr2);
  }

  // Format Editorial Report for Marty Sullivan
  let formattedReport = '';
  if (brokenRecords.length > 0) {
    formattedReport = `🚨 ALL-TIME CRFFL RECORDS BROKEN IN WEEK ${weekNumber} (MANDATORY SPOTLIGHT):\n`;
    brokenRecords.forEach((b, idx) => {
      formattedReport += `${idx + 1}. **NEW RECORD: ${b.title}**\n`;
      formattedReport += `   - New Record Holder: ${b.newHolder} with ${b.newDetail} (${b.newValue} pts/margin)\n`;
      formattedReport += `   - Previous Record: ${b.previousHolder} (${b.previousDetail}) with ${b.oldValue} [Set in ${b.previousSeasonWeek}]\n`;
      formattedReport += `   - Historic Difference: Outperformed previous mark by ${b.diff} points/margin!\n`;
    });
  } else {
    formattedReport = `📜 ALL-TIME RECORD BOOK AUDIT (WEEK ${weekNumber}):\n`;
    formattedReport += `No all-time CRFFL records were broken in Week ${weekNumber}. The Hall of Fame record book held firm against this week's battles.\n`;
    if (nearMisses.length > 0) {
      formattedReport += `Notable Near-Misses / Top Historical Outputs:\n`;
      nearMisses.slice(0, 3).forEach((nm) => {
        formattedReport += `   - ${nm.holder} (${nm.detail}): ${nm.attemptValue} pts on "${nm.title}" (reached ${nm.percentOfRecord}% of all-time record of ${nm.recordValue} pts)\n`;
      });
    }
  }

  return {
    hasBrokenRecords: brokenRecords.length > 0,
    brokenRecordsCount: brokenRecords.length,
    brokenRecords,
    nearMisses,
    formattedReport,
  };
}
