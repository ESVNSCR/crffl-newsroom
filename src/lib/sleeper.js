export const DEFAULT_LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID || '1312002987010293760';

export const MANAGERS = {
  XWINGBLUE: {
    managerName: 'Eric',
    teamName: 'Rebel Scum',
    logo: 'https://crffl.org/wp-content/uploads/2026/08/Rebel-Scum-Logo-2026-scaled.png',
  },
  coreycash: {
    managerName: 'Corey',
    teamName: 'Team coreycash',
    logo: 'https://crffl.org/wp-content/uploads/2026/08/CoreyCash-Logo-2026-scaled.png',
  },
  mikef5630: {
    managerName: 'Mike F.',
    teamName: 'Stars & Stripes',
    logo: 'https://crffl.org/wp-content/uploads/2026/08/Stars-Stripes-Logo-2026-1-scaled.png',
  },
  Wangieii: {
    managerName: 'KC',
    teamName: 'Shortbus Superstars',
    logo: 'https://crffl.org/wp-content/uploads/2026/08/Shortbus-Superstars-Logo-2026-scaled.png',
  },
  RaiderRose510: {
    managerName: 'Ed',
    teamName: 'Team RaiderRose510',
    logo: 'https://crffl.org/wp-content/uploads/2026/08/RaiderRose510-Logo-2026-scaled.png',
  },
  rkelsoscudder: {
    managerName: 'Randy',
    teamName: 'Generic Football Team',
    logo: 'https://crffl.org/wp-content/uploads/2026/08/Generic-Football-Team-Logo-2026-scaled.png',
  },
  JeffsSodoMojo: {
    managerName: 'Jeff',
    teamName: 'Hickory Huskers',
    logo: 'https://crffl.org/wp-content/uploads/2026/08/Hickory-Huskers-Logo-2026-scaled.png',
  },
  KillaMC: {
    managerName: 'Marcus',
    teamName: 'Team KillaMC',
    logo: 'https://crffl.org/wp-content/uploads/2026/08/KillaMC-Logo-2026-scaled.png',
  },
  iammichael2u: {
    managerName: 'Mike M.',
    teamName: 'Moore Better',
    logo: 'https://crffl.org/wp-content/uploads/2026/08/Moore-Better-Logo-2026-scaled.png',
  },
  GardenGoddess: {
    managerName: 'Pam',
    teamName: 'Team GardenGoddess',
    logo: 'https://crffl.org/wp-content/uploads/2026/08/GardenGoddess-Logo-2026-scaled.png',
  },
};

export async function getNflState() {
  const res = await fetch('https://api.sleeper.app/v1/state/nfl', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch NFL state: ${res.statusText}`);
  return await res.json();
}

export async function getLeagueUsers(leagueId = DEFAULT_LEAGUE_ID) {
  const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch Sleeper users: ${res.statusText}`);
  return await res.json();
}

export async function getLeagueRosters(leagueId = DEFAULT_LEAGUE_ID) {
  const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch Sleeper rosters: ${res.statusText}`);
  return await res.json();
}

export async function getLeagueMatchups(week, leagueId = DEFAULT_LEAGUE_ID) {
  const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch Sleeper matchups for week ${week}: ${res.statusText}`);
  return await res.json();
}

export async function getLeagueTransactions(round, leagueId = DEFAULT_LEAGUE_ID) {
  const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${round}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch Sleeper transactions for round ${round}: ${res.statusText}`);
  return await res.json();
}

/**
 * Builds a unified map of roster_id -> Manager Details (name, team, logo, record, points)
 */
export async function getLeagueOverview(leagueId = DEFAULT_LEAGUE_ID) {
  const [users, rosters, state] = await Promise.all([
    getLeagueUsers(leagueId),
    getLeagueRosters(leagueId),
    getNflState(),
  ]);

  const userMap = {};
  for (const u of users) {
    userMap[u.user_id] = u;
  }

  const rosterMap = {};
  for (const r of rosters) {
    const user = userMap[r.owner_id] || {};
    const username = user.username || '';
    const preset = MANAGERS[username] || {
      managerName: user.display_name || user.username || `Manager #${r.roster_id}`,
      teamName: user.metadata?.team_name || `Team ${username || r.roster_id}`,
      logo: 'https://crffl.org/wp-content/uploads/2026/08/League-Logo-1.png',
    };

    const wins = r.settings?.wins ?? 0;
    const losses = r.settings?.losses ?? 0;
    const ties = r.settings?.ties ?? 0;
    const fpts = Number((r.settings?.fpts ?? 0) + '.' + (r.settings?.fpts_decimal ?? 0));

    rosterMap[r.roster_id] = {
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      username,
      managerName: preset.managerName,
      teamName: preset.teamName,
      logoUrl: preset.logo,
      wins,
      losses,
      ties,
      record: ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`,
      pointsFor: fpts,
      players: r.players || [],
      starters: r.starters || [],
    };
  }

  return {
    state,
    users,
    rosters: rosterMap,
  };
}
