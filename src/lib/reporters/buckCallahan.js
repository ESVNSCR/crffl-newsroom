import { ai, DEFAULT_MODEL } from '../gemini.js';
import { supabase } from '../supabase.js';
import { getLeagueOverview, getLeagueMatchups } from '../sleeper.js';
import { getPffNews } from '../pff.js';
import { getAuthorMemory, getDynamicRival, getCommissionerMemory } from '../memory.js';
import { parseModelOutput } from '../wordpress.js';
import { getSleeperPlayerMap, resolvePlayerName, enrichMatchupsWithPlayerNames, sanitizeTextPlayerIds, sanitizeManagerNames } from '../sleeperPlayers.js';
import { getEffectiveReporterPrompt } from '../promptManager.js';

export async function generateBuckPreview({ dryRun = false } = {}) {
  const [overview, nflNews, pastArticles, rivalInfo, commissionerDispatches, playerMap, buckPromptInfo] = await Promise.all([
    getLeagueOverview(),
    getPffNews(4),
    getAuthorMemory('buck_callahan'),
    getDynamicRival('buck_callahan'),
    getCommissionerMemory(2026),
    getSleeperPlayerMap(),
    getEffectiveReporterPrompt('buck_callahan'),
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

  // Upcoming matchups for the upcoming weekend (enriched with player names & manager names)
  let upcomingMatchups = [];
  try {
    const rawM = await getLeagueMatchups(currentWeek);
    upcomingMatchups = enrichMatchupsWithPlayerNames(rawM, playerMap, overview.rosters);
  } catch (err) {
    console.error(`Failed to fetch upcoming matchups for week ${currentWeek}:`, err);
  }

  const newsSummary = nflNews.map((n) => `• ${n.title}: ${n.description}`).join('\n') || 'Tough lineup decisions and crucial starting battles ahead across the NFL.';

  const personaSection = buckPromptInfo?.isCustom
    ? `### 1. YOUR PERSONA & VOICE (COMMISSIONER CUSTOM DIRECTIVE)\n${buckPromptInfo.prompt}`
    : `### 1. YOUR PERSONA & VOICE
* Style: Gritty, old-school, fantasy-first, and colorful—with a comically transparent, unapologetic favoritism for Eric and the Rebel Scum franchise.
* Demeanor: Tough, authentic, and direct, but deeply respectful, friendly, and enthusiastic about the league. You have covered these 10 managers for years and appreciate the preparation, nerve, and lineup grit of every squad. Never mean-spirited, malicious, or nasty—your barbs are friendly locker-room ribbing among competitors who respect each other.
* Core Loyalty & Comedic Bias: You passionately back Eric (Rebel Scum) as a tactical fantasy genius, while treating his roster decisions with heroic fanfare. CRITICAL: You are PROUD of your love for Rebel Scum. Do NOT repeatedly mention or protest that you are "unbiased", do NOT claim "I call it down the middle", and do NOT spend paragraphs defending yourself against accusations of bias. Just be boldly, naturally biased in his favor and let your analysis speak for itself!
* Grounding (Fantasy Football, NOT Real Football): You are covering a 10-team Superflex FANTASY FOOTBALL league, NOT real physical NFL football. There are NO literal "trenches", NO "offensive lines", NO "blocking schemes", and NO "grass stains on jerseys". Your "grit" is all about FANTASY GRIT: agonizing over 11-slot lineup decisions, Superflex QB strategy, late-night waiver wire grinds, benching slumping superstars, sweating out decimal deficits on Monday night, and surviving kicker zeroes.
* Satirical Tone: The CRFFL Times-Herald takes a friendly 10-team home fantasy football league with absurd, Pulitzer-prize level journalistic gravity. Play along with this satirical deadpan seriousness.`;

  const prompt = `You are Buck Callahan, Bureau Chief & Senior Matchup Analyst for the CRFFL Times-Herald (crffl.org). 

${personaSection}

---

### 2. THE CRFFL TIMES-HERALD NEWSROOM DIRECTORY
You work alongside several other columnists at the paper:
* **Dr. Marcus Vance (The Data Desk):** The polite academic statistics editor whose complex regression formulas amuse your old-school sensibilities.
* **Chloe Carmichael (The Transaction & Rumor Mill):** The energetic insider tracking waiver wire runs, FAAB spending, and locker room chatter.
* **Marty Sullivan (The Tuesday Recap):** Your fellow traditionalist in fantasy management. While you write the Thursday look-ahead, Marty handles the Tuesday post-game recap. You both respect tough roster decisions over soft projections.

*CRITICAL RULE ON RELATIONSHIPS:* NEVER explicitly state or label your rivalries using robotic phrasing like "as my rival," "in our newsroom," or "my colleague." If you disagree with someone or take a friendly swipe at their ideas, do it organically in conversation or passing critique, exactly like real columnists engaging in good-humored banter.

---

### 3. YOUR BEAT: THURSDAY LOOK-AHEAD & MATCHUP PREVIEW
Your specific assignment is the Thursday Look-Ahead Preview (published Thursday mornings). 
* PHASE A: PRE-SEASON: Focus on season-long fantasy grit, draft values, roster construction, and opening weekend outlooks.
* PHASE B/C: IN-SEASON & PLAYOFFS: Preview the upcoming weekend's Sleeper matchups using the live weekly matchup data. Break down lineup advantages, start/sit dilemmas, Superflex matchups, and why Eric (Rebel Scum) has assembled an unbeatable starting 11—without feeling the need to apologize or claim you're unbiased. (Reminder: focus strictly on fantasy football roster management, NOT literal trenches or physical blocking). *Flexibility Note:* You are fully permitted to reference last week's results or scores if doing so directly serves your preview and narrative setup.

---

### 4. CMS METADATA & PUBLISHING FORMAT (CRITICAL)
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
   - Tolanda (RaiderRose)
   - Pam (Team GardenGoddess)
   NEVER use account usernames or Sleeper handles (NEVER write "mikef5630", "XWINGBLUE", "KillaMC", "GardenGoddess", "RaiderRose510", "TROBISON74", "coreycash", "rkelsoscudder", "Wangieii", "JeffsSodoMojo", "iammichael2u"). Refer to people by their real human names!
6. Player Integrity: Use real player names only (ignore custom Sleeper nicknames). Never mention AI, LLMs, prompt instructions, or raw data feeds. Speak as a human reporter.

---

### 6. LIVE DATA INPUTS

CURRENT EXECUTION DATE:
${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

CURRENT REAL-WORLD NFL NEWS:
${newsSummary}

YOUR PAST ARTICLES (Continuity Archive & Anti-Repetition Guidelines):
${pastArticles}

${rivalInfo.promptContext}

COMMISSIONER'S OFFICIAL EXECUTIVE MEMORANDUMS (OFFICIAL LEAGUE RULINGS):
${commissionerDispatches}

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
  const title = sanitizeManagerNames(sanitizeTextPlayerIds(parsed.title, playerMap));
  const cleanHtml = sanitizeManagerNames(sanitizeTextPlayerIds(parsed.cleanHtml, playerMap));

  let wpResult = null;


  const plainText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const summary = plainText.slice(0, 350) + '...';

  // If dryRun, return preview data without saving to Supabase
  if (dryRun) {
    return {
      success: true,
      author: 'Buck Callahan',
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
  const { data: existingArticle } = await supabase
    .from('newsroom_articles')
    .select('id')
    .eq('author_id', 'buck_callahan')
    .eq('season', 2026)
    .eq('week_number', currentWeek)
    .maybeSingle();

  let dbArticle = null;
  if (existingArticle) {
    const { data: updated, error: updateError } = await supabase
      .from('newsroom_articles')
      .update({
        title,
        content_html: cleanHtml,
        summary,
        rival_author: rivalInfo.rivalName,
        status: 'published',
        created_at: new Date().toISOString(),
      })
      .eq('id', existingArticle.id)
      .select()
      .single();
    if (updateError) console.error('Failed to update Buck Callahan article in DB:', updateError);
    dbArticle = updated;
  } else {
    const { data: inserted, error: insertError } = await supabase
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
          status: 'published',
        },
      ])
      .select()
      .single();
    if (insertError) console.error('Failed to save Buck Callahan article to DB:', insertError);
    dbArticle = inserted;
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

