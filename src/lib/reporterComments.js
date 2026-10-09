import { ai, FAST_MODEL, DEFAULT_MODEL } from './gemini.js';
import { supabase } from './supabase.js';
import { REPORTER_PERSONAS } from './reporterPersonas.js';
import { resolveManager } from './managers.js';

/**
 * Known reporter IDs and their display names.
 */
export const REPORTER_NAMES = [
  'Dr. Marcus Vance',
  'Chloe Carmichael',
  'Marty Sullivan',
  'Buck Callahan',
  'Eric Vaughan',
  'The Commissioner',
];

/**
 * Checks if a name belongs to an AI reporter / columnist.
 */
export function isReporterName(name) {
  if (!name) return false;
  const n = String(name).toLowerCase();
  return (
    n.includes('marcus vance') ||
    n.includes('chloe carmichael') ||
    n.includes('marty sullivan') ||
    n.includes('buck callahan')
  );
}
 
/**
 * In-character fallback retort for reporters if the LLM is temporarily unavailable or times out.
 * Ensures that reporters ALWAYS reply to managers on their articles.
 */
export function getFallbackReply(reporterId, humanName, teamName) {
  const safeName = humanName || 'Manager';
  const safeTeam = teamName || 'CRFFL Franchise';
  switch (reporterId) {
    case 'buck_callahan':
      return `Appreciate you checking in from the ${safeTeam} sideline, ${safeName}. Keep your chin strapped and don't let anyone push you around in the trenches this week.`;
    case 'chloe_carmichael':
      return `Thanks for chiming in, ${safeName}! The front office rumor mill never rests—keep your FAAB tight and watch those wire claims closely.`;
    case 'marty_sullivan':
      return `Appreciate the dispatch, ${safeName}. Just make sure you leave the winning points on the field and off the pine on Sunday, and we'll get along fine.`;
    case 'marcus_vance':
      return `A salient observation, ${safeName}. While regression curves fluctuate, your franchise's expected value trajectory remains one to monitor closely.`;
    case 'commissioner':
      return `The Front Office acknowledges your dispatch, ${safeName}. Maintain constitutional compliance and compete with honor.`;
    default:
      return `Appreciate the perspective, ${safeName}. Best of luck on the field this week!`;
  }
}

/**
 * Automatically generates and persists an in-character reporter response
 * to a manager's comment on an article or power rankings edition.
 */
export async function generateAndSaveReporterReply({
  targetType = 'article', // 'article' or 'power_ranking'
  articleId = null,
  rankingId = null,
  weekNumber = null,
  commentId,
  managerName,
  managerComment,
  parentId = null,
}) {
  try {
    if (!commentId || !managerName || !managerComment) {
      console.warn('generateAndSaveReporterReply: Missing required comment parameters.');
      return null;
    }

    // Guard: Never reply to another reporter's automated response (prevents infinite loops)
    if (isReporterName(managerName)) {
      return null;
    }

    let reporterPersona = null;
    let articleTitle = '';
    let targetWeek = weekNumber || 1;

    // --- Case A: Power Rankings ---
    if (targetType === 'power_ranking' || rankingId || (weekNumber && !articleId)) {
      reporterPersona = REPORTER_PERSONAS.marcus_vance;
      articleTitle = `Week ${targetWeek} Official Power Rankings`;
    }
    // --- Case B: Newsroom Article ---
    else if (articleId) {
      const { data: article, error: articleErr } = await supabase
        .from('newsroom_articles')
        .select('id, author_id, author_name, title, summary, category_name, content_html, week_number')
        .eq('id', articleId)
        .maybeSingle();

      if (articleErr || !article) {
        console.warn('Reporter reply aborted: Article not found', articleId);
        return null;
      }

      targetWeek = article.week_number || 1;
      articleTitle = article.title || 'CRFFL Times-Herald Column';

      // Resolve author persona
      const authorId = article.author_id;
      if (authorId && REPORTER_PERSONAS[authorId]) {
        reporterPersona = REPORTER_PERSONAS[authorId];
      } else {
        const an = (article.author_name || '').toLowerCase();
        if (an.includes('marcus')) reporterPersona = REPORTER_PERSONAS.marcus_vance;
        else if (an.includes('marty')) reporterPersona = REPORTER_PERSONAS.marty_sullivan;
        else if (an.includes('chloe')) reporterPersona = REPORTER_PERSONAS.chloe_carmichael;
        else if (an.includes('buck')) reporterPersona = REPORTER_PERSONAS.buck_callahan;
        else if (an.includes('commissioner') || an.includes('vaughan')) reporterPersona = REPORTER_PERSONAS.commissioner;
        else reporterPersona = REPORTER_PERSONAS.chloe_carmichael;
      }
    }

    if (!reporterPersona) {
      return null;
    }

    // Resolve Manager info (Human name & Franchise team name)
    const resolvedMgr = resolveManager(managerName);
    const humanName = resolvedMgr ? resolvedMgr.name : managerName;
    const teamName = resolvedMgr ? resolvedMgr.teamName : 'CRFFL Franchise';

    // If manager posting is the commissioner and the article is Commissioner's Corner, skip
    if (reporterPersona.id === 'commissioner' && resolvedMgr?.isCommissioner) {
      return null;
    }

    // If thread parent exists, grab parent comment to give conversational continuity
    let threadContext = '';
    let isReplyingToReporter = false;
    if (parentId) {
      const parentTable = targetType === 'power_ranking' ? 'power_ranking_comments' : 'article_comments';
      const { data: parentRow } = await supabase
        .from(parentTable)
        .select('manager_name, comment, is_reporter')
        .eq('id', parentId)
        .maybeSingle();

      if (parentRow) {
        isReplyingToReporter = Boolean(parentRow.is_reporter);
        threadContext = `PREVIOUS COMMENT IN THREAD BY ${parentRow.manager_name}: "${parentRow.comment}"\n`;
      }

      // If a manager is replying to another human manager, let them converse without reporter intrusion
      if (!isReplyingToReporter) {
        return null;
      }
    }

    const systemInstruction = `You are ${reporterPersona.name}, ${reporterPersona.tagline} for the CRFFL Times-Herald (crffl.org).
${reporterPersona.promptGuidelines}

You are replying to an online comment from a league manager under your latest column/dispatch.
Respond directly to ${humanName} (Manager of ${teamName}) in 1 to 3 sharp, in-character sentences (strictly 25 to 80 words).
Be witty, show good-humored snark, banter back, and stay strictly in character. Never be mean-spirited, abusive, or cruel.
Output ONLY your direct spoken retort as if typing in a comments section. Do not explain your reasoning, do not use markdown headers, bullet points, or quotation marks enclosing your reply.`;

    const prompt = `ARTICLE: "${articleTitle}"
${threadContext}COMMENT FROM ${humanName} (${teamName}): "${managerComment}"

Reply in character as ${reporterPersona.name}:`;

    let cleanReply = '';

    try {
      // Call Gemini with timeout protection (15 seconds max)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Reporter reply timeout')), 15000)
      );

      const geminiPromise = ai.models.generateContent({
        model: FAST_MODEL || DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.85,
        },
      });

      const response = await Promise.race([geminiPromise, timeoutPromise]);
      const rawReply = response?.text || '';

      // Clean up reply text
      cleanReply = rawReply
        .trim()
        .replace(/^["']|["']$/g, '') // remove surrounding quotes
        .replace(/^@\w+[:\s]*/i, '') // remove accidental leading @tag
        .trim();
    } catch (genErr) {
      console.warn('Gemini reporter generation failed/timed out, using in-character fallback:', genErr.message);
    }

    // Always ensure an in-character reply even if Gemini times out or is empty
    if (!cleanReply || cleanReply.length < 5) {
      cleanReply = getFallbackReply(reporterPersona.id, humanName, teamName);
    }

    // Persist the reporter reply to Supabase
    // Threading rule:
    // If manager posted root comment (parentId == null), reporter replies to commentId.
    // If manager posted in an existing thread (parentId != null), reporter replies to parentId to stay in same thread.
    const replyParentId = parentId || commentId;

    if (targetType === 'power_ranking' || rankingId || (weekNumber && !articleId)) {
      const { data: newRow, error: insertErr } = await supabase
        .from('power_ranking_comments')
        .insert({
          ranking_id: rankingId || null,
          week_number: targetWeek,
          manager_name: reporterPersona.name,
          comment: cleanReply,
          parent_id: replyParentId,
          is_reporter: true,
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Failed to insert power ranking reporter reply:', insertErr);
        return null;
      }
      return { success: true, reply: newRow, reporter: reporterPersona.name };
    } else {
      const { data: newRow, error: insertErr } = await supabase
        .from('article_comments')
        .insert({
          article_id: articleId,
          manager_name: reporterPersona.name,
          comment: cleanReply,
          parent_id: replyParentId,
          is_reporter: true,
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Failed to insert article reporter reply:', insertErr);
        return null;
      }
      return { success: true, reply: newRow, reporter: reporterPersona.name };
    }
  } catch (err) {
    console.error('generateAndSaveReporterReply error:', err.message);
    return null;
  }
}
