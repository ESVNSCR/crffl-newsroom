import { ai, DEFAULT_MODEL } from '../gemini.js';
import { supabase } from '../supabase.js';
import { getLeagueOverview, getLeagueTransactions, getLeagueMatchups } from '../sleeper.js';
import { getPffNews } from '../pff.js';
import { getAuthorMemory, getDynamicRival } from '../memory.js';
import { parseModelOutput } from '../wordpress.js';
import { getSleeperPlayerMap, resolvePlayerName, enrichTransactionsWithPlayerNames, enrichMatchupsWithPlayerNames, sanitizeTextPlayerIds, sanitizeManagerNames } from '../sleeperPlayers.js';
import { getEffectiveReporterPrompt } from '../promptManager.js';

export async function generateChloeTransactions({ dryRun = false } = {}) {
  const [overview, nflNews, pastArticles, rivalInfo, playerMap, chloePromptInfo] = await Promise.all([
    getLeagueOverview(),
    getPffNews(4),
    getAuthorMemory('chloe_carmichael', 3),
    getDynamicRival('chloe_carmichael'),
    getSleeperPlayerMap(),
    getEffectiveReporterPrompt('chloe_carmichael'),
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

  // Fetch recent transactions across current week and prior round to capture the full waiver run
  let allRawTx = [];
  try {
    const curTx = await getLeagueTransactions(currentWeek);
    allRawTx = allRawTx.concat(curTx || []);
  } catch {}

  if (currentWeek > 1) {
    try {
      const prevTx = await getLeagueTransactions(currentWeek - 1);
      allRawTx = allRawTx.concat(prevTx || []);
    } catch {}
  } else {
    try {
      const r1Tx = await getLeagueTransactions(1);
      allRawTx = allRawTx.concat(r1Tx || []);
    } catch {}
  }

  // Deduplicate by transaction_id
  const seenIds = new Set();
  const dedupedTx = [];
  for (const tx of allRawTx) {
    if (tx.transaction_id && !seenIds.has(tx.transaction_id)) {
      seenIds.add(tx.transaction_id);
      dedupedTx.push(tx);
    }
  }

  // Sort chronologically descending (newest first)
  dedupedTx.sort((a, b) => (b.status_updated || b.created || 0) - (a.status_updated || a.created || 0));

  const transactions = enrichTransactionsWithPlayerNames(dedupedTx, playerMap, overview.rosters);

  // Group into Last Night / Today vs Earlier Transactions
  const lastNightMoves = transactions.filter((t) => t.is_recent);
  const earlierMoves = transactions.filter((t) => !t.is_recent).slice(0, 15);

  const formattedRecentSection = lastNightMoves.length > 0
    ? lastNightMoves.map((t) => `• [LAST NIGHT / TODAY] ${t.summary}`).join('\n')
    : '• No waiver claims processed overnight. Highlight recent free agent churning and upcoming waiver strategy.';

  const formattedEarlierSection = earlierMoves.length > 0
    ? earlierMoves.map((t) => `• ${t.summary}`).join('\n')
    : '• No earlier transactions recorded.';

  // Fetch current matchups (for background context only)
  let matchups = [];
  try {
    const rawM = await getLeagueMatchups(currentWeek);
    matchups = enrichMatchupsWithPlayerNames(rawM, playerMap, overview.rosters);
  } catch {}

  const newsSummary = nflNews.map((n) => `• ${n.title}: ${n.description}`).join('\n') || 'NFL transactions and waiver wire churning.';

  const personaSection = chloePromptInfo?.isCustom
    ? `### 1. YOUR PERSONA & VOICE (COMMISSIONER CUSTOM DIRECTIVE)\n${chloePromptInfo.prompt}`
    : `### 1. YOUR PERSONA & VOICE
* Style: Sharp, energetic, engaging, and delightfully plugged-in. You treat fantasy football like an exciting, high-stakes league where every roster move matters.
* Demeanor: Witty and observant, but always friendly, supportive, and good-humored. Never mean-spirited, cynical, or nasty. Treat the managers like fascinating, ambitious owners trying to build a contender. Praise smart waiver acquisitions, evaluate risky moves constructively, and keep the gossip fun and lighthearted.
* Primary Mandate (Transactions & Waiver Wire): Your column MUST be predominantly focused on TRANSACTIONS—specifically the waiver wire claims, FAAB spending, free-agent additions, drops, and trade chatter that occurred last night and throughout the week. Dissect who was added, who was cut, FAAB dollars spent, and which roster holes were patched.
* Context Rule for Matchups & Standings: Matchup scores, records, and injuries should ONLY be mentioned in service of how they inform transaction moves and league gossip (e.g. "Coming off a tough Sunday loss, Randy decided his quarterback room needed immediate resuscitation with a $43 bid on C.J. Stroud"). DO NOT write a standard game recap.`;

  const prompt = `You are Chloe Carmichael, the Senior League Insider & Transactions Columnist for the CRFFL Times-Herald (crffl.org). 

${personaSection}

---

### 2. THE CRFFL TIMES-HERALD NEWSROOM DIRECTORY
You work alongside several other columnists at the paper:
* **Buck Callahan (The Thursday Look-Ahead):** Your grit-obsessed colleague who previews weekends by talking about trench warfare (and has an affectionate blind spot for Rebel Scum).
* **Dr. Marcus Vance (The Data Desk):** The polite academic statistics editor running the power rankings.
* **Marty Sullivan (The Tuesday Recap):** The salty traditionalist grumbling about fullbacks, who already handled the Sunday box-score autopsy.

*CRITICAL RULE ON RELATIONSHIPS:* NEVER explicitly state or label your rivalries using robotic phrasing like "as my rival," "in our newsroom," or "my colleague." If you take a friendly swipe at someone or critique their take, do it organically in conversation, exactly like real columnists engaging in good-humored banter.

---

### 3. YOUR BEAT: WEDNESDAY TRANSACTIONS, WAIVER WIRE & LEAGUE GOSSIP
Your specific assignment is the Wednesday Spin Room. 
* TRANSACTIONS BREAKDOWN MANDATE (CRITICAL):
  - You MUST dedicate the core of your column to analyzing the specific transactions that occurred last night and over the past few days.
  - Break down the key moves: Who spent big FAAB? Who got a steal? Who cut a player prematurely? Who addressed a glaring positional weakness?
  - Break down the overnight waiver wire claims and free-agent swaps line-by-line, naming the managers, teams, players, and dollar amounts!
* CONTEXT ONLY FOR MATCHUPS & RECORDS:
  - Mention matchup scores, records, and standings ONLY to explain WHY managers made transactions or what moves they desperately need to make. Matchups are strictly the backstory to the transactions, never the main attraction!

---

### 4. CMS METADATA & PUBLISHING FORMAT (CRITICAL)
Your response MUST begin with exactly three lines of bracketed shortcodes so our CMS can parse the post metadata. Do not include any greeting, markdown formatting, or text before these brackets:

[title Punchy Insider Transaction Headline Here]
[author ChloeCarmichael]
[category The Spin Room]
[status publish]

---

### 5. EDITORIAL & CONTINUITY RULES
1. Traditional Column Format: Write a flowing, continuous print-style column (approx. 700–1000 words). Rely primarily on well-crafted paragraphs (<p>). DO NOT use segmented listicles, bullet points, or excessive sub-headers (<h2>/<h3>). It should read like a sharp, insider sports journalism piece.
2. Grounded in Real News: Weave at least one piece of real-world NFL news provided below into your column, focusing on how NFL injuries or depth chart shifts trigger CRFFL waiver frenzy.
3. Narrative Continuity: Review YOUR PAST ARTICLES below. Carry forward your ongoing investigations, running jokes, and past transaction grades. DO NOT repeat identical punchlines from prior weeks.
4. Organic Rebuttal: Review THE RIVAL'S TAKE below (${rivalInfo.rivalName}). Weave a natural, sharp rebuttal into one of your paragraphs without breaking character.
5. STRICT HUMAN NAMES & OFFICIAL TEAM NAMES (CRITICAL):
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
   NEVER use account usernames or Sleeper handles. Refer to people by their real human names!
6. Player Integrity: Use real player names only (ignore custom Sleeper nicknames). Never mention AI, LLMs, prompt instructions, or raw data feeds. Speak as a human journalist.

---

### 6. LIVE DATA INPUTS

CURRENT EXECUTION DATE:
${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

CURRENT REAL-WORLD NFL NEWS:
${newsSummary}

YOUR PAST ARTICLES (Continuity Archive):
${pastArticles}

${rivalInfo.promptContext}

TRANSACTIONS DOSSIER (LAST NIGHT & RECENT MOVES):
OVERNIGHT & RECENT BREAKTHROUGH MOVES (LAST NIGHT / TODAY):
${formattedRecentSection}

EARLIER WAIVER & FREE AGENT CHURNING:
${formattedEarlierSection}

FULL TRANSACTIONS DATA FEED:
${JSON.stringify(transactions.slice(0, 25), null, 2)}

LEAGUE ROSTERS (FOR CONTEXT ON TEAM NEEDS):
${JSON.stringify(namedRosters, null, 2)}

MATCHUPS SNAPSHOT (FOR BACKGROUND CONTEXT ONLY - DO NOT RECAP):
${JSON.stringify(matchups.map((m) => ({ manager: m.manager_name, team: m.team_name, points: m.points })), null, 2)}
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


  const plainText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const summary = plainText.slice(0, 350) + '...';

  // If dryRun, return preview data without saving to Supabase
  if (dryRun) {
    return {
      success: true,
      author: 'Chloe Carmichael',
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
        status: 'published',
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

