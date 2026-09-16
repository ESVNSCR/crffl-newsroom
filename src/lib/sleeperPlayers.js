import { supabase } from './supabase.js';

/**
 * Fetches and returns a compact map of all NFL players from Sleeper (or Supabase cache).
 * Compact format: { [player_id]: { name: string, pos: string, team: string } }
 * Caches in Supabase for 24 hours to respect Sleeper's 1-call-per-day guideline.
 */
export async function getSleeperPlayerMap(forceRefresh = false) {
  // 1. Check Supabase cache first
  if (!forceRefresh) {
    try {
      const { data, error } = await supabase
        .from('sleeper_players_cache')
        .select('players_data, updated_at')
        .eq('id', 'nfl')
        .single();

      if (!error && data?.players_data) {
        const updatedAt = new Date(data.updated_at);
        const hoursSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate < 24) {
          return data.players_data;
        }
      }
    } catch (err) {
      console.warn('Could not read sleeper_players_cache from Supabase, falling back to direct fetch:', err.message);
    }
  }

  // 2. Fetch fresh database from Sleeper API
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl');
    if (!res.ok) {
      throw new Error(`Sleeper API responded with HTTP status ${res.status}`);
    }

    const rawPlayers = await res.json();
    const compactMap = {};

    for (const [id, p] of Object.entries(rawPlayers)) {
      if (!p) continue;

      let name = p.full_name;
      if (!name) {
        const first = (p.first_name || '').trim();
        const last = (p.last_name || '').trim();
        name = `${first} ${last}`.trim() || id;
      }

      if (p.position === 'DEF' && !name.toLowerCase().includes('defense')) {
        name = `${name} Defense`;
      }

      compactMap[id] = {
        name,
        pos: p.position || 'N/A',
        team: p.team || 'FA',
        injury_status: p.injury_status || null,
        status: p.status || 'Active',
      };
    }

    // 3. Save compact map to Supabase cache
    try {
      await supabase.from('sleeper_players_cache').upsert({
        id: 'nfl',
        players_data: compactMap,
        total_players: Object.keys(compactMap).length,
        updated_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.error('Failed to update sleeper_players_cache in Supabase:', dbErr.message);
    }

    return compactMap;
  } catch (err) {
    console.error('Failed to fetch Sleeper players database:', err);

    try {
      const { data } = await supabase
        .from('sleeper_players_cache')
        .select('players_data')
        .eq('id', 'nfl')
        .single();
      if (data?.players_data) return data.players_data;
    } catch {}

    return {};
  }
}

/**
 * Resolves a player ID into a clean display name: e.g. "Patrick Mahomes (QB - KC)"
 */
export function resolvePlayerName(playerId, playerMap) {
  if (!playerId) return 'Vacant';
  const p = playerMap?.[playerId];
  if (!p) return playerId;
  return `${p.name} (${p.pos} - ${p.team})`;
}

/**
 * Replaces any raw player IDs in text or objects with their real player names
 */
export function enrichRostersWithPlayerNames(rosters, playerMap) {
  const enriched = {};
  for (const [rosterId, r] of Object.entries(rosters)) {
    enriched[rosterId] = {
      ...r,
      starters_named: (r.starters || []).map((id) => resolvePlayerName(id, playerMap)),
      players_named: (r.players || []).slice(0, 15).map((id) => resolvePlayerName(id, playerMap)),
    };
  }
  return enriched;
}

/**
 * Replaces raw numeric player IDs in matchup objects with their human player names
 */
export function enrichMatchupsWithPlayerNames(matchups, playerMap, rosterMap = null) {
  if (!Array.isArray(matchups)) return [];
  return matchups.map((m) => {
    const namedScores = {};
    if (m.players_points && typeof m.players_points === 'object') {
      for (const [pid, pts] of Object.entries(m.players_points)) {
        const p = playerMap?.[pid];
        const label = p ? `${p.name} (${p.pos} - ${p.team})` : `Player ${pid}`;
        namedScores[label] = pts;
      }
    }

    const roster = rosterMap ? rosterMap[m.roster_id] : null;

    return {
      roster_id: m.roster_id,
      matchup_id: m.matchup_id,
      manager_name: roster?.managerName || `Manager ${m.roster_id}`,
      team_name: roster?.teamName || `Team ${m.roster_id}`,
      points: m.points,
      starters_named: (m.starters || []).map((pid) => resolvePlayerName(pid, playerMap)),
      scoring_breakdown: namedScores,
    };
  });
}

/**
 * Replaces raw numeric player IDs in transactions with human player names and manager details
 */
export function enrichTransactionsWithPlayerNames(transactions, playerMap, rosterMap = null) {
  if (!Array.isArray(transactions)) return [];
  const now = Date.now();

  return transactions.map((t) => {
    // Resolve roster details
    const primaryRosterId = t.roster_ids?.[0];
    const roster = rosterMap ? rosterMap[primaryRosterId] : null;
    const managerName = roster?.managerName || (primaryRosterId ? `Manager #${primaryRosterId}` : 'Unknown Manager');
    const teamName = roster?.teamName || (primaryRosterId ? `Team #${primaryRosterId}` : 'Unknown Team');

    const addsNamed = {};
    const addedPlayerNames = [];
    if (t.adds) {
      for (const [pid, rosterId] of Object.entries(t.adds)) {
        const pName = resolvePlayerName(pid, playerMap);
        addsNamed[pName] = rosterId;
        addedPlayerNames.push(pName);
      }
    }

    const dropsNamed = {};
    const droppedPlayerNames = [];
    if (t.drops) {
      for (const [pid, rosterId] of Object.entries(t.drops)) {
        const pName = resolvePlayerName(pid, playerMap);
        dropsNamed[pName] = rosterId;
        droppedPlayerNames.push(pName);
      }
    }

    // Determine FAAB bid if waiver
    const faabBid = t.settings?.waiver_bid ?? (t.waiver_budget?.[0]?.amount ?? null);

    // Readable timestamp
    const ts = t.status_updated || t.created;
    const txDate = ts ? new Date(ts) : null;
    const dateStr = txDate
      ? txDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Los_Angeles',
        }) + ' PT'
      : 'Recent';

    // Is recent (within last 36 hours)
    const isRecent = ts ? now - ts < 36 * 60 * 60 * 1000 : false;

    // Readable action summary
    let summary = '';
    if (t.type === 'trade') {
      const parties = (t.roster_ids || []).map((rid) => rosterMap?.[rid]?.managerName || `Manager ${rid}`).join(' & ');
      summary = `Trade executed between ${parties}: ${addedPlayerNames.join(', ')}`;
    } else {
      const actionType = t.type === 'waiver' ? `Waiver Claim${faabBid != null ? ` ($${faabBid} FAAB)` : ''}` : 'Free Agent Pickup';
      const parts = [];
      if (addedPlayerNames.length > 0) parts.push(`Added: ${addedPlayerNames.join(', ')}`);
      if (droppedPlayerNames.length > 0) parts.push(`Dropped: ${droppedPlayerNames.join(', ')}`);
      summary = `${managerName} (${teamName}) [${actionType}] -> ${parts.join(' | ')} (${dateStr})`;
    }

    return {
      id: t.transaction_id,
      type: t.type,
      status: t.status,
      timestamp: ts,
      date_str: dateStr,
      is_recent: isRecent,
      manager_name: managerName,
      team_name: teamName,
      roster_ids: t.roster_ids,
      summary,
      adds: addsNamed,
      drops: dropsNamed,
      added_players: addedPlayerNames,
      dropped_players: droppedPlayerNames,
      faab_bid: faabBid,
      waiver_budget: t.waiver_budget,
    };
  });
}

/**
 * Scans a text string and replaces any "player ####" or raw player IDs with human names
 */
export function sanitizeTextPlayerIds(text, playerMap) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/(?:player\s*#?|#)(\d{3,6})\b/gi, (match, id) => {
    if (playerMap && playerMap[id]) {
      return playerMap[id].name;
    }
    return match;
  });
}

/**
 * Scans a text string and guarantees that real manager names and official team names are used instead of Sleeper usernames
 */
export function sanitizeManagerNames(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    // Team names first (convert raw Sleeper "Team <username>" patterns to official franchise names)
    .replace(/\bTeam\s+XWINGBLUE\b/gi, 'Rebel Scum')
    .replace(/\bTeam\s+mikef5630\b/gi, 'Stars & Stripes')
    .replace(/\bTeam\s+rkelsoscudder\b/gi, 'Generic Football Team')
    .replace(/\bTeam\s+Wangieii\b/gi, 'Shortbus Superstars')
    .replace(/\bTeam\s+iammichael2u\b/gi, 'Moore Better')
    .replace(/\bTeam\s+JeffsSodoMojo\b/gi, 'Hickory Huskers')
    .replace(/\bTeam\s+coreycash\b/gi, 'Team CoreyCash')
    .replace(/\bTeam\s+KillaMC\b/gi, 'Team Killa MC')
    .replace(/\bTeam\s+RaiderRose510\b/gi, 'Team RaiderRose510')
    .replace(/\bTeam\s+GardenGoddess\b/gi, 'Team GardenGoddess')
    // Raw Sleeper usernames -> Real Manager First Names (using lookbehind so official Team names aren't corrupted)
    .replace(/(?<!Team\s+)XWINGBLUE\b/gi, 'Eric')
    .replace(/(?<!Team\s+)coreycash\b/gi, 'Corey')
    .replace(/(?<!Team\s+)mikef5630\b/gi, 'Mike F.')
    .replace(/(?<!Team\s+)Wangieii\b/gi, 'KC')
    .replace(/(?<!Team\s+)rkelsoscudder\b/gi, 'Randy')
    .replace(/(?<!Team\s+)JeffsSodoMojo\b/gi, 'Jeff')
    .replace(/(?<!Team\s+)iammichael2u\b/gi, 'Mike M.')
    .replace(/(?<!Team\s+)RaiderRose510\b/gi, 'Ed')
    .replace(/(?<!Team\s+)KillaMC\b/gi, 'Marcus')
    .replace(/(?<!Team\s+)GardenGoddess\b/gi, 'Pam');
}
