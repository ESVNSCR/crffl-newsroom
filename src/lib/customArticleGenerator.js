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
import { REPORTER_PERSONAS } from './reporterPersonas.js';
import { calculateWeeklyBenchAudit } from './benchAudit.js';
import { getEffectiveReporterPrompt } from './promptManager.js';

export { REPORTER_PERSONAS };

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
    benchBlunders: includeSleeperData !== false,
  };

  const needPlayerMap = options.matchups || options.boxScores || options.transactions || options.benchBlunders;
  const needMatchups = options.matchups || options.boxScores || options.benchBlunders;
  const needTransactions = options.transactions;
  const needContests = options.contests;
  const needNflNews = options.nflNews;

  // 1. Fetch live league overview, NFL state, player map, memory, PFF news, and effective custom prompt in parallel
  const [overview, nflState, playerMap, pastArticles, nflNews, effectivePromptInfo] = await Promise.all([
    getLeagueOverview().catch(() => ({ rosters: {}, users: [], state: { week: 1 } })),
    getNflState().catch(() => ({ week: 1, season: 2026 })),
    needPlayerMap ? getSleeperPlayerMap().catch(() => ({})) : Promise.resolve({}),
    getAuthorMemory(reporterId, 3).catch(() => []),
    needNflNews ? getPffNews(3).catch(() => []) : Promise.resolve([]),
    getEffectiveReporterPrompt(reporterId).catch(() => ({ prompt: persona.promptGuidelines })),
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
    contestSummary = `• Week ${activeWeek} Contest: "${contestData.contest_name}" (Prize: ${contestData.prize || '$10'})\n  Description: ${contestData.description || 'N/A'}\n  Current Status/Winner: ${contestData.winner_manager ? `${contestData.winner_manager} (${contestData.winning_score} pts${contestData.winner_player ? ` - ${contestData.winner_player}` : ''})` : 'In progress / TBD'}`;
  }

  // 7. Bench Points & Lineup Optimization Audit
  let benchSection = '';
  if (options.benchBlunders && rawMatchups.length > 0) {
    const benchAudit = calculateWeeklyBenchAudit(rawMatchups, playerMap, overview.rosters);
    if (benchAudit?.formattedReport) {
      benchSection = benchAudit.formattedReport;
    }
  }

  // 8. Real NFL Newswire
  let newsSummary = '';
  if (options.nflNews && nflNews.length > 0) {
    newsSummary = nflNews.map((n) => `• ${n.title}: ${n.description}`).join('\n');
  }

  // 9. Memory
  const pastMemoryText = typeof pastArticles === 'string'
    ? pastArticles
    : (Array.isArray(pastArticles) && pastArticles.length > 0
      ? pastArticles.map((a) => `• "${a.title}": ${a.summary}`).join('\n')
      : 'No recent columns recorded.');

  // 10. Assemble Context Blocks
  const contextBlocks = [];
  if (standingsSection) {
    contextBlocks.push(standingsSection);
  }
  if (matchupSection) {
    contextBlocks.push(`Head-to-Head Matchups & Box Scores (Week ${activeWeek}):\n${matchupSection}`);
  }
  if (benchSection) {
    contextBlocks.push(benchSection);
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

  const promptGuidelines = effectivePromptInfo?.prompt || persona.promptGuidelines;

  // 11. Assemble System Instruction
  const systemInstruction = `
${promptGuidelines}

### CRFFL LEAGUE CONTEXT & SLEEPER DATA (SEASON VI - 2026, WEEK ${activeWeek})
${contextBlocks.join('\n\n')}

### EDITORIAL RULES & CONTINUITY:
1. STRICT HUMAN NAMES & FRANCHISE NAMES (MANDATORY):
   - ONLY use official human manager names: Eric, Corey, Mike F., KC, Ed, Randy, Jeff, Marcus, Mike M., Pam.
   - NEVER use raw internet usernames (e.g. NEVER write "mikef5630", "coreycash", "XWINGBLUE", "RaiderRose510", "GardenGoddess", "iammichael2u", "rkelsoscudder", "Wangieii", "JeffsSodoMojo", "KillaMC").
   - Pair managers with their official team names: Eric (Rebel Scum), Mike F. (Stars & Stripes), Randy (Generic Football Team), Corey (Team CoreyCash), KC (Shortbus Superstars), Marcus (Team Killa MC), Mike M. (Moore Better), Jeff (Hickory Huskers), Ed (Team RaiderRose510), Pam (Team GardenGoddess).

2. SLEEPER DATA GROUNDING:
   - Ground your article in the official league data provided above. If a specific data category (e.g. transactions, matchups, or box scores) was omitted from the prompt, do not invent or hallucinate statistics for it.
${reporterId === 'marty_sullivan' ? `
3. BENCH POINTS & FATAL BLUNDERS FOCUS (CRITICAL):
   - You MUST closely analyze the LINEUP OPTIMIZATION & BENCH BLUNDER AUDIT above.
   - If any manager suffered a FATAL BENCH BLUNDER (their optimal lineup would have won the matchup, but they sat the winning points on the bench), you must mercilessly roast them! Name the stranded players, their points, and call out the manager's malpractice.
` : ''}
${reporterId === 'marty_sullivan' ? '4' : '3'}. OUTPUT FORMAT & COMPLETION RULES (MANDATORY):
   Your output MUST begin with exactly four lines of bracketed shortcodes so our CMS can parse the article metadata:
   [title Compelling Headline in Character]
   [author ${persona.name}]
   [category ${categoryName}]
   [status publish]

   Followed immediately by well-crafted, stylized HTML content (<p>, optional <h3> sub-headings, <blockquote>).
   Do NOT wrap in markdown code fences (\`\`\`html).
   Target length: 750 – 1,500 words of rich, entertaining writing fully in character.
   PACING & COMPLETION REQUIREMENT (CRITICAL):
   - Pace your writing so you deliver your full message from the opening hook/decree to an authoritative conclusion.
   - Do not write open-ended drafts. Every article MUST finish with an official closing paragraph and sign-off (e.g. for the Commissioner: "- Eric Vaughan, Commissioner, CRFFL").
   - Ensure all HTML tags are opened and closed cleanly.
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

  userPrompt += `\nRemember to stay completely in your persona as ${persona.name} (${persona.tagline}). Bring your unique worldview, biases, and comedic voice to this topic. Ensure your piece is complete through to the final sign-off.`;

  // 11. Call Gemini API without artificial maxOutputTokens so output is never cut off
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [
      { role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }
    ],
    config: {
      temperature: 0.85,
      thinkingConfig: {
        thinkingBudget: 1024,
      },
    }
  });

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    console.warn('⚠️ Warning: Gemini generation reached MAX_TOKENS ceiling.');
  }

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
