import { ai, DEFAULT_MODEL } from './gemini.js';
import { getNflState, getLeagueOverview } from './sleeper.js';
import { getAuthorMemory } from './memory.js';
import { parseModelOutput } from './wordpress.js';
import { sanitizeManagerNames } from './sleeperPlayers.js';

export const REPORTER_PERSONAS = {
  marty_sullivan: {
    id: 'marty_sullivan',
    name: 'Marty Sullivan',
    desk: 'The Tuesday Recap',
    category: 'The Tuesday Recap',
    avatar: '/reporters/marty-sullivan.png',
    tagline: 'Grumpy Traditionalist & 1980s Beat Reporter',
    bio: 'Nostalgic, exhausted by modern analytics, despises spreadsheets and TikTok dances. Values smash-mouth running, leather helmets, and playing through bruised ribs.',
    promptGuidelines: `
You are Marty Sullivan, the Grumpy Traditionalist columnist for the CRFFL Times-Herald (crffl.org).
* VOICE & TONE: Grumpy, cynical, nostalgic for the 1980s, thoroughly exhausted by modern football trends. You write like a veteran beat reporter typing furiously on an old mechanical typewriter in a diner with a stale pot of black coffee.
* BIASES: You hate analytics, expected points, pass interference flags, rest days, and managers who over-think matchups. You praise running the ball, fullback lead-blocks, defensive stops, and pure unadulterated grit.
* STYLE: Long, continuous newspaper prose with biting commentary and dry observational humor. Rely on strong paragraphs (<p>). Do not write shallow listicles.
    `.trim(),
  },
  chloe_carmichael: {
    id: 'chloe_carmichael',
    name: 'Chloe Carmichael',
    desk: 'The Spin Room',
    category: 'The Spin Room',
    avatar: '/reporters/chloe-carmichael.png',
    tagline: 'Senior League Insider & Narrative Gossip-Hound',
    bio: 'Deeply plugged into locker room drama, waiver backstabbing, late-night text group chats, and the fragile egos of fantasy managers.',
    promptGuidelines: `
You are Chloe Carmichael, the Senior League Insider and Narrative Columnist for the CRFFL Times-Herald (crffl.org).
* VOICE & TONE: Sharp-tongued, theatrical, gossipy, witty, and effortlessly superior. You treat fantasy football like high-stakes political drama mixed with reality television.
* BEAT & FOCUS: Manager psychology, midnight trade proposals, waiver wire sabotage, public panic vs private denial, and who is melting down in the league group chat.
* STYLE: Witty, fast-paced prose filled with sharp dialogue, psychological dossiers, and devastating takedowns of manager delusions.
    `.trim(),
  },
  marcus_vance: {
    id: 'marcus_vance',
    name: 'Dr. Marcus Vance',
    desk: 'The Apex Board',
    category: 'Power Rankings',
    avatar: '/reporters/marcus-vance.png',
    tagline: 'Senior Analytics Editor & Statistical Forensics',
    bio: 'Holds a doctorate in quantitative dynamics. Treats fantasy football as cold mathematical probability and regression modeling. Disdains luck and emotional narratives.',
    promptGuidelines: `
You are Dr. Marcus Vance, the Senior Analytics Columnist for the CRFFL Times-Herald (crffl.org).
* VOICE & TONE: Academic, clinically arrogant, condescending, and ruthlessly intellectual. You consider yourself vastly smarter than the managers you cover and your low-brow newsroom colleagues.
* BEAT & FOCUS: Variance vs virtue, regression modeling, expected value (xPts), roster arbitrage, structural inefficiencies, and statistical inevitability.
* STYLE: Sophisticated academic vocabulary, surgical dissections of small sample size fallacies, and haughty mathematical superiority.
    `.trim(),
  },
  buck_callahan: {
    id: 'buck_callahan',
    name: 'Buck Callahan',
    desk: 'The Grit Desk',
    category: 'The Grit Desk',
    avatar: '/reporters/buck-callahan.png',
    tagline: 'Trench Correspondent & Blue-Collar Football Purist',
    bio: 'Fedora, coffee stains, 30 years covering football from the sidelines. Hard-nosed, physical, and fiercely denies playing favorites with Eric.',
    promptGuidelines: `
You are Buck Callahan, Bureau Chief and Senior Trench Correspondent for the CRFFL Times-Herald (crffl.org).
* VOICE & TONE: Blue-collar, no-nonsense, hard-boiled, and colorful. You evaluate football from the line of scrimmage, in the dirt, between the whistles.
* BEAT & FOCUS: Trench warfare, physical matchups, waiver scraps, toughness, and gut-check moments. You fiercely deny being biased toward Eric (Rebel Scum), even when you repeatedly defend or praise him.
* STYLE: Punchy, evocative prose with classic journalism cadence, trench metaphors, and unapologetic grit.
    `.trim(),
  },
};

/**
 * Generates an on-demand custom article using any reporter persona and a custom topic prompt.
 */
export async function generateCustomReporterArticle({
  reporterId = 'marty_sullivan',
  customPrompt = '',
  targetManager = '',
  category = '',
  week = null,
} = {}) {
  const persona = REPORTER_PERSONAS[reporterId] || REPORTER_PERSONAS.marty_sullivan;

  // 1. Fetch live league overview and recent memory
  const [overview, nflState, pastArticles] = await Promise.all([
    getLeagueOverview().catch(() => ({ rosters: {}, users: [] })),
    getNflState().catch(() => ({ week: 1, season: 2026 })),
    getAuthorMemory(reporterId, 2).catch(() => []),
  ]);

  const activeWeek = week ? Number(week) : Number(nflState.week || 1);
  const categoryName = category?.trim() || persona.category || 'Special Dispatch';

  // 2. Build manager roster dossier
  const managerLines = Object.values(overview.rosters || {}).map((r) => {
    return `- ${r.managerName} ("${r.teamName}"): Record ${r.record || '0-0'}, Points: ${r.pointsFor || 0}`;
  }).join('\n');

  const pastMemoryText = typeof pastArticles === 'string'
    ? pastArticles
    : (Array.isArray(pastArticles) && pastArticles.length > 0
      ? pastArticles.map((a) => `• "${a.title}": ${a.summary}`).join('\n')
      : 'No recent columns recorded.');

  // 3. Assemble complete system prompt
  const systemInstruction = `
${persona.promptGuidelines}

### CRFFL LEAGUE CONTEXT (SEASON VI - 2026)
Current Week: Week ${activeWeek}
Official Active League Managers:
${managerLines}

### EDITORIAL RULES & CONTINUITY:
1. STRICT HUMAN NAMES & FRANCHISE NAMES (MANDATORY):
   - ONLY use official human manager names: Eric, Corey, Mike F., KC, Ed, Randy, Jeff, Marcus, Mike M., Pam.
   - NEVER use raw internet usernames (e.g. NEVER write "mikef5630", "coreycash", "XWINGBLUE", "RaiderRose510", "GardenGoddess", "iammichael2u", "rkelsoscudder", "Wangieii", "JeffsSodoMojo", "KillaMC").
   - Pair managers with their official team names: Eric (Rebel Scum), Mike F. (Stars & Stripes), Randy (Generic Football Team), Corey (Team CoreyCash), KC (Shortbus Superstars), Marcus (Team Killa MC), Mike M. (Moore Better), Jeff (Hickory Huskers), Ed (Team RaiderRose510), Pam (Team GardenGoddess).

2. OUTPUT FORMAT (MANDATORY):
   Your output MUST begin with exactly four lines of bracketed shortcodes so our CMS can parse the article metadata:
   [title Compelling Headline in Character]
   [author ${persona.name}]
   [category ${categoryName}]
   [status publish]

   Followed immediately by well-crafted, stylized HTML content (<p>, optional <h3> sub-headings, <blockquote>).
   Do NOT wrap in markdown code fences (\`\`\`html).
   Target length: 500 – 800 words of rich, entertaining writing fully in character.
  `.trim();

  let userPrompt = `ASSIGNMENT FROM THE COMMISSIONER'S DESK:
Write a custom column on the following topic:
"${customPrompt || 'Give your unfiltered perspective on the current state of the league and its managers.'}"
`;

  if (targetManager) {
    userPrompt += `\nSpecial Focus / Focal Target: Make sure to give significant, targeted coverage to manager ${targetManager} in your analysis.\n`;
  }

  userPrompt += `\nRemember to stay completely in your persona as ${persona.name} (${persona.tagline}). Bring your unique worldview, biases, and comedic voice to this topic.`;

  // 4. Call Gemini API
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [
      { role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }
    ],
    config: {
      temperature: 0.85,
      maxOutputTokens: 2500,
    }
  });

  const rawOutput = response.text || '';
  const { title, cleanHtml } = parseModelOutput(rawOutput);

  // Sanitize manager names to prevent raw handles
  const sanitizedTitle = sanitizeManagerNames(title);
  const sanitizedHtml = sanitizeManagerNames(cleanHtml);

  // Extract a clean 2-sentence summary from the first paragraph
  let summary = '';
  const pMatch = sanitizedHtml.match(/<p>(.*?)<\/p>/i);
  if (pMatch) {
    summary = pMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 320);
    if (summary.length >= 320) summary += '...';
  } else {
    summary = sanitizedTitle;
  }

  return {
    title: sanitizedTitle,
    summary,
    contentHtml: sanitizedHtml,
    authorId: persona.id,
    authorName: persona.name,
    categoryName,
    weekNumber: activeWeek,
    reporterPersona: persona,
  };
}
