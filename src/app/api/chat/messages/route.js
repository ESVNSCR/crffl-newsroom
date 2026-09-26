import { NextResponse, after } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveManager } from '@/lib/managers';
import { getInstantReporterQuip } from '@/lib/cannedReporterMessages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Opportunistically prune expired messages older than 15 minutes
    await supabase
      .from('newsroom_chat_messages')
      .delete()
      .lt('created_at', fifteenMinsAgo)
      .catch(() => {});

    const { data: messages, error } = await supabase
      .from('newsroom_chat_messages')
      .select('*')
      .gte('created_at', fifteenMinsAgo)
      .order('created_at', { ascending: true })
      .limit(60);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      messages: messages || [],
    });
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const managerName = body?.managerName || body?.manager_name;
    const { pin, message, matchupContext } = body || {};

    if (!managerName || !String(managerName).trim()) {
      return NextResponse.json({ error: 'Manager name is required.' }, { status: 400 });
    }

    if (!pin || !String(pin).trim()) {
      return NextResponse.json({ error: 'Security PIN is required to chat.' }, { status: 401 });
    }

    const trimmedMsg = String(message || '').trim();
    if (!trimmedMsg || trimmedMsg.length < 1) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    if (trimmedMsg.length > 500) {
      return NextResponse.json({ error: 'Message must be under 500 characters.' }, { status: 400 });
    }

    const resolved = resolveManager(managerName);
    if (!resolved) {
      return NextResponse.json({ error: 'Unknown manager identity.' }, { status: 400 });
    }

    // 1. Authenticate PIN against manager_pins via Supabase RPC
    const { data: isValidPin, error: pinError } = await supabase.rpc('verify_manager_pin', {
      p_manager: resolved.authName,
      p_pin: String(pin).trim(),
    });

    if (pinError || !isValidPin) {
      return NextResponse.json({ error: 'Incorrect PIN. Chat transmission rejected.' }, { status: 401 });
    }

    // 2. Insert verified manager message
    const { data: inserted, error: insertError } = await supabase
      .from('newsroom_chat_messages')
      .insert({
        sender_type: 'manager',
        sender_name: resolved.managerName,
        sender_role: resolved.managerName === 'The Commissioner' ? 'League Commissioner' : 'Franchise Owner',
        sender_avatar: resolved.logo,
        team_name: resolved.teamName,
        message: trimmedMsg,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. Evaluate Reporter trigger (Instant contextual response)
    const lowerMsg = trimmedMsg.toLowerCase();
    let mentionedReporter = null;
    if (lowerMsg.includes('@marcus') || lowerMsg.includes('marcus') || lowerMsg.includes('vance')) {
      mentionedReporter = 'marcus_vance';
    } else if (lowerMsg.includes('@buck') || lowerMsg.includes('buck') || lowerMsg.includes('callahan')) {
      mentionedReporter = 'buck_callahan';
    } else if (lowerMsg.includes('@marty') || lowerMsg.includes('marty') || lowerMsg.includes('sullivan')) {
      mentionedReporter = 'marty_sullivan';
    } else if (lowerMsg.includes('@chloe') || lowerMsg.includes('chloe') || lowerMsg.includes('carmichael')) {
      mentionedReporter = 'chloe_carmichael';
    } else if (lowerMsg.includes('@reporter') || lowerMsg.includes('@reporters')) {
      mentionedReporter = 'random';
    }

    // Trigger instant reporter take if tagged or 1-in-3 spontaneous probability
    const shouldReply = Boolean(mentionedReporter) || Math.random() < 0.33;
    let typingReporterMeta = null;

    if (shouldReply) {
      const quip = getInstantReporterQuip({
        reporterId: mentionedReporter === 'random' ? null : mentionedReporter,
        managerName: resolved.managerName,
        teamName: resolved.teamName,
        messageText: trimmedMsg,
        matchupContext: matchupContext || '',
      });

      // Realistic typing delay: 2.2s to 4.0s based on message length (~18ms per character)
      const typingDelayMs = Math.min(4000, Math.max(2200, Math.round(quip.message.length * 18)));

      typingReporterMeta = {
        name: quip.name,
        role: quip.role,
        avatar: quip.avatar,
        delayMs: typingDelayMs,
      };

      // Delay insertion in the background so it feels naturally typed
      after(async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, typingDelayMs));
          const replyTime = new Date().toISOString();
          await supabase
            .from('newsroom_chat_messages')
            .insert({
              created_at: replyTime,
              sender_type: 'reporter',
              sender_name: quip.name,
              sender_role: quip.role,
              sender_avatar: quip.avatar,
              team_name: 'CRFFL Times-Herald',
              message: quip.message,
            });
        } catch (err) {
          console.error('Error inserting delayed reporter reply:', err);
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: inserted,
      typingReporter: typingReporterMeta,
    });
  } catch (err) {
    console.error('Chat message post error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
