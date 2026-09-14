import { NextResponse } from 'next/server';
import { getNflState } from '@/lib/sleeper';
import { adjudicateWeekContest } from '@/lib/contestAdjudicator';
import { syncHofWeekMatchups } from '@/lib/hofSync';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handleAdjudication(request) {
  const { searchParams } = new URL(request.url);
  const requestedWeek = searchParams.get('week');
  const secret = searchParams.get('secret');
  const force = searchParams.get('force') === 'true';
  const preview = searchParams.get('preview') === 'true';

  // Verify Cron Secret or Commissioner Session Cookie
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isBearerValid = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isQueryValid = cronSecret && secret === cronSecret;
  const adminCheck = await verifyAdminSession(request);

  if (!isBearerValid && !isQueryValid && !adminCheck.authorized) {
    return NextResponse.json({ error: 'Unauthorized: Commissioner clearance required' }, { status: 401 });
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
    const result = await adjudicateWeekContest(weekToAdjudicate, { force, preview });

    // Automatically synchronize official finalized matchups to Hall of Fame (hof_matchups)
    let hofSyncResult = null;
    try {
      hofSyncResult = await syncHofWeekMatchups(weekToAdjudicate, { force, preview });
    } catch (hofErr) {
      console.warn('HOF matchup sync notice:', hofErr.message);
      hofSyncResult = { success: false, error: hofErr.message };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      adjudication: result,
      hofSync: hofSyncResult,
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

