import { supabase } from './supabase.js';
import { getLeagueOverview, getLeagueMatchups, getNflState } from './sleeper.js';

/**
 * Validates whether current time in America/Los_Angeles is Tuesday or later
 */
function isTuesdayOrLaterPacific() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
  });
  const pacificDay = formatter.format(new Date());
  return ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(pacificDay);
}

/**
 * Creates a clean slug for manager IDs matching the HOF convention
 */
function toSlug(name) {
  if (!name) return 'unknown';
  const n = name.toLowerCase().trim();
  if (n.startsWith('eric')) return 'eric';
  if (n.startsWith('corey')) return 'corey';
  if (n.startsWith('ed')) return 'ed';
  if (n.startsWith('jeff')) return 'jeff';
  if (n.startsWith('kc')) return 'kc';
  if (n.startsWith('marcus')) return 'marcus';
  if (n.includes('mike f') || n === 'mikef5630') return 'mike-f';
  if (n.includes('mike m') || n === 'iammichael2u') return 'mike-m';
  if (n.startsWith('pam')) return 'pam';
  if (n.startsWith('randy')) return 'randy';
  return n.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Synchronizes official finalized matchups for a given regular season / playoff week into `hof_matchups`
 *
 * @param {number} weekNumber Week number (1-17)
 * @param {object} options
 * @param {number} options.season Season year (defaults to 2026)
 * @param {boolean} options.force If true, bypasses the Tuesday time gate (for manual commissioner sync)
 * @param {boolean} options.preview If true, returns formatted records without writing to Supabase
 */
export async function syncHofWeekMatchups(weekNumber, { season = 2026, force = false, preview = false } = {}) {
  const week = Number(weekNumber);
  if (!week || week < 1 || week > 17) {
    throw new Error(`Invalid week number for HOF matchup sync: ${weekNumber}`);
  }

  // Gate on Tuesday Pacific Time unless force is enabled
  if (!force && !preview && !isTuesdayOrLaterPacific()) {
    return {
      success: false,
      status: 'pending',
      reason: `Week ${week} matchups cannot sync to Hall of Fame until Tuesday morning Pacific Time when all games are official.`,
    };
  }

  const [overview, rawMatchups] = await Promise.all([
    getLeagueOverview(),
    getLeagueMatchups(week),
  ]);

  if (!rawMatchups || rawMatchups.length === 0) {
    return {
      success: false,
      status: 'no_data',
      reason: `No matchup data returned from Sleeper for Week ${week}.`,
    };
  }

  // Ensure games have actually been played
  const totalLeaguePoints = rawMatchups.reduce((sum, m) => sum + (m.points || 0), 0);
  if (totalLeaguePoints === 0) {
    return {
      success: false,
      status: 'unplayed',
      reason: `Matchups for Week ${week} have not been played yet (0 total points).`,
    };
  }

  // Group matchups by matchup_id
  const groups = {};
  for (const m of rawMatchups) {
    if (m.matchup_id === null || m.matchup_id === undefined) continue;
    if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
    groups[m.matchup_id].push(m);
  }

  const formattedMatchups = [];
  const isPlayoff = week >= 15;

  for (const [mid, pair] of Object.entries(groups)) {
    if (pair.length !== 2) continue;
    const [t1, t2] = pair;

    const meta1 = overview.rosters[t1.roster_id] || {
      managerName: `Manager #${t1.roster_id}`,
      teamName: `Team #${t1.roster_id}`,
    };
    const meta2 = overview.rosters[t2.roster_id] || {
      managerName: `Manager #${t2.roster_id}`,
      teamName: `Team #${t2.roster_id}`,
    };

    const scoreA = Number(t1.points ?? 0);
    const scoreB = Number(t2.points ?? 0);
    const diff = Math.abs(Number((scoreA - scoreB).toFixed(2)));

    let winner = 'Tie';
    if (scoreA > scoreB) winner = meta1.managerName;
    else if (scoreB > scoreA) winner = meta2.managerName;

    const slug1 = toSlug(meta1.managerName);
    const slug2 = toSlug(meta2.managerName);

    const startersSet1 = new Set(t1.starters || []);
    const bench1 = (t1.players || [])
      .filter(id => !startersSet1.has(id))
      .map(id => ({ id, pts: t1.players_points?.[id] ?? 0 }));

    const startersSet2 = new Set(t2.starters || []);
    const bench2 = (t2.players || [])
      .filter(id => !startersSet2.has(id))
      .map(id => ({ id, pts: t2.players_points?.[id] ?? 0 }));

    formattedMatchups.push({
      id: `${season}-w${week}-m${mid}-${slug1}-vs-${slug2}`,
      season: Number(season),
      week: Number(week),
      is_playoff: isPlayoff,
      manager_a: meta1.managerName,
      team_a: meta1.teamName,
      score_a: scoreA,
      manager_b: meta2.managerName,
      team_b: meta2.teamName,
      score_b: scoreB,
      winner_manager: winner,
      point_diff: diff,
      starters_a: (t1.starters || []).map((id, idx) => ({ id, pts: t1.starters_points?.[idx] ?? 0 })),
      starters_b: (t2.starters || []).map((id, idx) => ({ id, pts: t2.starters_points?.[idx] ?? 0 })),
      bench_a: bench1,
      bench_b: bench2,
    });
  }

  if (preview) {
    return {
      success: true,
      status: 'preview',
      season,
      week,
      matchupsCount: formattedMatchups.length,
      matchups: formattedMatchups,
      notice: 'Preview mode only; database was not modified.',
    };
  }

  // Upsert official matchups into Supabase hof_matchups
  const { error } = await supabase
    .from('hof_matchups')
    .upsert(formattedMatchups, { onConflict: 'id' });

  if (error) {
    console.error(`Failed to upsert Week ${week} matchups to hof_matchups:`, error);
    throw new Error(`Database upsert error: ${error.message}`);
  }

  // Automatically trigger the Hall of Fame Record Audit to detect newly broken records
  let recordAudit = null;
  try {
    const hofBase = process.env.HOF_URL || 'https://crffl.org/hof';
    const cronSecret = process.env.CRON_SECRET;
    const auditRes = await fetch(`${hofBase}/api/records/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { 'Authorization': `Bearer ${cronSecret}` } : {}),
      },
      cache: 'no-store'
    });
    if (auditRes.ok) {
      recordAudit = await auditRes.json();
    }
  } catch (auditErr) {
    console.warn('HOF automated record audit trigger notice:', auditErr.message);
  }

  return {
    success: true,
    status: 'synced',
    season,
    week,
    syncedCount: formattedMatchups.length,
    matchups: formattedMatchups,
    recordAudit
  };
}

