import { NextResponse } from 'next/server';
import { getNflState } from '@/lib/sleeper';
import { sendCommissionerBaselineReminder } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function handleReminder(request) {
  const { searchParams } = new URL(request.url);
  const requestedWeek = searchParams.get('week');
  const secret = searchParams.get('secret');

  // Verify Cron Secret if set
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const isBearerValid = authHeader === `Bearer ${cronSecret}`;
    const isQueryValid = secret === cronSecret;
    const isAdminAuth = request.headers.get('x-commissioner-auth') === 'authorized';
    if (!isBearerValid && !isQueryValid && !isAdminAuth && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
