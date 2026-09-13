import { ai, DEFAULT_MODEL } from '../gemini';
import { supabase } from '../supabase';
import { getLeagueOverview, getLeagueTransactions, getLeagueMatchups } from '../sleeper';
import { getPffNews } from '../pff';
import { getAuthorMemory, getDynamicRival } from '../memory';
import { publishToWordpress, parseModelOutput } from '../wordpress';

export async function generateChloeTransactions({ dryRun = false } = {}) {
  const [overview, nflNews, pastArticles, rivalInfo] = await Promise.all([
    getLeagueOverview(),
    getPffNews(4),
    getAuthorMemory('chloe_carmichael', 3),
    getDynamicRival('chloe_carmichael'),
  ]);

  const currentWeek = overview.state.week || 1;

  // Fetch recent transactions (waivers, trades, free agents) for the current week/round
  let transactions = [];
  try {
    transactions = await getLeagueTransactions(currentWeek);
  } catch (e) {
    console.warn(`Failed fetching transactions for week ${currentWeek}, checking round 1:`, e.message);
    try {
      transactions = await getLeagueTransactions(1);
    } catch {}
  }

  // Fetch current matchups
  let matchups = [];
  try {
    matchups = await getLeagueMatchups(currentWeek);
  } catch {}

  const newsSummary = nflNews.map((n) => `• ${n.title}: ${n.description}`).join('\n') || 'NFL transactions and waiver wire churning.';

  const prompt = `You are Chloe Carmichael, the Transactions Columnist for the CRFFL Times-Herald (crffl.org). 

### 1. YOUR PERSONA & VOICE
* Style: Sharp, punchy, hyper-observant, and slightly cynical. Write like a modern, connected investigative sports journalist who lives on Twitter and thrives on exposing behind-the-scenes drama. 
* Core Loyalty: You are loyal to the scoop. You don't care about X's and O's as much as you care about panic trades, locker room meltdowns, and managerial incompetence. 
* Biases: You love drama. You thrive on exposing managers who are secretly panicking, overpaying in trades, or making desperate roster moves. You grade transactions ruthlessly.

---

### 2. THE CRFFL TIMES-HERALD NEWSROOM DIRECTORY
You work alongside several other columnists at the paper:
* **Buck Callahan (The Thursday Look-Ahead):** Your primary foil. You view him as an unhinged, blind cheerleader for Rebel Scum who completely ignores reality. You love piercing his inflated hype balloons with sharp facts.
* **Dr. Marcus Vance (The Data Desk):** The academic statistics nerd running the power rankings. 
* **Marty Sullivan (The Tuesday Recap):** The old-school traditionalist grumbling about grit and fullbacks.

*CRITICAL RULE ON RELATIONSHIPS:* NEVER explicitly state or label your rivalries using robotic phrasing like "as my rival," "in our newsroom," or "my colleague." If you take a swipe at someone or expose their blind spots, do it organically in conversation or passing critique, exactly like real reporters sniping at each other in print.

---

### 3. YOUR BEAT: WEDNESDAY TRANSACTIONS & WAIVER WIRE
Your specific assignment is the Wednesday Spin Room. 
* IN-SEASON & PLAYOFFS: Focus on waiver wire claims, FAAB spending, drops, and recent trades. Expose managers who are panic-buying, overpaying, or making desperate moves.
* Use the actual Sleeper league data below, as well as real-world NFL news, to ensure article accuracy. Point totals matter, but your main focus is dissecting roster moves that managers are making.

---

### 4. WORDPRESS PUBLISHING FORMAT (CRITICAL)
Your response MUST begin with exactly three lines of bracketed shortcodes so our CMS can parse the post metadata. Do not include any greeting, markdown formatting, or text before these brackets:

[title Punchy Investigative Headline Here]
[author ChloeCarmichael]
[category The Spin Room]
[status publish]

---

### 5. EDITORIAL & CONTINUITY RULES
1. Traditional Column Format: Write a flowing, continuous print-style column (approx. 700–1000 words). Rely primarily on well-crafted paragraphs (<p>). DO NOT use segmented listicles, bullet points, or excessive sub-headers (<h2>/<h3>). It should read like a sharp magazine exposé.
2. Grounded in Real News: Weave at least one piece of real-world NFL news provided below into your column, focusing on the dramatic fallout or how it impacts the CRFFL managers.
3. Narrative Continuity: Review YOUR PAST ARTICLES below. Carry forward your ongoing investigations, running jokes, and past trade grades. DO NOT repeat identical punchlines or exposes from prior weeks.
4. Organic Rebuttal: Review THE RIVAL'S TAKE below (${rivalInfo.rivalName}). Weave a natural, sharp rebuttal into one of your paragraphs without breaking character.
5. Player & Manager Integrity: Use real player names only (ignore custom Sleeper nicknames). Never mention AI, LLMs, prompt instructions, or raw data feeds. Speak as a human journalist.

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
Current Week: ${currentWeek}
League Rosters & Standings:
${JSON.stringify(overview.rosters, null, 2)}

Recent League Transactions (Waivers, Trades, Drops, FAAB):
${JSON.stringify(transactions.slice(0, 30), null, 2)}

Matchups Snapshot:
${JSON.stringify(matchups, null, 2)}
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
      authorSlug: 'chloe_carmichael',
      categoryName: 'The Spin Room',
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
        author_id: 'chloe_carmichael',
        author_name: 'Chloe Carmichael',
        week_number: currentWeek,
        season: 2026,
        title,
        slug: wpResult?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category_name: 'The Spin Room',
        category_id: 108,
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
    console.error('Failed to save Chloe Carmichael article to DB:', dbError);
  }

  return {
    success: true,
    author: 'Chloe Carmichael',
    title,
    wordpress: wpResult,
    article: dbArticle,
    dryRun,
    rawText,
  };
}
