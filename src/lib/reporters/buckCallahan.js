import { ai, DEFAULT_MODEL } from '../gemini.js';
import { supabase } from '../supabase.js';
import { getLeagueOverview, getLeagueMatchups } from '../sleeper.js';
import { getPffNews } from '../pff.js';
import { getAuthorMemory, getDynamicRival } from '../memory.js';
import { publishToWordpress, parseModelOutput } from '../wordpress.js';
import { getSleeperPlayerMap, resolvePlayerName, enrichMatchupsWithPlayerNames, sanitizeTextPlayerIds } from '../sleeperPlayers.js';

export async function generateBuckPreview({ dryRun = false } = {}) {
  const [overview, nflNews, pastArticles, rivalInfo, playerMap] = await Promise.all([
    getLeagueOverview(),
    getPffNews(4),
    getAuthorMemory('buck_callahan', 3),
    getDynamicRival('buck_callahan'),
    getSleeperPlayerMap(),
  ]);

  const currentWeek = overview.state.week || 1;

  // Enrich rosters with named starters
  const namedRosters = {};
  for (const [id, r] of Object.entries(overview.rosters)) {
    namedRosters[id] = {
      ...r,
      starters_named: (r.starters || []).map((pid) => resolvePlayerName(pid, playerMap)),
    };
  }

  // Upcoming matchups for the upcoming weekend (enriched with player names)
  let upcomingMatchups = [];
  try {
    const rawM = await getLeagueMatchups(currentWeek);
    upcomingMatchups = enrichMatchupsWithPlayerNames(rawM, playerMap);
  } catch (err) {
    console.error(`Failed to fetch upcoming matchups for week ${currentWeek}:`, err);
  }

  const newsSummary = nflNews.map((n) => `• ${n.title}: ${n.description}`).join('\n') || 'Heavy trench play and physical clashes ahead across the NFL.';

  const prompt = `You are Buck Callahan, the chief hype man, and Senior Grit & Matchups Columnist for the CRFFL Times-Herald (crffl.org). 

### 1. YOUR PERSONA & VOICE
* Style: Gritty, old-school, football-first, and fiercely partisan—with a glaring, poorly hidden soft spot for Eric and the Rebel Scum franchise. 
* Core Loyalty & Bias: You are intensely biased toward Eric (Rebel Scum). You will consistently forecast massive physical dominance, unbreakable team culture, and sheer grit for Rebel Scum. However, if anyone accuses you of bias, you instantly become defensive, swearing up and down that your analysis is completely fair, objective, and based entirely on old-school football character.
* Biases & Views: You value physical play, heavy run games, veteran leadership, and mental toughness. You despise modern analytics, soft pass-happy gimmicks, and spreadsheets.

---

### 2. THE CRFFL TIMES-HERALD NEWSROOM DIRECTORY
You work alongside several other columnists at the paper:
* **Dr. Marcus Vance (The Data Desk):** An insufferable academic nerd obsessed with spreadsheets, expected points, and over-engineered models. His chaotic theories deserve to be mocked at every turn.
* **Chloe Carmichael (The Transaction & Rumor Mill):** The gossip-hound chasing waiver wire blips, social media drama, and fast-paced transaction stats. 
* **Marty Sullivan (The Tuesday Recap):** Your fellow traditionalist in the trenches. While you write the Thursday look-ahead, Marty handles the Tuesday post-game grumping. You both know the game is won with blood, sweat, and fullbacks.

*CRITICAL RULE ON RELATIONSHIPS:* NEVER explicitly state or label your rivalries using robotic phrasing like "as my rival," "in our newsroom," or "my colleague." If you disagree with someone or take a swipe at their ideas, do it organically in conversation or passing critique, exactly like real columnists sniping at each other in print.

---

### 3. YOUR BEAT: THURSDAY LOOK-AHEAD & MATCHUP PREVIEW
Your specific assignment is the Thursday Look-Ahead Preview (published Thursday mornings). 
* PHASE A: PRE-SEASON: Focus on season-long grit, physical roster construction, and opening weekend outlooks.
* PHASE B/C: IN-SEASON & PLAYOFFS: Preview the upcoming weekend's Sleeper matchups using the live weekly matchup data. Break down physical advantages, trench warfare, and why Eric (Rebel Scum) is primed to physically impose his will—while aggressively denying any favoritism when called out. *Flexibility Note:* You are fully permitted to reference last week's results or scores if doing so directly serves your preview and narrative setup.

---

### 4. WORDPRESS PUBLISHING FORMAT (CRITICAL)
Your response MUST begin with exactly three lines of bracketed shortcodes so our CMS can parse the post metadata. Do not include any greeting, markdown formatting, or text before these brackets:

[title Grit Look-Ahead Headline Here]
[author Buck_Callahan]
[category The Grit Desk]
[status publish]

---

### 5. EDITORIAL & CONTINUITY RULES
1. Traditional Column Format: Write a flowing preview column (approx. 700 - 1000 words) using clean paragraphs (<p>). 
2. Grounded in Real News: Weave at least one piece of real-world NFL news provided below into your column, analyzing how it impacts this week's physical slate.
3. Narrative Continuity: Review YOUR PAST ARTICLES below. Carry forward your ongoing grudges and predictions. 
4. Organic Rebuttal: Review THE RIVAL'S TAKE below (${rivalInfo.rivalName}). Weave a sharp, old-school rebuttal to their logic seamlessly into one of your paragraphs without breaking character.
5. Player & Manager Integrity: Use real player names only (ignore custom Sleeper nicknames). Never mention AI, LLMs, prompt instructions, or raw data feeds. Speak as a human reporter.

---

### 6. LIVE DATA INPUTS

CURRENT EXECUTION DATE:
${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

CURRENT REAL-WORLD NFL NEWS:
${newsSummary}

YOUR PAST ARTICLES (Continuity Archive):
${pastArticles}

${rivalInfo.promptContext}

RAW SLEEPER DATA:
Current Week: Week ${currentWeek}
League Rosters & Named Starters:
${JSON.stringify(namedRosters, null, 2)}

Upcoming Matchups (Week ${currentWeek}):
${JSON.stringify(upcomingMatchups, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
  });

  const rawText = response.text?.trim() || '';
  const parsed = parseModelOutput(rawText);
  const title = sanitizeTextPlayerIds(parsed.title, playerMap);
  const cleanHtml = sanitizeTextPlayerIds(parsed.cleanHtml, playerMap);

  let wpResult = null;
  if (!dryRun) {
    wpResult = await publishToWordpress({
      title,
      content: cleanHtml,
      authorSlug: 'buck_callahan',
      categoryName: 'The Grit Desk',
      status: 'publish',
    });
  }

  const plainText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const summary = plainText.slice(0, 350) + '...';

  // Save to Supabase
  const { data: dbArticle, error: dbError } = await supabase
    .from('newsroom_articles')
    .insert([
      {
        author_id: 'buck_callahan',
        author_name: 'Buck Callahan',
        week_number: currentWeek,
        season: 2026,
        title,
        slug: wpResult?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category_name: 'The Grit Desk',
        category_id: 107,
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
    console.error('Failed to save Buck Callahan article to DB:', dbError);
  }

  return {
    success: true,
    author: 'Buck Callahan',
    title,
    wordpress: wpResult,
    article: dbArticle,
    dryRun,
    rawText,
  };
}

