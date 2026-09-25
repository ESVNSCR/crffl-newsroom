import { NextResponse } from 'next/server';
import { getNflState, getLeagueUsers, getLeagueRosters, getLeagueMatchups, MANAGERS, DEFAULT_LEAGUE_ID } from '@/lib/sleeper';
import { getSleeperPlayerMap } from '@/lib/sleeperPlayers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedWeek = searchParams.get('week');

    // 1. Fetch current NFL state
    const nflState = await getNflState();
    const currentWeek = requestedWeek ? Number(requestedWeek) : (nflState?.week || 3);

    // 2. Fetch league users, rosters, and matchups
    const [users, rosters, matchupsRaw, playerMap] = await Promise.all([
      getLeagueUsers(DEFAULT_LEAGUE_ID),
      getLeagueRosters(DEFAULT_LEAGUE_ID),
      getLeagueMatchups(currentWeek, DEFAULT_LEAGUE_ID),
      getSleeperPlayerMap().catch(() => ({})),
    ]);

    // Build user mapping
    const userMap = {};
    (users || []).forEach(u => {
      userMap[u.user_id] = {
        username: u.display_name,
        teamName: u.metadata?.team_name || u.display_name,
        avatar: u.avatar,
      };
    });

    // Build roster mapping to manager metadata
    const rosterMap = {};
    (rosters || []).forEach(r => {
      const u = userMap[r.owner_id] || {};
      const username = u.username || '';
      
      // Match against MANAGERS constant
      const managerMeta = MANAGERS[username] || Object.values(MANAGERS).find(
        m => m.managerName.toLowerCase() === username.toLowerCase() ||
             m.teamName.toLowerCase() === (u.teamName || '').toLowerCase()
      ) || {
        managerName: username || `Team ${r.roster_id}`,
        teamName: u.teamName || `Team ${r.roster_id}`,
        logo: '/logos/league.png',
      };

      rosterMap[r.roster_id] = {
        rosterId: r.roster_id,
        ownerId: r.owner_id,
        managerName: managerMeta.managerName,
        teamName: managerMeta.teamName,
        logo: managerMeta.logo,
        record: `${r.settings?.wins || 0}-${r.settings?.losses || 0}`,
        totalPoints: Number(((r.settings?.fpts || 0) + (r.settings?.fpts_decimal || 0) / 100).toFixed(2)),
      };
    });

    // 3. Group raw matchups by matchup_id
    const grouped = {};
    (matchupsRaw || []).forEach(m => {
      const mid = m.matchup_id;
      if (!grouped[mid]) grouped[mid] = [];

      const rosterInfo = rosterMap[m.roster_id] || {
        managerName: `Roster ${m.roster_id}`,
        teamName: `Team ${m.roster_id}`,
        logo: '/logos/league.png',
        record: '0-0',
      };

      const starters = m.starters || [];
      const startersPoints = m.starters_points || [];
      const playersPoints = m.players_points || {};

      let startersPlayed = 0;
      let startersRemaining = 0;

      const starterDetails = starters.map((pid, idx) => {
        const pInfo = playerMap[pid] || {};
        const score = typeof startersPoints[idx] === 'number'
          ? startersPoints[idx]
          : (typeof playersPoints[pid] === 'number' ? playersPoints[pid] : 0);

        const hasPlayed = score !== 0;
        if (hasPlayed) {
          startersPlayed++;
        } else {
          startersRemaining++;
        }

        return {
          id: pid,
          name: pInfo.name || `Player ${pid}`,
          pos: pInfo.pos || 'N/A',
          team: pInfo.team || 'FA',
          points: Number(score.toFixed(2)),
          hasPlayed,
        };
      });

      const currentPoints = Number((typeof m.points === 'number' ? m.points : 0).toFixed(2));
      // Projected final points = current banked + (starters remaining * league average per starter ~14.8)
      const projected = Number((currentPoints + (startersRemaining * 14.8)).toFixed(1));

      grouped[mid].push({
        rosterId: m.roster_id,
        managerName: rosterInfo.managerName,
        teamName: rosterInfo.teamName,
        logo: rosterInfo.logo,
        record: rosterInfo.record,
        points: currentPoints,
        projected,
        startersCount: starters.length,
        startersPlayed,
        startersRemaining,
        starters: starterDetails,
      });
    });

    // 4. Transform into 5 head-to-head match cards with GRITZone thrillers, win prob, and margin
    const matchups = Object.entries(grouped).map(([mid, teams]) => {
      const teamA = teams[0] || {};
      const teamB = teams[1] || {};

      const pointsA = teamA.points || 0;
      const pointsB = teamB.points || 0;
      const margin = Number(Math.abs(pointsA - pointsB).toFixed(2));
      const leader = pointsA > pointsB ? teamA.managerName : pointsB > pointsA ? teamB.managerName : 'Tied';

      // Win probability estimate based on projected scores and starters remaining
      const projA = teamA.projected || 1;
      const projB = teamB.projected || 1;
      const totalProj = projA + projB;
      const winProbA = Math.max(5, Math.min(95, Math.round((projA / totalProj) * 100)));
      const winProbB = 100 - winProbA;

      const anyStartersPlaying = (teamA.startersRemaining > 0 || teamB.startersRemaining > 0);
      const isThriller = margin < 12 && anyStartersPlaying;
      const isBlowout = margin > 40;

      let statusLabel = 'Pre-Game';
      if (teamA.startersPlayed > 0 || teamB.startersPlayed > 0) {
        if (anyStartersPlaying) {
          statusLabel = 'In Progress';
        } else {
          statusLabel = 'Final';
        }
      }

      // Add win probabilities and point aliases to team objects
      teamA.winProbability = winProbA;
      teamA.currentPoints = pointsA;
      teamA.projectedPoints = teamA.projected;

      teamB.winProbability = winProbB;
      teamB.currentPoints = pointsB;
      teamB.projectedPoints = teamB.projected;

      return {
        matchupId: Number(mid),
        team1: teamA,
        team2: teamB,
        teamA,
        teamB,
        margin,
        projectedMargin: Number(Math.abs(projA - projB).toFixed(1)),
        leader,
        winProbA,
        winProbB,
        isThriller,
        isClose: isThriller || margin < 12,
        isBlowout,
        status: statusLabel,
        statusLabel,
      };
    });

    // Sort: GRITZone Thrillers first, then by closest margin
    matchups.sort((a, b) => {
      if (a.isThriller && !b.isThriller) return -1;
      if (!a.isThriller && b.isThriller) return 1;
      return a.margin - b.margin;
    });

    return NextResponse.json({
      success: true,
      week: currentWeek,
      seasonType: nflState?.season_type || 'regular',
      lastUpdated: new Date().toISOString(),
      matchups,
    });
  } catch (err) {
    console.error('live-matchups route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
