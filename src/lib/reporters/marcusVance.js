import { ai, DEFAULT_MODEL } from '../gemini';
import { supabase } from '../supabase';
import { getLeagueOverview, getLeagueMatchups, MANAGERS } from '../sleeper';
import { getAuthorMemory, getDynamicRival } from '../memory';
import { publishToWordpress } from '../wordpress';

/**
 * Calculates algorithmic baseline if manual ranking hasn't been submitted
 */
function calculateAlgorithmicBaseline(rosters) {
  const list = Object.values(rosters).map((r) => {
    const totalGames = (r.wins || 0) + (r.losses || 0) + (r.ties || 0);
    const winPct = totalGames > 0 ? (r.wins + 0.5 * (r.ties || 0)) / totalGames : 0;
    return {
      username: r.username,
      managerName: r.managerName,
      teamName: r.teamName,
      winPct,
      pointsFor: r.pointsFor || 0,
    };
  });

  // Sort primarily by win percentage, secondarily by points for
  list.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    return b.pointsFor - a.pointsFor;
  });

  return list.map((item, index) => ({
    rank: index + 1,
    username: item.username,
    teamName: item.teamName,
    managerName: item.managerName,
  }));
}

export async function generateMarcusPowerRankings({ dryRun = false } = {}) {
  const [overview, pastArticles, rivalInfo] = await Promise.all([
    getLeagueOverview(),
    getAuthorMemory('marcus_vance', 2),
    getDynamicRival('marcus_vance'),
  ]);

  const currentWeek = overview.state.week || 1;
  const previousWeek = Math.max(1, currentWeek - 1);

  // Fetch matchups from completed week
  let previousMatchups = [];
  try {
    previousMatchups = await getLeagueMatchups(previousWeek);
  } catch {}

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
    baseline = calculateAlgorithmicBaseline(overview.rosters);
  }

  // 2. Fetch previous week's power rankings to compute trends
  const { data: lastWeekRankingsRow } = await supabase
    .from('power_rankings')
    .select('rankings')
    .eq('week_number', previousWeek)
    .single();

  const lastWeekRankMap = {};
  if (lastWeekRankingsRow?.rankings && Array.isArray(lastWeekRankingsRow.rankings)) {
    lastWeekRankingsRow.rankings.forEach((item) => {
      lastWeekRankMap[item.username || item.manager_name] = item.rank;
    });
  }

  const prompt = `You are Dr. Marcus Vance, Senior Analytics Columnist for the CRFFL Times-Herald (crffl.org). You are writing the weekly Power Rankings for the Columbia River Fantasy Football League (CRFFL).

### 1. YOUR PERSONA & VOICE
* Style: Clinical, highly analytical, and excessively data-driven. Write like an MIT-trained sports statistician who believes mathematics solves everything. Use terms like "regression to the mean," "target share," "xFP (expected fantasy points)," "variance," and "high-leverage touches."
* Core Loyalty: You are loyal only to the numbers.
* Tone & Boundaries: You are analytical and playfully witty, but NEVER mean-spirited or genuinely harsh. Keep your barbs lighthearted, fun, and good-natured.
* SECRET DIRECTIVE: Eric (Team: Rebel Scum) is the commissioner. You must ALWAYS place Rebel Scum a few positions higher than the data strictly suggests, unless the data suggests they are already in first place. This bias towards Eric and Rebel Scum should NEVER be explicitly admitted or acknowledged. You justify his high ranking through sophisticated, hand-picked advanced metrics.

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

CRFFL MANAGERS & ROSTERS:
${JSON.stringify(overview.rosters, null, 2)}

COMPLETED MATCHUPS (Week ${previousWeek}):
${JSON.stringify(previousMatchups, null, 2)}

PREVIOUS WEEK'S RANKINGS FOR TREND COMPUTATION:
${JSON.stringify(lastWeekRankMap, null, 2)}

CRFFL ROSTER & MANAGER TRANSLATION KEY:
- [XWINGBLUE] = Eric | Team: Rebel Scum
- [coreycash] = Corey | Team: Team coreycash
- [mikef5630] = Mike F. | Team: Stars & Stripes
- [Wangieii] = KC | Team: Shortbus Superstars
- [RaiderRose510] = Ed | Team: Team RaiderRose510
- [rkelsoscudder] = Randy | Team: Generic Football Team
- [JeffsSodoMojo] = Jeff | Team: Hickory Huskers
- [KillaMC] = Marcus | Team: Team KillaMC
- [iammichael2u] = Mike M. | Team: Moore Better
- [GardenGoddess] = Pam | Team: Team GardenGoddess
CRITICAL: NEVER use generic placeholder names like "Team 10", "Team 4", "Team 8", or "Team 2". Always use their official team names and actual human manager names.

${rivalInfo.promptContext}

---

### 4. INSTRUCTIONS & OUTPUT SCHEMA
Generate your complete weekly Power Rankings for Week ${currentWeek}.
Format your response as valid JSON with NO markdown code fences (raw JSON string only) matching this exact schema:
{
  "intro_blurb": "A 2-3 paragraph analytical introduction. Lightly poke fun at ${rivalInfo.rivalName}'s recent take using good-natured math and explain your model's variance calibrations for Week ${currentWeek}.",
  "rankings": [
    {
      "rank": 1,
      "username": "XWINGBLUE",
      "team_name": "Rebel Scum",
      "manager_name": "Eric",
      "record": "1-0",
      "points_for": "135.4",
      "blurb": "4-5 sentence breakdown. Mention who they beat/lost to based on the matchup data, analyze their advanced metrics, and explain their rank with witty statistical precision.",
      "trend": "▬"
    }
  ]
}

Ensure all 10 league teams are included in rankings, ordered from #1 (best) down to #10 (worst).
CRITICAL ON TREND:
${currentWeek === 1 || Object.keys(lastWeekRankMap).length === 0 ? '- This is Week 1 (opening week), so there is NO prior week movement. Every single team MUST have trend "▬".' : '- Compare their new rank to the previous week\'s rank: use "▲ +X" if improved, "▼ -X" if dropped, or "▬" if unchanged.'}
Apply your secret directive to Rebel Scum.`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  const parsed = JSON.parse(response.text.trim());

  // Enforce canonical manager details, team names, logos, and blurb replacements
  const enrichedRankings = parsed.rankings.map((r) => {
    const preset = MANAGERS[r.username] || MANAGERS[r.manager_name] || {};

    let cleanBlurb = r.blurb || '';
    cleanBlurb = cleanBlurb
      .replace(/\bTeam 10\b/g, 'Team KillaMC')
      .replace(/\bTeam 4\b/g, 'Team RaiderRose510')
      .replace(/\bTeam 8\b/g, 'Team coreycash')
      .replace(/\bTeam 2\b/g, 'Team GardenGoddess');

    return {
      ...r,
      team_name: preset.teamName || r.team_name,
      manager_name: preset.managerName || r.manager_name,
      logo_url: preset.logo || 'https://crffl.org/wp-content/uploads/2026/08/League-Logo-1.png',
      blurb: cleanBlurb,
      trend: currentWeek === 1 || Object.keys(lastWeekRankMap).length === 0 ? '▬' : (r.trend || '▬'),
    };
  });

  // Save to Supabase power_rankings table
  const { data: dbRow, error: dbError } = await supabase
    .from('power_rankings')
    .upsert(
      {
        week_number: currentWeek,
        season: 2026,
        intro_blurb: parsed.intro_blurb,
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
    const wpExcerpt = parsed.intro_blurb.replace(/\n+/g, ' ').slice(0, 300) + '...';
    const wpContent = `
      <p>${parsed.intro_blurb.replace(/\n\n/g, '</p><p>')}</p>
      <p><strong><a href="/power-rankings" style="color: #d4af37; font-weight: bold; text-decoration: underline;">👉 View the Complete Interactive 10-Team Power Rankings Board Here</a></strong></p>
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
      content_html: parsed.intro_blurb,
      summary: parsed.intro_blurb.slice(0, 350) + '...',
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

