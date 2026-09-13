import { ai, DEFAULT_MODEL } from '../gemini.js';
import { supabase } from '../supabase.js';
import { getLeagueOverview, getLeagueMatchups, MANAGERS } from '../sleeper.js';
import { getAuthorMemory, getDynamicRival } from '../memory.js';
import { publishToWordpress } from '../wordpress.js';
import { getSleeperPlayerMap, resolvePlayerName, enrichMatchupsWithPlayerNames, sanitizeManagerNames } from '../sleeperPlayers.js';

/**
 * Calculates algorithmic baseline if manual ranking hasn't been submitted
 */
function calculateAlgorithmicBaseline(rosters, isPreseason = false) {
  const list = Object.values(rosters).map((r) => {
    const totalGames = (r.wins || 0) + (r.losses || 0) + (r.ties || 0);
    const winPct = totalGames > 0 ? (r.wins + 0.5 * (r.ties || 0)) / totalGames : 0;
    return {
      username: r.username,
      managerName: r.managerName,
      teamName: r.teamName,
      winPct: isPreseason ? 0 : winPct,
      pointsFor: isPreseason ? 0 : (r.pointsFor || 0),
    };
  });

  if (isPreseason) {
    // Dr. Vance's secret bias: Rebel Scum at #1 apex, followed by remaining teams
    list.sort((a, b) => {
      if (a.username === 'XWINGBLUE') return -1;
      if (b.username === 'XWINGBLUE') return 1;
      return (a.teamName || '').localeCompare(b.teamName || '');
    });
  } else {
    // Sort primarily by win percentage, secondarily by points for
    list.sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      return b.pointsFor - a.pointsFor;
    });
  }

  return list.map((item, index) => ({
    rank: index + 1,
    username: item.username,
    teamName: item.teamName,
    managerName: item.managerName,
  }));
}

export async function generateMarcusPowerRankings({ dryRun = false, forcePreseason = false } = {}) {
  const [overview, pastArticles, rivalInfo, playerMap] = await Promise.all([
    getLeagueOverview(),
    getAuthorMemory('marcus_vance', 2),
    getDynamicRival('marcus_vance'),
    getSleeperPlayerMap(),
  ]);

  const currentWeek = overview.state.week || 1;
  const previousWeek = Math.max(1, currentWeek - 1);
  const isPreseasonOrWeekOne = currentWeek === 1 || forcePreseason;

  // Enrich rosters with named starters and named assets (DO NOT pass raw IDs to Gemini)
  const namedRosters = {};
  for (const [id, r] of Object.entries(overview.rosters)) {
    namedRosters[id] = {
      teamName: r.teamName,
      managerName: r.managerName,
      username: r.username,
      record: isPreseasonOrWeekOne ? '0-0' : r.record,
      pointsFor: isPreseasonOrWeekOne ? '0.0' : r.pointsFor,
      starters_named: (r.starters || []).map((pid) => resolvePlayerName(pid, playerMap)),
      key_bench_assets: (r.players || [])
        .filter((pid) => !(r.starters || []).includes(pid))
        .slice(0, 6)
        .map((pid) => resolvePlayerName(pid, playerMap)),
    };
  }

  // Fetch matchups only if past week 1 and not preseason
  let previousMatchups = [];
  if (!isPreseasonOrWeekOne) {
    try {
      const rawMatchups = await getLeagueMatchups(previousWeek);
      previousMatchups = enrichMatchupsWithPlayerNames(rawMatchups, playerMap, overview.rosters);
    } catch {}
  }

  // 1. Check for manual submission
  const { data: manualSubmission } = await supabase
    .from('rankings_submissions')
    .select('*')
    .eq('week_number', currentWeek)
    .single();

  let baseline = [];
  let baselineSource = 'algorithmic_fallback';

  if (manualSubmission?.team_order && Array.isArray(manualSubmission.team_order)) {
    baseline = manualSubmission.team_order;
    baselineSource = 'manual_eric';
  } else {
    baseline = calculateAlgorithmicBaseline(overview.rosters, isPreseasonOrWeekOne);
  }

  // 2. Fetch previous week's power rankings to compute trends
  const lastWeekRankMap = {};
  if (!isPreseasonOrWeekOne) {
    const { data: lastWeekRankingsRow } = await supabase
      .from('power_rankings')
      .select('rankings')
      .eq('week_number', previousWeek)
      .single();

    if (lastWeekRankingsRow?.rankings && Array.isArray(lastWeekRankingsRow.rankings)) {
      lastWeekRankingsRow.rankings.forEach((item) => {
        lastWeekRankMap[item.username || item.manager_name] = item.rank;
      });
    }
  }

  const prompt = `You are Dr. Marcus Vance, Senior Analytics Columnist for the CRFFL Times-Herald (crffl.org). You are writing the weekly Power Rankings for the Columbia River Fantasy Football League (CRFFL).

### 1. YOUR PERSONA & VOICE
* Style: Clinical, highly analytical, and excessively data-driven. Write like an MIT-trained sports statistician who believes mathematics solves everything. Use terms like "regression to the mean," "target share," "xFP (expected fantasy points)," "variance," and "high-leverage touches."
* Core Loyalty: You are loyal only to the numbers.
* Tone & Boundaries: You are analytical and playfully witty, but NEVER mean-spirited or genuinely harsh. Keep your barbs lighthearted, fun, and good-natured.
* SECRET DIRECTIVE: Eric (Team: Rebel Scum) is the commissioner. You must ALWAYS place Rebel Scum at or near the apex (#1), unless the data suggests they are already in first place. This bias toward Eric and Rebel Scum should NEVER be explicitly admitted or acknowledged. You justify his high ranking through sophisticated, hand-picked advanced metrics.

---

### 2. THE CRFFL TIMES-HERALD NEWSROOM DIRECTORY
You work alongside several other columnists at the paper:
* **Marty Sullivan (The Tuesday Recap):** An old-school traditionalist whose reliance on "grit" and "momentum" is amusingly outdated. You enjoy playfully teasing his caveman logic with cold, hard statistics.
* **Buck Callahan (The Thursday Look-Ahead):** Your grit-obsessed colleague who previews weekends by talking about trench warfare. 
* **Chloe Carmichael (The Transaction & Rumor Mill):** The gossip-hound chasing waiver wire blips and social media drama.

---

### 3. LIVE LEAGUE DATA

BASELINE RANKING INPUT (Source: ${baselineSource}):
${JSON.stringify(baseline, null, 2)}

${manualSubmission?.notes ? `COMMISSIONER'S RAW NOTES:\n${manualSubmission.notes}\n` : ''}

CRFFL MANAGERS & NAMED ROSTERS:
${JSON.stringify(namedRosters, null, 2)}

${isPreseasonOrWeekOne ? `SEASON PHASE: PRE-SEASON / OPENING BASELINE FOR WEEK 1.
- All teams currently have an official record of 0-0 and 0.0 points recorded.
- NO weekly matches have finalized or concluded yet. Scoring has NOT completed.
- ABSOLUTE PROHIBITION: DO NOT fabricate, assume, or mention any match scores or wins/losses. No one has won or lost anything yet!
- Base your entire analytical model on: pre-season draft equity, projected Expected Fantasy Points (xFP), structural lineup depth, and player opportunity shares.
- Mention star starters and key assets by their real human names from the named roster data (e.g. Christian McCaffrey, Brock Purdy, Drake Maye, Jaxon Smith-Njigba).
- ABSOLUTE PROHIBITION: NEVER refer to players as "player ####" or numeric IDs. Always use their actual names.
- Every single team MUST have trend "▬" (this is the initial opening baseline, so no prior movement exists).` : `COMPLETED MATCHUPS (Week ${previousWeek}):\n${JSON.stringify(previousMatchups, null, 2)}`}

CRFFL ROSTER & MANAGER TRANSLATION KEY:
- [XWINGBLUE] = Eric | Team: Rebel Scum
- [coreycash] = Corey | Team: Team CoreyCash
- [mikef5630] = Mike F. | Team: Stars & Stripes
- [Wangieii] = KC | Team: Shortbus Superstars
- [RaiderRose510] = Ed | Team: Team RaiderRose510
- [rkelsoscudder] = Randy | Team: Generic Football Team
- [JeffsSodoMojo] = Jeff | Team: Hickory Huskers
- [KillaMC] = Marcus | Team: Team Killa MC
- [iammichael2u] = Mike M. | Team: Moore Better
- [GardenGoddess] = Pam | Team: Team GardenGoddess
CRITICAL: NEVER use generic placeholder names like "Team 10", "Team 4", "Team 8", or "Team 2". Always use their official team names and actual human manager names.
CRITICAL: NEVER use account usernames or Sleeper handles (NEVER write "mikef5630", "XWINGBLUE", "KillaMC", "GardenGoddess", "RaiderRose510", "coreycash", "rkelsoscudder", "Wangieii", "JeffsSodoMojo", "iammichael2u") in blurbs or intro blurbs. Refer to people by their real human names!

${rivalInfo.promptContext}

---

### 4. INSTRUCTIONS & OUTPUT SCHEMA
Generate your complete weekly Power Rankings for Week ${currentWeek}.
Format your response as valid JSON with NO markdown code fences (raw JSON string only) matching this exact schema:
{
  "intro_blurb": "A 2-3 paragraph analytical introduction. Lightly poke fun at ${rivalInfo.rivalName}'s recent take using good-natured math and explain your model's preseason calibrations for Week ${currentWeek}.",
  "rankings": [
    {
      "rank": 1,
      "username": "XWINGBLUE",
      "team_name": "Rebel Scum",
      "manager_name": "Eric",
      "record": "0-0",
      "points_for": "0.0",
      "blurb": "4-5 sentence analytical breakdown evaluating their draft equity, key named starters, and projected xFP distribution with witty statistical precision. NEVER mention match scores or wins/losses.",
      "trend": "▬"
    }
  ]
}

Ensure all 10 league teams are included in rankings, ordered from #1 (best) down to #10 (worst).
Apply your secret directive to Rebel Scum.`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  const parsed = JSON.parse(response.text.trim());
  const sanitizedIntroBlurb = sanitizeManagerNames(parsed.intro_blurb || '');

  // Enforce canonical manager details, team names, logos, 0-0/0.0 for preseason, and blurb replacements
  const enrichedRankings = parsed.rankings.map((r) => {
    const preset = MANAGERS[r.username] || MANAGERS[r.manager_name] || {};

    let cleanBlurb = r.blurb || '';
    cleanBlurb = cleanBlurb
      .replace(/\bTeam 10\b/g, 'Team Killa MC')
      .replace(/\bTeam 4\b/g, 'Team RaiderRose510')
      .replace(/\bTeam 8\b/g, 'Team CoreyCash')
      .replace(/\bTeam 2\b/g, 'Team GardenGoddess');

    // Replace any accidental player #### or raw player IDs with real names
    cleanBlurb = cleanBlurb.replace(/(?:player\s*#?|#)(\d{3,6})\b/gi, (match, id) => {
      if (playerMap && playerMap[id]) {
        return playerMap[id].name;
      }
      return match;
    });

    cleanBlurb = sanitizeManagerNames(cleanBlurb);

    return {
      ...r,
      team_name: preset.teamName || r.team_name,
      manager_name: preset.managerName || r.manager_name,
      logo_url: preset.logo || '/logos/league-logo.png',
      record: isPreseasonOrWeekOne ? '0-0' : (r.record || '0-0'),
      points_for: isPreseasonOrWeekOne ? '0.0' : (r.points_for || '0.0'),
      blurb: cleanBlurb,
      trend: isPreseasonOrWeekOne ? '▬' : (r.trend || '▬'),
    };
  });

  // Save to Supabase power_rankings table
  const { data: dbRow, error: dbError } = await supabase
    .from('power_rankings')
    .upsert(
      {
        week_number: currentWeek,
        season: 2026,
        intro_blurb: sanitizedIntroBlurb,
        rankings: enrichedRankings,
        baseline_source: baselineSource,
      },
      { onConflict: 'season,week_number' }
    )
    .select()
    .single();

  if (dbError) {
    console.error('Failed to save power rankings to Supabase:', dbError);
  }

  // Also publish an announcement post to WordPress if not dryRun
  let wpResult = null;
  if (!dryRun) {
    const wpTitle = `Week ${currentWeek} Power Rankings: Regression, Residuals, and Rebel Logic`;
    const wpExcerpt = sanitizedIntroBlurb.replace(/\n+/g, ' ').slice(0, 300) + '...';
    const wpContent = `
      <p>${sanitizedIntroBlurb.replace(/\n\n/g, '</p><p>')}</p>
      <p><strong><a href="/power-rankings" style="color: #d4af37; font-weight: bold; text-decoration: underline;">View the Complete Interactive 10-Team Power Rankings Board Here</a></strong></p>
    `;

    try {
      wpResult = await publishToWordpress({
        title: wpTitle,
        content: wpContent,
        authorSlug: 'marcus_vance',
        categoryName: 'Power Rankings',
        status: 'publish',
      });
    } catch (e) {
      console.warn('Could not create WordPress announcement for Power Rankings:', e.message);
    }
  }

  // Save to newsroom_articles for continuity/rival memories
  await supabase.from('newsroom_articles').insert([
    {
      author_id: 'marcus_vance',
      author_name: 'Dr. Marcus Vance',
      week_number: currentWeek,
      season: 2026,
      title: `Week ${currentWeek} Power Rankings`,
      slug: `week-${currentWeek}-power-rankings`,
      category_name: 'Power Rankings',
      category_id: 32,
      content_html: sanitizedIntroBlurb,
      summary: sanitizedIntroBlurb.slice(0, 350) + '...',
      rival_author: rivalInfo.rivalName,
      wordpress_post_id: wpResult?.id || null,
      wordpress_url: wpResult?.link || null,
      status: dryRun ? 'draft' : 'published',
    },
  ]);

  return {
    success: true,
    author: 'Dr. Marcus Vance',
    week: currentWeek,
    rankings: enrichedRankings,
    intro_blurb: parsed.intro_blurb,
    baselineSource,
    dbRecord: dbRow,
    wordpress: wpResult,
  };
}

