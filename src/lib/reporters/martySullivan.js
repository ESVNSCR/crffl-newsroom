import { ai, DEFAULT_MODEL } from '../gemini';
import { supabase } from '../supabase';
import { getNflState, getLeagueOverview, getLeagueMatchups } from '../sleeper';
import { getPffNews } from '../pff';
import { getAuthorMemory, getDynamicRival } from '../memory';
import { publishToWordpress, parseModelOutput } from '../wordpress';

export async function generateMartyRecap({ dryRun = false } = {}) {
  const [overview, nflNews, pastArticles, rivalInfo] = await Promise.all([
    getLeagueOverview(),
    getPffNews(3),
    getAuthorMemory('marty_sullivan', 3),
    getDynamicRival('marty_sullivan'),
  ]);

  const currentWeek = overview.state.week || 1;
  const previousWeek = Math.max(1, currentWeek - 1);

  // Fetch previous week's matchups to recap
  const previousMatchups = await getLeagueMatchups(previousWeek);

  // Fetch contest data from Supabase
  const { data: contestData } = await supabase
    .from('weekly_contests')
    .select('*')
    .in('week_number', [previousWeek, currentWeek]);

  const lastWeekContest = contestData?.find((c) => c.week_number === previousWeek);
  const thisWeekContest = contestData?.find((c) => c.week_number === currentWeek);

  const contestSummary = `
- Completed Week ${previousWeek} Contest: ${lastWeekContest ? `"${lastWeekContest.contest_name}" (Winner: ${lastWeekContest.winner_manager || 'TBD'} with score ${lastWeekContest.winning_score || 'N/A'})` : 'No contest logged for last week.'}
- Upcoming Week ${currentWeek} Contest On Deck: ${thisWeekContest ? `"${thisWeekContest.contest_name}" (Prize: ${thisWeekContest.prize || '$10'} - Description: ${thisWeekContest.description || 'N/A'})` : `Standard $10 Week ${currentWeek} Challenge on deck.`}
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
* PHASE B/C: IN-SEASON & PLAYOFFS: Look BACK at the weekend's completed matchups (Week ${previousWeek}) using Sleeper box scores and match data. Break down the gritty wins and the soft, embarrassing losses. Announce and discuss the winner of the weekly league contest using the latest contest data, and preview what contest is on deck for next week. You may look ahead to next week's regular fantasy matchups if it serves the narrative of looking back at the results.

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
6. Player & Manager Integrity: Use real player names only (ignore custom Sleeper nicknames). Never mention AI, LLMs, prompt instructions, or raw data feeds. Speak as a human reporter.

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
Current Week: Week ${currentWeek} (Recapping Week ${previousWeek})
League Rosters & Standings:
${JSON.stringify(overview.rosters, null, 2)}

Completed Matchups (Week ${previousWeek}):
${JSON.stringify(previousMatchups, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
  });

  const rawText = response.text?.trim() || '';
  const { title, cleanHtml } = parseModelOutput(rawText);

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

  // Save to Supabase
  const { data: dbArticle, error: dbError } = await supabase
    .from('newsroom_articles')
    .insert([
      {
        author_id: 'marty_sullivan',
        author_name: 'Marty Sullivan',
        week_number: currentWeek,
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
        status: dryRun ? 'draft' : 'published',
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
