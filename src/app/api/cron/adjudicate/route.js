import { NextResponse } from 'next/server';
import { getNflState } from '@/lib/sleeper';
import { adjudicateWeekContest } from '@/lib/contestAdjudicator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handleAdjudication(request) {
  const { searchParams } = new URL(request.url);
  const requestedWeek = searchParams.get('week');
  const secret = searchParams.get('secret');

  // Verify Cron Secret if set
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const isBearerValid = authHeader === `Bearer ${cronSecret}`;
    const isQueryValid = secret === cronSecret;
    // Allow internal admin calls or matching cron secret
    const isAdminAuth = request.headers.get('x-commissioner-auth') === 'authorized';
    if (!isBearerValid && !isQueryValid && !isAdminAuth && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let weekToAdjudicate;
  if (requestedWeek) {
    weekToAdjudicate = Number(requestedWeek);
  } else {
    const state = await getNflState();
    // Default to the current NFL week
    weekToAdjudicate = state.week || 1;
  }

  try {
    const result = await adjudicateWeekContest(weekToAdjudicate);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      adjudication: result,
    });
  } catch (err) {
    console.error('Error during weekly contest adjudication:', err);
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return handleAdjudication(request);
}

export async function POST(request) {
  return handleAdjudication(request);
}
