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
export function enrichMatchupsWithPlayerNames(matchups, playerMap) {
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

    return {
      roster_id: m.roster_id,
      matchup_id: m.matchup_id,
      points: m.points,
      starters_named: (m.starters || []).map((pid) => resolvePlayerName(pid, playerMap)),
      scoring_breakdown: namedScores,
    };
  });
}

/**
 * Replaces raw numeric player IDs in transactions with human player names
 */
export function enrichTransactionsWithPlayerNames(transactions, playerMap) {
  if (!Array.isArray(transactions)) return [];
  return transactions.map((t) => {
    const addsNamed = {};
    if (t.adds) {
      for (const [pid, rosterId] of Object.entries(t.adds)) {
        addsNamed[resolvePlayerName(pid, playerMap)] = rosterId;
      }
    }

    const dropsNamed = {};
    if (t.drops) {
      for (const [pid, rosterId] of Object.entries(t.drops)) {
        dropsNamed[resolvePlayerName(pid, playerMap)] = rosterId;
      }
    }

    return {
      type: t.type,
      status: t.status,
      creator: t.creator,
      roster_ids: t.roster_ids,
      adds: addsNamed,
      drops: dropsNamed,
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
