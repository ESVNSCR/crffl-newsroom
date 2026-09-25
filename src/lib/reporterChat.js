import { ai, DEFAULT_MODEL } from './gemini';
import { supabase } from './supabase';
import { REPORTER_PERSONAS } from './reporterPersonas';

export const REPORTERS_META = {
  marcus_vance: {
    id: 'marcus_vance',
    name: 'Dr. Marcus Vance',
    role: 'Senior Analytics Editor',
    avatar: '/reporters/marcus-vance-avatar.png',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  buck_callahan: {
    id: 'buck_callahan',
    name: 'Buck Callahan',
    role: 'Chief Trench Correspondent',
    avatar: '/reporters/buck-callahan-avatar.png',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  marty_sullivan: {
    id: 'marty_sullivan',
    name: 'Marty Sullivan',
    role: 'Traditionalist Columnist',
    avatar: '/reporters/marty-sullivan-avatar.png',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  chloe_carmichael: {
    id: 'chloe_carmichael',
    name: 'Chloe Carmichael',
    role: 'Senior League Insider',
    avatar: '/reporters/chloe-carmichael-avatar.png',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
};

/**
 * Generates an in-character live chat comment from a CRFFL reporter.
 */
export async function generateReporterChatComment({
  reporterId = null,
  recentMessages = [],
  matchupContext = '',
  triggerReason = 'chat_banter',
}) {
  try {
    // 1. Pick a reporter if not specified
    let targetReporterId = reporterId;
    const availableReporters = ['marcus_vance', 'buck_callahan', 'marty_sullivan', 'chloe_carmichael'];
    
    if (!targetReporterId || !REPORTERS_META[targetReporterId]) {
      targetReporterId = availableReporters[Math.floor(Math.random() * availableReporters.length)];
    }

    const reporterMeta = REPORTERS_META[targetReporterId];
    const persona = REPORTER_PERSONAS[targetReporterId] || {};

    // Format recent chat context
    const chatSnippet = (recentMessages || [])
      .slice(-6)
      .map(m => `${m.sender_name} (${m.team_name || m.sender_role || 'Manager'}): "${m.message}"`)
      .join('\n');

    const prompt = `
You are ${reporterMeta.name}, ${reporterMeta.role} at the CRFFL Times-Herald (Columbia River Fantasy Football League).
You are hanging out in the live "GRITZone War Room" chat alongside the 10 league managers watching live games.

PERSONA GUIDELINES:
${persona.promptGuidelines || ''}

CURRENT LIVE LEAGUE MATCHUP SITUATION:
${matchupContext || 'Week 3 live games are in progress. Several matchups are hanging in the balance.'}

RECENT CHAT FROM LEAGUE MANAGERS:
${chatSnippet || '(The chat has been quiet, you are chiming in to stir up some discussion.)'}

TASK:
Drop a quick, punchy 1-to-2 sentence comment into the live war room chat.
- MUST be strictly in character (${reporterMeta.name}).
- Mention a specific manager, team, player, or live score from the current matchups or banter back at the chat.
- Length: 1 to 2 sentences MAXIMUM. Keep it fast, authentic, and engaging like a real Discord or Slack sports chat.
- Do NOT output quotes, prefixes like "${reporterMeta.name}:", or markdown formatting. Output raw conversational text only.
    `.trim();

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.85,
        maxOutputTokens: 120,
      }
    });

    const commentText = response?.text?.trim()?.replace(/^["']|["']$/g, '');
    if (!commentText) return null;

    // Insert into newsroom_chat_messages
    const { data: inserted, error: insertError } = await supabase
      .from('newsroom_chat_messages')
      .insert({
        sender_type: 'reporter',
        sender_name: reporterMeta.name,
        sender_role: reporterMeta.role,
        sender_avatar: reporterMeta.avatar,
        team_name: 'CRFFL Times-Herald',
        message: commentText,
        metadata: {
          reporterId: targetReporterId,
          triggerReason,
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert reporter comment:', insertError);
      return null;
    }

    return inserted;
  } catch (err) {
    console.error('generateReporterChatComment error:', err);
    return null;
  }
}
