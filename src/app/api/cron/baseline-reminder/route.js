import { NextResponse } from 'next/server';
import { getNflState } from '@/lib/sleeper';
import { supabase } from '@/lib/supabase';
import { sendCommissionerBaselineReminder } from '@/lib/notifications';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function handleReminder(request) {
  const { searchParams } = new URL(request.url);
  const requestedWeek = searchParams.get('week');
  const secret = searchParams.get('secret');

  // Verify Cron Secret or Commissioner Session Cookie
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isBearerValid = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isQueryValid = cronSecret && secret === cronSecret;
  const adminCheck = await verifyAdminSession(request);

  if (!isBearerValid && !isQueryValid && !adminCheck.authorized) {
    return NextResponse.json({ error: 'Unauthorized: Commissioner clearance required' }, { status: 401 });
  }

  let week;
  if (requestedWeek) {
    week = Number(requestedWeek);
  } else {
    const state = await getNflState();
    week = state.week || 1;
  }

  const force = searchParams.get('force') === 'true';

  if (!force) {
    // 1. Check if Commissioner has already submitted rankings for this week
    const { data: submission } = await supabase
      .from('rankings_submissions')
      .select('week_number, team_order')
      .eq('week_number', week)
      .maybeSingle();

    if (submission?.team_order && Array.isArray(submission.team_order) && submission.team_order.length > 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Baseline rankings already submitted by Commissioner for Week ${week}.`,
        week,
      });
    }

    // 2. Check if Power Rankings have already been published for this week
    const { data: published } = await supabase
      .from('power_rankings')
      .select('week_number')
      .eq('week_number', week)
      .maybeSingle();

    if (published) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Power rankings for Week ${week} are already published.`,
        week,
      });
    }
  }

  try {
    const result = await sendCommissionerBaselineReminder(week);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      reminder: result,
    });
  } catch (err) {
    console.error('Error sending commissioner baseline reminder:', err);
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return handleReminder(request);
}

export async function POST(request) {
  return handleReminder(request);
}

