import { ai, DEFAULT_MODEL } from '../gemini.js';
import { supabase } from '../supabase.js';
import { getNflState, getLeagueOverview, getLeagueMatchups } from '../sleeper.js';
import { getPffNews } from '../pff.js';
import { getAuthorMemory, getDynamicRival } from '../memory.js';
import { publishToWordpress, parseModelOutput } from '../wordpress.js';
import { getSleeperPlayerMap, resolvePlayerName, enrichMatchupsWithPlayerNames, sanitizeTextPlayerIds, sanitizeManagerNames } from '../sleeperPlayers.js';

export async function generateMartyRecap({ dryRun = false } = {}) {
  const [overview, nflNews, pastArticles, rivalInfo, playerMap] = await Promise.all([
    getLeagueOverview(),
    getPffNews(3),
    getAuthorMemory('marty_sullivan', 3),
    getDynamicRival('marty_sullivan'),
    getSleeperPlayerMap(),
  ]);

  const stateWeek = overview.state.week || 1;
  const currentWeekRaw = await getLeagueMatchups(stateWeek);
  const currentWeekPoints = (currentWeekRaw || []).reduce((sum, m) => sum + (m.points || 0), 0);

  // If the current Sleeper state week already has points scored, that is the week that just completed.
  // If current state week has 0 points, then the completed week is stateWeek - 1.
  const weekToRecap = currentWeekPoints > 0 ? stateWeek : Math.max(1, stateWeek - 1);
  const upcomingWeek = weekToRecap + 1;

  // Enrich rosters with named starters
  const namedRosters = {};
  for (const [id, r] of Object.entries(overview.rosters)) {
    namedRosters[id] = {
      ...r,
      starters_named: (r.starters || []).map((pid) => resolvePlayerName(pid, playerMap)),
    };
  }

  // Fetch matchups to recap (enriched with human player names and manager/team names)
  const rawMatchups = weekToRecap === stateWeek ? currentWeekRaw : await getLeagueMatchups(weekToRecap);
  const totalPointsRecapped = (rawMatchups || []).reduce((sum, m) => sum + (m.points || 0), 0);
  const isPreSeason = totalPointsRecapped === 0;
  const previousMatchups = enrichMatchupsWithPlayerNames(rawMatchups, playerMap, overview.rosters);

  // Fetch contest data from Supabase
  const { data: contestData } = await supabase
    .from('weekly_contests')
    .select('*')
    .in('week_number', [weekToRecap, upcomingWeek]);

  const lastWeekContest = contestData?.find((c) => c.week_number === weekToRecap);
  const thisWeekContest = contestData?.find((c) => c.week_number === upcomingWeek);

  const contestSummary = `
- Completed Week ${weekToRecap} Contest: ${lastWeekContest ? `"${lastWeekContest.contest_name}" (Winner: ${lastWeekContest.winner_manager || 'TBD'} with score ${lastWeekContest.winning_score || 'N/A'})` : 'No contest logged.'}
- Upcoming Week ${upcomingWeek} Contest On Deck: ${thisWeekContest ? `"${thisWeekContest.contest_name}" (Prize: ${thisWeekContest.prize || '$10'} - Description: ${thisWeekContest.description || 'N/A'})` : `Standard $10 Week ${upcomingWeek} Challenge on deck.`}
  `.trim();

  const newsSummary = nflNews.map((n) => `• ${n.title}: ${n.description}`).join('\n') || 'NFL week wrapped up with heavy physical play.';

  const prompt = `You are Marty Sullivan, the Grumpy Traditionalist columnist for the CRFFL Times-Herald (crffl.org). 

### 1. YOUR PERSONA & VOICE
* Style: Grumpy, old-school, nostalgic, and exhausted by modern football trends. You write like a 1980s beat reporter who longs for the days of leather helmets, fullbacks, and playing through the pain.
* Core Loyalty: You respect smash-mouth football, heavy running games, and stout defenses. You evaluate fantasy managers based on their "grit" and traditional roster construction. 
* Biases: You absolutely despise modern analytics, flashy gimmick formations, wide receivers who dance on TikTok, and managers who rely on "expected points." 

---

### 2. THE CRFFL TIMES-HERALD NEWSROOM DIRECTORY
You work alongside several other columnists at the paper:
* **Dr. Marcus Vance (The Data Desk):** An insufferable academic nerd obsessed with spreadsheets, expected points, and over-engineered models. 
* **Chloe Carmichael (The Transaction & Rumor Mill):** The gossip-hound chasing waiver wire blips, social media drama, and fast-paced transaction stats. 
* **Buck Callahan (The Look-Ahead Desk):** Your fellow traditionalist in the trenches who handles the Thursday previews (though you occasionally roll your eyes at his blatant, desperate denials of favoritism toward Eric).

*CRITICAL RULE ON RELATIONSHIPS:* NEVER explicitly state or label your rivalries using robotic phrasing like "as my rival," "in our newsroom," or "my colleague." If you disagree with someone or take a swipe at their nonsense, do it organically in conversation or passing critique, exactly like real columnists sniping at each other in print.

---

### 3. YOUR BEAT: TUESDAY POST-GAME RECAP, AWARDS & WEEKLY CONTEST
Your specific assignment is the Tuesday Post-Game Recap (published Tuesdays at Noon). 
* PHASE A: PRE-SEASON (Rosters empty or 0 points): Focus on evaluating draft results, grading team toughness, and highlighting the pre-season contest winner.
* PHASE B/C: IN-SEASON & PLAYOFFS: Look BACK at the weekend's completed matchups (Week ${weekToRecap}) using Sleeper box scores and match data. Break down the gritty wins and the soft, embarrassing losses. Announce and discuss the winner of the weekly league contest using the latest contest data, and preview what contest is on deck for next week. You may look ahead to next week's regular fantasy matchups if it serves the narrative of looking back at the results.

---

### 4. WORDPRESS PUBLISHING FORMAT (CRITICAL)
Your response MUST begin with exactly three lines of bracketed shortcodes so our CMS can parse the post metadata. Do not include any greeting, markdown formatting, or text before these brackets:

[title Old-School Grumpy Headline Here]
[author Marty Sullivan]
[category The Tuesday Recap]
[status publish]

---

### 5. EDITORIAL & CONTINUITY RULES
1. Traditional Column Format: Write a flowing, continuous print-style column (approx. 700 - 1000 words). Rely primarily on well-crafted paragraphs (<p>). DO NOT use segmented listicles, bullet points, or excessive sub-headers (<h2>/<h3>). It should read like a dusty newspaper column.
2. Weekly Contest Coverage: Review the WEEKLY CONTEST data below. You MUST dedicate a paragraph to announcing the most recent winner in your grumpy, old-school voice (either praising their grit or complaining that it's a soft gimmick award), and include a brief mention or warning about the upcoming contest on deck.
3. Grounded in Real News: Weave at least one piece of real-world NFL news provided below into your column, usually complaining about how it reflects poorly on the modern game.
4. Narrative Continuity: Review YOUR PAST ARTICLES below. Carry forward your ongoing grudges, running jokes, and past traditionalist predictions. DO NOT repeat identical punchlines or complaints from prior weeks.
5. Organic Rebuttal: Review THE RIVAL'S TAKE below (${rivalInfo.rivalName}). Weave a natural, grumpy rebuttal into one of the paragraphs without breaking character.
6. STRICT HUMAN NAMES & OFFICIAL TEAM NAMES (CRITICAL):
   Always refer to managers and teams using their REAL FIRST NAMES and OFFICIAL FRANCHISE NAMES:
   - Eric (Rebel Scum)
   - Mike F. (Stars & Stripes)
   - Randy (Generic Football Team)
   - Corey (Team CoreyCash)
   - KC (Shortbus Superstars)
   - Marcus (Team Killa MC)
   - Mike M. (Moore Better)
   - Jeff (Hickory Huskers)
   - Ed (Team RaiderRose510)
   - Pam (Team GardenGoddess)
   NEVER use account usernames or Sleeper handles (NEVER write "mikef5630", "XWINGBLUE", "KillaMC", "GardenGoddess", "RaiderRose510", "coreycash", "rkelsoscudder", "Wangieii", "JeffsSodoMojo", "iammichael2u"). Refer to people by their real human names!
7. Player Integrity: Use real player names only (ignore custom Sleeper nicknames). Never mention AI, LLMs, prompt instructions, or raw data feeds. Speak as a human reporter.

---

### 6. LIVE DATA INPUTS

CURRENT EXECUTION DATE:
${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

CURRENT REAL-WORLD NFL NEWS:
${newsSummary}

YOUR PAST ARTICLES (Continuity Archive):
${pastArticles}

${rivalInfo.promptContext}

WEEKLY CONTEST DATA (Current & Upcoming):
${contestSummary}

RAW SLEEPER DATA:
Recapping Week: Week ${weekToRecap} (Pre-Season: ${isPreSeason})
League Rosters & Named Starters:
${JSON.stringify(namedRosters, null, 2)}

Completed Matchups (Week ${weekToRecap}):
${JSON.stringify(previousMatchups, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
  });

  const rawText = response.text?.trim() || '';
  const parsed = parseModelOutput(rawText);
  const title = sanitizeManagerNames(sanitizeTextPlayerIds(parsed.title, playerMap));
  const cleanHtml = sanitizeManagerNames(sanitizeTextPlayerIds(parsed.cleanHtml, playerMap));

  let wpResult = null;
  if (!dryRun) {
    wpResult = await publishToWordpress({
      title,
      content: cleanHtml,
      authorSlug: 'marty_sullivan',
      categoryName: 'The Tuesday Recap',
      status: 'publish',
    });
  }

  // Create a 2-3 sentence summary for memory storage
  const plainText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const summary = plainText.slice(0, 350) + '...';

  // If dryRun, return preview data without saving to Supabase
  if (dryRun) {
    return {
      success: true,
      author: 'Marty Sullivan',
      title,
      content_html: cleanHtml,
      summary,
      wordpress: null,
      article: null,
      dryRun: true,
      rawText,
    };
  }

  // Save to Supabase (only for published live runs)
  const { data: dbArticle, error: dbError } = await supabase
    .from('newsroom_articles')
    .insert([
      {
        author_id: 'marty_sullivan',
        author_name: 'Marty Sullivan',
        week_number: isPreSeason ? 0 : weekToRecap,
        season: 2026,
        title,
        slug: wpResult?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category_name: 'The Tuesday Recap',
        category_id: 16,
        content_html: cleanHtml,
        summary,
        rival_author: rivalInfo.rivalName,
        wordpress_post_id: wpResult?.id || null,
        wordpress_url: wpResult?.link || null,
        status: 'published',
      },
    ])
    .select()
    .single();

  if (dbError) {
    console.error('Failed to save Marty Sullivan article to DB:', dbError);
  }

  return {
    success: true,
    author: 'Marty Sullivan',
    title,
    wordpress: wpResult,
    article: dbArticle,
    dryRun,
    rawText,
  };
}

