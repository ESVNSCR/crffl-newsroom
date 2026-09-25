import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MANAGERS } from '@/lib/sleeper';
import { getInstantReporterQuip } from '@/lib/cannedReporterMessages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_MANAGERS = [
  'Corey',
  'Ed',
  'Eric',
  'Jeff',
  'KC',
  'Marcus',
  'Mike F.',
  'Mike M.',
  'Pam',
  'Randy',
  'The Commissioner'
];

function resolveManager(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed.toLowerCase().includes('commissioner')) {
    return {
      managerName: 'The Commissioner',
      authName: 'Eric',
      teamName: 'Office of the Commissioner',
      logo: '/logos/league.png',
    };
  }

  const matched = VALID_MANAGERS.find(m => trimmed.toLowerCase().startsWith(m.toLowerCase()));
  if (!matched) return null;

  // Find team details from MANAGERS constant
  const meta = Object.values(MANAGERS).find(
    m => m.managerName.toLowerCase() === matched.toLowerCase()
  ) || {
    managerName: matched,
    teamName: `Team ${matched}`,
    logo: '/logos/league.png',
  };

  return {
    managerName: matched,
    authName: matched,
    teamName: meta.teamName,
    logo: meta.logo,
  };
}

export async function GET() {
  try {
    const { data: messages, error } = await supabase
      .from('newsroom_chat_messages')
      .select('*')
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
    const { managerName, pin, message, matchupContext } = body || {};

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
    let reporterReply = null;

    if (shouldReply) {
      const quip = getInstantReporterQuip({
        reporterId: mentionedReporter === 'random' ? null : mentionedReporter,
        managerName: resolved.managerName,
        teamName: resolved.teamName,
        messageText: trimmedMsg,
        matchupContext: matchupContext || '',
      });

      // Insert reporter quip timestamped immediately after manager message
      const replyTime = new Date(Date.now() + 1000).toISOString();
      const { data: insertedQuip } = await supabase
        .from('newsroom_chat_messages')
        .insert({
          created_at: replyTime,
          sender_type: 'reporter',
          sender_name: quip.name,
          sender_role: quip.role,
          sender_avatar: quip.avatar,
          team_name: 'CRFFL Times-Herald',
          message: quip.message,
        })
        .select()
        .single();

      reporterReply = insertedQuip;
    }

    return NextResponse.json({
      success: true,
      message: inserted,
      reporterReply,
    });
  } catch (err) {
    console.error('Chat message post error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
