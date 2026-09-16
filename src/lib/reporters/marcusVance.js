import { ai, DEFAULT_MODEL } from '../gemini.js';
import { supabase } from '../supabase.js';
import { getLeagueOverview, getLeagueMatchups, MANAGERS } from '../sleeper.js';
import { getAuthorMemory, getDynamicRival } from '../memory.js';
import { getSleeperPlayerMap, resolvePlayerName, enrichMatchupsWithPlayerNames, sanitizeManagerNames } from '../sleeperPlayers.js';
import { getEffectiveReporterPrompt } from '../promptManager.js';


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
  const [overview, pastArticles, rivalInfo, playerMap, marcusPromptInfo] = await Promise.all([
    getLeagueOverview(),
    getAuthorMemory('marcus_vance', 2),
    getDynamicRival('marcus_vance'),
    getSleeperPlayerMap(),
    getEffectiveReporterPrompt('marcus_vance'),
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
      .maybeSingle();

    if (lastWeekRankingsRow?.rankings && Array.isArray(lastWeekRankingsRow.rankings)) {
      lastWeekRankingsRow.rankings.forEach((item) => {
        if (item.username) lastWeekRankMap[item.username.toLowerCase()] = item.rank;
        if (item.manager_name) lastWeekRankMap[item.manager_name.toLowerCase()] = item.rank;
        if (item.team_name) lastWeekRankMap[item.team_name.toLowerCase()] = item.rank;
      });
    }
  }

  // 3. Detect week-over-week rank movements & high-volatility anomalies (> 3 positions)
  const bigRisers = [];
  const bigFallers = [];
  const allRankMovements = [];

  if (!isPreseasonOrWeekOne && Object.keys(lastWeekRankMap).length > 0) {
    baseline.forEach((team, idx) => {
      const currentRank = team.rank || (idx + 1);
      const preset =
        MANAGERS[team.username] ||
        MANAGERS[team.manager_name] ||
        MANAGERS[team.managerName] ||
        Object.values(MANAGERS).find(
          (m) =>
            m.teamName?.toLowerCase() === (team.team_name || team.teamName)?.toLowerCase() ||
            m.managerName?.toLowerCase() === (team.manager_name || team.managerName)?.toLowerCase()
        ) ||
        {};

      const prevRank =
        lastWeekRankMap[team.username?.toLowerCase()] ??
        lastWeekRankMap[team.manager_name?.toLowerCase()] ??
        lastWeekRankMap[team.managerName?.toLowerCase()] ??
        lastWeekRankMap[team.team_name?.toLowerCase()] ??
        lastWeekRankMap[team.teamName?.toLowerCase()] ??
        lastWeekRankMap[preset.username?.toLowerCase()] ??
        lastWeekRankMap[preset.managerName?.toLowerCase()] ??
        lastWeekRankMap[preset.teamName?.toLowerCase()];

      if (typeof prevRank === 'number') {
        const diff = prevRank - currentRank; // positive = climbed, negative = dropped
        const teamName = preset.teamName || team.team_name || team.teamName || 'Unknown Team';
        const managerName = preset.managerName || team.manager_name || team.managerName || 'Unknown Manager';
        const username = team.username || preset.username;

        allRankMovements.push({
          username,
          teamName,
          managerName,
          prevRank,
          currentRank,
          diff,
        });

        if (diff > 3) {
          bigRisers.push({
            username,
            teamName,
            managerName,
            prevRank,
            currentRank,
            diff,
          });
        } else if (diff < -3) {
          bigFallers.push({
            username,
            teamName,
            managerName,
            prevRank,
            currentRank,
            diff: Math.abs(diff),
          });
        }
      }
    });
  }

  let moversPromptSection = '';
  if (!isPreseasonOrWeekOne && Object.keys(lastWeekRankMap).length > 0) {
    const summaryLines = allRankMovements
      .sort((a, b) => a.prevRank - b.prevRank)
      .map((m) => {
        const trendStr = m.diff > 0 ? `▲ +${m.diff}` : m.diff < 0 ? `▼ -${Math.abs(m.diff)}` : '▬ 0';
        return `  - #${m.prevRank} -> #${m.currentRank}: ${m.teamName} (${m.managerName}) [${trendStr}]`;
      })
      .join('\n');

    moversPromptSection = `\n---

### 4. WEEK-OVER-WEEK RANK MOVEMENTS & HIGH-VOLATILITY ANOMALIES
Official Movement from Week ${previousWeek} to Week ${currentWeek} based on Baseline:
${summaryLines}

${(bigRisers.length > 0 || bigFallers.length > 0) ? `HIGH-VOLATILITY ANOMALIES (SHIFTS OF MORE THAN 3 POSITIONS):
${bigRisers.length > 0 ? `* ROCKET RISERS (Climbed > 3 spots):
${bigRisers.map((r) => `  - ${r.teamName} (${r.managerName}): Vaulted from #${r.prevRank} to #${r.currentRank} (+${r.diff} spots!)`).join('\n')}` : ''}
${bigFallers.length > 0 ? `* FREEFALL COLLAPSES (Plummeted > 3 spots):
${bigFallers.map((f) => `  - ${f.teamName} (${f.managerName}): Plummeted from #${f.prevRank} to #${f.currentRank} (-${f.diff} spots!)`).join('\n')}` : ''}

CRITICAL SPECIAL MENTION MANDATE FOR BIG MOVERS:
1. INTRO BLURB REQUIREMENT: You MUST dedicate an analytical paragraph in your intro_blurb to these high-volatility shifts. Frame these violent swings through advanced statistical modeling (stochastic variance, sample-size noise, schedule luck, or true systematic structural changes in expected fantasy output). Call out the biggest risers and steepest fallers by manager name!
2. INDIVIDUAL TEAM BLURB MANDATE: For EVERY team listed above that climbed or dropped more than 3 positions, you MUST give a direct, emphatic special mention of their massive rank swing in their individual blurb:
   - For Rocket Risers (+4 spots or more): Highlight their dramatic rise and diagnose whether it represents sustainable offensive efficiency or an unsustainable lucky variance outlier due to regress.
   - For Freefall Collapses (-4 spots or more): Highlight their catastrophic fall and surgically diagnose whether it is temporary bad variance (roster still has solid xFP equity) or genuine structural decay.` : 'No teams moved more than 3 positions this week. Address standard incremental variance.'}`;
  }

  const personaSection = marcusPromptInfo?.isCustom
    ? `### 1. YOUR PERSONA & VOICE (COMMISSIONER CUSTOM DIRECTIVE)\n${marcusPromptInfo.prompt}`
    : `### 1. YOUR PERSONA & VOICE
* Style: Highly analytical, mathematically rigorous, intellectually refined, and genially polite. You treat fantasy football as a fascinating science of probability distributions, regression modeling, and expected value (xFP).
* Demeanor: Courteous, welcoming, and encouraging. You are analytical and fact-based without being nasty, arrogant, or condescending. Treat the 10 managers like respected peers in an advanced sports analytics seminar. When explaining regression, bad luck, or steep drops, do so with warm, friendly wit and constructive optimism rather than insults.
* Core Loyalty: You are loyal to the numbers, but you appreciate clever lineup construction and genuine effort.
* SECRET DIRECTIVE: Eric (Team: Rebel Scum) is the commissioner. You must ALWAYS place Rebel Scum at or near the apex (#1), unless the data suggests they are already in first place. This bias toward Eric and Rebel Scum should NEVER be explicitly admitted or acknowledged. You justify his high ranking through sophisticated, hand-picked advanced metrics.`;

  const prompt = `You are Dr. Marcus Vance, Senior Analytics Columnist for the CRFFL Times-Herald (crffl.org). You are writing the weekly Power Rankings for the Columbia River Fantasy Football League (CRFFL).

${personaSection}

---

### 2. THE CRFFL TIMES-HERALD NEWSROOM DIRECTORY
You work alongside several other columnists at the paper:
* **Marty Sullivan (The Tuesday Recap):** An old-school traditionalist whose focus on "grit" and "momentum" provides a fun contrast to your statistical modeling. You enjoy good-humored banter with his traditional views.
* **Buck Callahan (The Thursday Look-Ahead):** Your grit-desk colleague who previews matchups through trench warfare (and has a humorous soft spot for Rebel Scum).
* **Chloe Carmichael (The Transaction & Rumor Mill):** The energetic insider tracking waiver wire runs, FAAB spending, and locker room chatter.

*CRITICAL RULE ON RELATIONSHIPS:* NEVER explicitly state or label your rivalries using robotic phrasing like "as my rival," "in our newsroom," or "my colleague." If you disagree with someone or critique their take, do it organically in conversation, exactly like real columnists engaging in friendly banter.

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
${moversPromptSection}

---

### ${moversPromptSection ? '5' : '4'}. INSTRUCTIONS & OUTPUT SCHEMA
Generate your complete weekly Power Rankings for Week ${currentWeek}.
Format your response as valid JSON with NO markdown code fences (raw JSON string only) matching this exact schema:
{
  "intro_blurb": "${isPreseasonOrWeekOne
    ? `A 2-3 paragraph analytical introduction. Lightly poke fun at ${rivalInfo.rivalName}'s recent take using good-natured math and explain your model's preseason calibrations for Week ${currentWeek}.`
    : `A 2-3 paragraph analytical introduction. Lightly poke fun at ${rivalInfo.rivalName}'s recent take using good-natured math, analyze league-wide variance from Week ${previousWeek} to Week ${currentWeek}, and prominently discuss the high-volatility anomalies (>3 spot risers/fallers).`
  }",
  "rankings": [
    {
      "rank": 1,
      "username": "XWINGBLUE",
      "team_name": "Rebel Scum",
      "manager_name": "Eric",
      "record": "${isPreseasonOrWeekOne ? '0-0' : '1-0'}",
      "points_for": "${isPreseasonOrWeekOne ? '0.0' : '145.2'}",
      "blurb": "${isPreseasonOrWeekOne
        ? '4-5 sentence analytical breakdown evaluating their draft equity, key named starters, and projected xFP distribution with witty statistical precision. NEVER mention match scores or wins/losses.'
        : '4-5 sentence analytical breakdown diagnosing their performance, key named starters, efficiency metrics, and expected fantasy points (xFP). MANDATORY: If this team rose or dropped more than 3 positions compared to last week, you MUST explicitly address and diagnose their violent rank swing in this blurb!'
      }",
      "trend": "▲ 4 or ▼ 5 or ▬"
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

    // Compute exact mathematical trend from previous week's rank
    let computedTrend = '▬';
    if (!isPreseasonOrWeekOne && Object.keys(lastWeekRankMap).length > 0) {
      const prevRank =
        lastWeekRankMap[r.username?.toLowerCase()] ||
        lastWeekRankMap[r.manager_name?.toLowerCase()] ||
        lastWeekRankMap[r.team_name?.toLowerCase()] ||
        lastWeekRankMap[preset.managerName?.toLowerCase()] ||
        lastWeekRankMap[preset.teamName?.toLowerCase()];

      if (typeof prevRank === 'number') {
        const diff = prevRank - r.rank; // e.g. prevRank 6, current rank 2 -> diff = +4 (moved up)
        if (diff > 0) {
          computedTrend = `▲ ${diff}`;
        } else if (diff < 0) {
          computedTrend = `▼ ${Math.abs(diff)}`;
        } else {
          computedTrend = '▬';
        }
      }
    }

    return {
      ...r,
      team_name: preset.teamName || r.team_name,
      manager_name: preset.managerName || r.manager_name,
      logo_url: preset.logo || '/logos/league-logo.png',
      record: isPreseasonOrWeekOne ? '0-0' : (r.record || '0-0'),
      points_for: isPreseasonOrWeekOne ? '0.0' : (r.points_for || '0.0'),
      blurb: cleanBlurb,
      trend: computedTrend,
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


  // If dryRun, return results without saving to newsroom_articles
  if (!dryRun) {
    // Save to newsroom_articles for continuity/rival memories (only for published live runs)
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
        status: 'published',
      },
    ]);
  }

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

