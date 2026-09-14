import { NextResponse } from 'next/server';
import { getNflState } from '@/lib/sleeper';
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

