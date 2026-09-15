import { NextResponse } from 'next/server';
import { getNflState } from '@/lib/sleeper';
import { adjudicateWeekContest } from '@/lib/contestAdjudicator';
import { syncHofWeekMatchups } from '@/lib/hofSync';
import { verifyAdminSession } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';

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

  let weeksToAdjudicate = [];
  if (requestedWeek) {
    weeksToAdjudicate = [Number(requestedWeek)];
  } else {
    const state = await getNflState().catch(() => ({ week: 1 }));
    const currentWeek = state.week || 1;

    // Check all uncompleted weeks up to current week from Supabase
    const { data: dbContests } = await supabase
      .from('weekly_contests')
      .select('week_number, status')
      .lte('week_number', currentWeek)
      .neq('status', 'completed')
      .order('week_number', { ascending: true });

    if (dbContests && dbContests.length > 0) {
      weeksToAdjudicate = dbContests.map((c) => c.week_number);
    } else {
      // Fallback: check previous week and current week
      if (currentWeek > 1) {
        weeksToAdjudicate.push(currentWeek - 1);
      }
      weeksToAdjudicate.push(currentWeek);
    }
  }

  try {
    const results = [];
    for (const w of weeksToAdjudicate) {
      const result = await adjudicateWeekContest(w, { force, preview });

      let hofSyncResult = null;
      if (result.isFinal && result.status === 'completed') {
        try {
          hofSyncResult = await syncHofWeekMatchups(w, { force, preview });
        } catch (hofErr) {
          console.warn(`HOF matchup sync notice for week ${w}:`, hofErr.message);
          hofSyncResult = { success: false, error: hofErr.message };
        }
      }

      results.push({
        week: w,
        adjudication: result,
        hofSync: hofSyncResult,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: results.length === 1 ? results[0] : results,
      adjudication: results.length === 1 ? results[0].adjudication : results.map((r) => r.adjudication),
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
