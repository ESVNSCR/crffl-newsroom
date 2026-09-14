import { ai, DEFAULT_MODEL } from './gemini.js';
import { supabase } from './supabase.js';
import { getNflState, getLeagueOverview, getLeagueMatchups, getLeagueTransactions } from './sleeper.js';
import { getAuthorMemory } from './memory.js';
import { parseModelOutput } from './wordpress.js';
import { getPffNews } from './pff.js';
import {
  getSleeperPlayerMap,
  enrichMatchupsWithPlayerNames,
  enrichTransactionsWithPlayerNames,
  sanitizeManagerNames,
} from './sleeperPlayers.js';

export const REPORTER_PERSONAS = {
  commissioner: {
    id: 'commissioner',
    name: 'Eric Vaughan',
    desk: 'The Front Office',
    category: "Commissioner's Corner",
    avatar: '/logos/league.png',
    banner: '/commissioner-banner.png',
    tagline: 'CRFFL Commissioner & League Founder',
    bio: 'Authoritative, constitutional, protective of league integrity, dryly humorous, and benevolent ruler of the Columbia River Fantasy Football League since 2021.',
    promptGuidelines: `
You are Eric Vaughan, the founding Commissioner of the Columbia River Fantasy Football League (CRFFL) penning an official executive dispatch for "Commissioner's Corner" on crffl.org.
* VOICE & TONE: Authoritative, constitutional, statesmanlike, and dryly witty. You speak with the executive gravitas of a league commissioner addressing his franchise owners ("From the Front Office", "Owners and Managers", "Pursuant to the League Charter"). You can be stern when rules, lineup effort, or sportsmanship are challenged, but you possess genuine affection for this league, its tradition, and its 10 managers.
* PERSPECTIVE ON FRANCHISES: You are the ultimate arbitrator, constitutional custodian, and historian of the league. You know every manager's quirks, tendencies, and championship or heartbreak history. When discussing your own franchise, Eric (Rebel Scum), maintain an air of dignified executive modesty ("The Front Office notes with quiet satisfaction..."), but never shy away from competitive reality.
* INTEGRITY & HUMOR: Balance serious constitutional decrees with dry, sarcastic observations about bad trade proposals, waiver wire panic, excuse-making in the league group chat, and blown bench decisions.
* STYLE: Presidential executive address, official front-office memorandum, or candid commissioner review. Formatted with dignified prose (<p>), occasional sub-headers (<h3>), and official rulings or quotations (<blockquote>).
    `.trim(),
  },
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
 * Generates an on-demand custom article using any reporter persona or the Commissioner,
 * fully integrated with live Sleeper API data and granular data source selections.
 */
export async function generateCustomReporterArticle({
  reporterId = 'commissioner',
  customPrompt = '',
  targetManager = '',
  category = '',
  week = null,
  includeSleeperData = true,
  sleeperOptions = null,
} = {}) {
  const persona = REPORTER_PERSONAS[reporterId] || REPORTER_PERSONAS.commissioner;

  // Resolve granular Sleeper & league data options
  const options = sleeperOptions || {
    matchups: includeSleeperData !== false,
    boxScores: includeSleeperData !== false,
    standings: includeSleeperData !== false,
    transactions: includeSleeperData !== false,
    contests: includeSleeperData !== false,
    nflNews: includeSleeperData !== false,
  };

  const needPlayerMap = options.matchups || options.boxScores || options.transactions;
  const needMatchups = options.matchups || options.boxScores;
  const needTransactions = options.transactions;
  const needContests = options.contests;
  const needNflNews = options.nflNews;

  // 1. Fetch live league overview, NFL state, player map, memory, and PFF news in parallel
  const [overview, nflState, playerMap, pastArticles, nflNews] = await Promise.all([
    getLeagueOverview().catch(() => ({ rosters: {}, users: [], state: { week: 1 } })),
    getNflState().catch(() => ({ week: 1, season: 2026 })),
    needPlayerMap ? getSleeperPlayerMap().catch(() => ({})) : Promise.resolve({}),
    getAuthorMemory(reporterId, 3).catch(() => []),
    needNflNews ? getPffNews(3).catch(() => []) : Promise.resolve([]),
  ]);

  const activeWeek = week ? Number(week) : Number(nflState?.week || overview?.state?.week || 1);
  const categoryName = category?.trim() || persona.category || 'Special Dispatch';

  // 2. Fetch week-specific matchups, transactions, and weekly contest in parallel
  const weekFetches = [];
  if (needMatchups) {
    weekFetches.push(getLeagueMatchups(activeWeek).catch(() => []));
  } else {
    weekFetches.push(Promise.resolve([]));
  }

  if (needTransactions) {
    weekFetches.push(getLeagueTransactions(activeWeek).catch(() => []));
  } else {
    weekFetches.push(Promise.resolve([]));
  }

  if (needContests) {
    weekFetches.push(
      (async () => {
        try {
          return await supabase
            .from('weekly_contests')
            .select('*')
            .eq('week_number', activeWeek)
            .maybeSingle();
        } catch {
          return { data: null };
        }
      })()
    );
  } else {
    weekFetches.push(Promise.resolve({ data: null }));
  }

  const [mRes, txRes, cRes] = await Promise.all(weekFetches);
  const rawMatchups = mRes || [];
  let rawTransactions = txRes || [];
  const contestData = cRes?.data || null;

  if (needTransactions && rawTransactions.length === 0 && activeWeek > 1) {
    try {
      rawTransactions = await getLeagueTransactions(1);
    } catch {}
  }

  // 3. Standings & Roster Lines
  const sortedRosters = Object.values(overview.rosters || {}).sort((a, b) => {
    const winsA = a.settings?.wins || 0;
    const winsB = b.settings?.wins || 0;
    if (winsB !== winsA) return winsB - winsA;
    return (b.pointsFor || 0) - (a.pointsFor || 0);
  });

  let standingsSection = '';
  if (options.standings && sortedRosters.length > 0) {
    standingsSection = `Official League Standings & Records (Week ${activeWeek}):\n` + sortedRosters.map((r, idx) => {
      const wins = r.settings?.wins || 0;
      const losses = r.settings?.losses || 0;
      const ties = r.settings?.ties || 0;
      const recStr = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
      return `${idx + 1}. ${r.managerName} ("${r.teamName}"): Record ${recStr}, Points For: ${(r.pointsFor || 0).toFixed(2)}`;
    }).join('\n');
  } else {
    standingsSection = `Official League Franchises & Managers:\n` + Object.values(overview.rosters || {}).map((r) => {
      return `- ${r.managerName} ("${r.teamName}")`;
    }).join('\n');
  }

  // 4. Matchup Pairings & Box Scores
  let matchupSection = '';
  if ((options.matchups || options.boxScores) && rawMatchups.length > 0) {
    const enrichedMatchups = enrichMatchupsWithPlayerNames(rawMatchups, playerMap, overview.rosters);
    const matchupPairs = {};
    for (const m of enrichedMatchups) {
      if (!m.matchup_id) continue;
      if (!matchupPairs[m.matchup_id]) matchupPairs[m.matchup_id] = [];
      matchupPairs[m.matchup_id].push(m);
    }

    const mLines = Object.entries(matchupPairs).map(([mid, teams]) => {
      if (teams.length < 2) {
        const t = teams[0];
        return `• Matchup ${mid}: ${t.manager_name} (${t.team_name}) — ${(t.points || 0).toFixed(2)} pts`;
      }
      const [t1, t2] = teams;
      const diff = Math.abs((t1.points || 0) - (t2.points || 0)).toFixed(2);
      let statusText = '';
      if ((t1.points || 0) > 0 || (t2.points || 0) > 0) {
        const leader = (t1.points || 0) > (t2.points || 0) ? t1.manager_name : ((t2.points || 0) > (t1.points || 0) ? t2.manager_name : 'Tied');
        statusText = `[Leader/Winner: ${leader} by ${diff} pts]`;
      } else {
        statusText = '[Pending / 0.00 pts]';
      }

      const topScorersT1 = options.boxScores
        ? Object.entries(t1.scoring_breakdown || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([name, pts]) => `${name} (${pts.toFixed(1)} pts)`)
            .join(', ')
        : '';

      const topScorersT2 = options.boxScores
        ? Object.entries(t2.scoring_breakdown || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([name, pts]) => `${name} (${pts.toFixed(1)} pts)`)
            .join(', ')
        : '';

      let line = '';
      if (options.matchups) {
        line = `• ${t1.manager_name} (${t1.team_name}) ${(t1.points || 0).toFixed(2)} vs ${t2.manager_name} (${t2.team_name}) ${(t2.points || 0).toFixed(2)} ${statusText}`;
      } else {
        line = `• ${t1.manager_name} (${t1.team_name}) vs ${t2.manager_name} (${t2.team_name})`;
      }

      if (options.boxScores) {
        if (topScorersT1) line += `\n    - ${t1.manager_name} top weapons: ${topScorersT1}`;
        if (topScorersT2) line += `\n    - ${t2.manager_name} top weapons: ${topScorersT2}`;
      }
      return line;
    });

    if (mLines.length > 0) {
      matchupSection = mLines.join('\n');
    }
  }

  // 5. Transactions & Waivers
  let txSection = '';
  if (options.transactions && rawTransactions.length > 0) {
    const enrichedTx = enrichTransactionsWithPlayerNames(rawTransactions, playerMap);
    const txLines = (enrichedTx || []).slice(0, 8).map((tx) => {
      const addsStr = Object.entries(tx.adds || {})
        .map(([player, rId]) => {
          const mgr = overview.rosters?.[rId]?.managerName || `Team ${rId}`;
          return `${mgr} added ${player}`;
        }).join('; ');

      const dropsStr = Object.entries(tx.drops || {})
        .map(([player, rId]) => {
          const mgr = overview.rosters?.[rId]?.managerName || `Team ${rId}`;
          return `${mgr} dropped ${player}`;
        }).join('; ');

      const bid = tx.waiver_budget?.[0]?.amount ? ` ($${tx.waiver_budget[0].amount} FAAB)` : '';
      const parts = [addsStr, dropsStr].filter(Boolean).join(' | ');
      return `• [${tx.type.toUpperCase()}${bid}]: ${parts || 'Roster transaction processed'}`;
    });

    if (txLines.length > 0) {
      txSection = txLines.join('\n');
    }
  }

  // 6. Weekly Contest
  let contestSummary = '';
  if (options.contests && contestData) {
    contestSummary = `• Week ${activeWeek} Contest: "${contestData.contest_name}" (Prize: ${contestData.prize || '$10'})\n  Description: ${contestData.description || 'N/A'}\n  Current Status/Winner: ${contestData.winner_manager ? `${contestData.winner_manager} (${contestData.winning_score} pts)` : 'In progress / TBD'}`;
  }

  // 7. Real NFL Newswire
  let newsSummary = '';
  if (options.nflNews && nflNews.length > 0) {
    newsSummary = nflNews.map((n) => `• ${n.title}: ${n.description}`).join('\n');
  }

  // 8. Memory
  const pastMemoryText = typeof pastArticles === 'string'
    ? pastArticles
    : (Array.isArray(pastArticles) && pastArticles.length > 0
      ? pastArticles.map((a) => `• "${a.title}": ${a.summary}`).join('\n')
      : 'No recent columns recorded.');

  // 9. Assemble Context Blocks
  const contextBlocks = [];
  if (standingsSection) {
    contextBlocks.push(standingsSection);
  }
  if (matchupSection) {
    contextBlocks.push(`Head-to-Head Matchups & Box Scores (Week ${activeWeek}):\n${matchupSection}`);
  }
  if (txSection) {
    contextBlocks.push(`Recent Transactions & Waiver Wire Moves:\n${txSection}`);
  }
  if (contestSummary) {
    contextBlocks.push(`Weekly Contest:\n${contestSummary}`);
  }
  if (newsSummary) {
    contextBlocks.push(`Real-World NFL Newswire (PFF):\n${newsSummary}`);
  }
  if (pastMemoryText) {
    contextBlocks.push(`Your Prior Columns (Continuity):\n${pastMemoryText}`);
  }

  // 10. Assemble System Instruction
  const systemInstruction = `
${persona.promptGuidelines}

### CRFFL LEAGUE CONTEXT & SLEEPER DATA (SEASON VI - 2026, WEEK ${activeWeek})
${contextBlocks.join('\n\n')}

### EDITORIAL RULES & CONTINUITY:
1. STRICT HUMAN NAMES & FRANCHISE NAMES (MANDATORY):
   - ONLY use official human manager names: Eric, Corey, Mike F., KC, Ed, Randy, Jeff, Marcus, Mike M., Pam.
   - NEVER use raw internet usernames (e.g. NEVER write "mikef5630", "coreycash", "XWINGBLUE", "RaiderRose510", "GardenGoddess", "iammichael2u", "rkelsoscudder", "Wangieii", "JeffsSodoMojo", "KillaMC").
   - Pair managers with their official team names: Eric (Rebel Scum), Mike F. (Stars & Stripes), Randy (Generic Football Team), Corey (Team CoreyCash), KC (Shortbus Superstars), Marcus (Team Killa MC), Mike M. (Moore Better), Jeff (Hickory Huskers), Ed (Team RaiderRose510), Pam (Team GardenGoddess).

2. SLEEPER DATA GROUNDING:
   - Ground your article in the official league data provided above. If a specific data category (e.g. transactions, matchups, or box scores) was omitted from the prompt, do not invent or hallucinate statistics for it.

3. OUTPUT FORMAT (MANDATORY):
   Your output MUST begin with exactly four lines of bracketed shortcodes so our CMS can parse the article metadata:
   [title Compelling Headline in Character]
   [author ${persona.name}]
   [category ${categoryName}]
   [status publish]

   Followed immediately by well-crafted, stylized HTML content (<p>, optional <h3> sub-headings, <blockquote>).
   Do NOT wrap in markdown code fences (\`\`\`html).
   Target length: 500 – 800 words of rich, entertaining writing fully in character.
  `.trim();

  let userPrompt = '';
  if (persona.id === 'commissioner') {
    userPrompt = `EXECUTIVE DIRECTIVE FROM THE COMMISSIONER'S DESK:
Write an official Commissioner's Corner address on the following directive:
"${customPrompt || 'Deliver an official State of the League address evaluating current standings, matchup results, and league decorum.'}"
`;
  } else {
    userPrompt = `ASSIGNMENT FROM THE COMMISSIONER'S DESK:
Write a custom column on the following topic:
"${customPrompt || 'Give your unfiltered perspective on the current state of the league and its managers.'}"
`;
  }

  if (targetManager) {
    userPrompt += `\nSpecial Focus / Focal Target: Make sure to give significant, targeted coverage to manager ${targetManager} in your analysis.\n`;
  }

  userPrompt += `\nRemember to stay completely in your persona as ${persona.name} (${persona.tagline}). Bring your unique worldview, biases, and comedic voice to this topic.`;

  // 11. Call Gemini API
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
    bannerUrl: persona.banner || (persona.id === 'commissioner' ? '/commissioner-banner.png' : null),
  };
}
