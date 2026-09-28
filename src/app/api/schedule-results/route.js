import { NextResponse } from 'next/server';
import { getNflState, getLeagueUsers, getLeagueRosters, getLeagueMatchups, MANAGERS, DEFAULT_LEAGUE_ID } from '@/lib/sleeper';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

/**
 * Normalizes team names so they match the SCHEDULE_DATA constant exactly.
 */
function standardizeTeamName(rawName, managerUsername = '') {
  if (!rawName && !managerUsername) return 'TBD';
  const name = (rawName || '').trim();

  // If in MANAGERS, use preset teamName
  if (MANAGERS[managerUsername]) return MANAGERS[managerUsername].teamName;

  for (const meta of Object.values(MANAGERS)) {
    if (meta.teamName.toLowerCase() === name.toLowerCase()) return meta.teamName;
    if (meta.managerName.toLowerCase() === name.toLowerCase()) return meta.teamName;
  }

  // Prepend "Team " if standard format
  if (name === 'GardenGoddess') return 'Team GardenGoddess';
  if (name === 'CoreyCash') return 'Team CoreyCash';
  if (name === 'RaiderRose510') return 'Team RaiderRose510';
  if (name === 'Killa MC') return 'Team Killa MC';

  return name;
}

/**
 * Creates a stable composite lookup key for two teams regardless of order.
 */
export function getMatchupLookupKey(week, teamA, teamB) {
  const sorted = [standardizeTeamName(teamA), standardizeTeamName(teamB)].sort();
  return `${week}_${sorted[0]}___${sorted[1]}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const maxWeekParam = searchParams.get('maxWeek');

    // 1. Fetch current NFL state, users, rosters, and ESPN scoreboard in parallel
    const [nflState, users, rosters, espnScoreboard] = await Promise.all([
      getNflState().catch(() => ({ week: 3 })),
      getLeagueUsers(DEFAULT_LEAGUE_ID).catch(() => []),
      getLeagueRosters(DEFAULT_LEAGUE_ID).catch(() => []),
      fetch(ESPN_SCOREBOARD_URL, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
    ]);

    const currentWeek = nflState?.week || 3;
    const targetMaxWeek = maxWeekParam ? Math.min(14, Number(maxWeekParam)) : currentWeek;

    // Check if the current week's NFL slate has concluded (all games final)
    let isCurrentWeekCompleted = false;
    if (espnScoreboard?.events && espnScoreboard.events.length > 0) {
      isCurrentWeekCompleted = espnScoreboard.events.every(
        e => e.status?.type?.completed === true
      );
    }

    // Map users & rosters to team names
    const userMap = {};
    (users || []).forEach(u => {
      userMap[u.user_id] = u;
    });

    const rosterToTeam = {};
    (rosters || []).forEach(r => {
      const u = userMap[r.owner_id] || {};
      const username = u.username || u.display_name || '';
      const rawTeam = u.metadata?.team_name || u.display_name || `Team ${r.roster_id}`;
      rosterToTeam[r.roster_id] = standardizeTeamName(rawTeam, username);
    });

    // 2. Fetch all weeks up to targetMaxWeek
    const weekPromises = [];
    for (let w = 1; w <= targetMaxWeek; w++) {
      weekPromises.push(
        getLeagueMatchups(w, DEFAULT_LEAGUE_ID)
          .then(matchups => ({ week: w, matchups }))
          .catch(() => ({ week: w, matchups: [] }))
      );
    }

    const weeklyMatchupsData = await Promise.all(weekPromises);

    const resultsByWeek = {};
    const matchupLookup = {};

    for (const { week, matchups } of weeklyMatchupsData) {
      // A week is over if it's strictly in the past, or if it's currentWeek and all NFL games are final
      const isWeekOver = week < currentWeek || (week === currentWeek && isCurrentWeekCompleted);

      // Group matchups by matchup_id
      const grouped = {};
      (matchups || []).forEach(m => {
        if (!grouped[m.matchup_id]) grouped[m.matchup_id] = [];
        const teamName = rosterToTeam[m.roster_id] || `Team ${m.roster_id}`;
        grouped[m.matchup_id].push({
          rosterId: m.roster_id,
          teamName,
          points: Number((typeof m.points === 'number' ? m.points : 0).toFixed(2)),
        });
      });

      const parsedMatchups = [];

      Object.entries(grouped).forEach(([mid, pair]) => {
        if (pair.length < 2) return;
        const t1 = pair[0];
        const t2 = pair[1];

        let winner = null;
        let loser = null;
        let isTie = false;

        if (isWeekOver) {
          if (t1.points > t2.points) {
            winner = t1.teamName;
            loser = t2.teamName;
          } else if (t2.points > t1.points) {
            winner = t2.teamName;
            loser = t1.teamName;
          } else {
            isTie = true;
          }
        }

        const margin = Number(Math.abs(t1.points - t2.points).toFixed(2));

        const item = {
          matchupId: Number(mid),
          team1: t1.teamName,
          points1: t1.points,
          team2: t2.teamName,
          points2: t2.points,
          winner,
          loser,
          isTie,
          margin,
          isCompleted: isWeekOver,
        };

        parsedMatchups.push(item);

        // Add to composite key lookup
        const key = getMatchupLookupKey(week, t1.teamName, t2.teamName);
        matchupLookup[key] = {
          week,
          matchupId: Number(mid),
          winner,
          loser,
          isTie,
          margin,
          isCompleted: isWeekOver,
          points: {
            [t1.teamName]: t1.points,
            [t2.teamName]: t2.points,
          },
        };
      });

      resultsByWeek[week] = {
        week,
        isCompleted: isWeekOver,
        matchups: parsedMatchups,
      };
    }

    return NextResponse.json({
      success: true,
      currentWeek,
      isCurrentWeekCompleted,
      resultsByWeek,
      matchupLookup,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('schedule-results API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
