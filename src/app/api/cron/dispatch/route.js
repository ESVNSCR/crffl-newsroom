import { NextResponse } from 'next/server';
import { generateMartyRecap } from '@/lib/reporters/martySullivan';
import { generateChloeTransactions } from '@/lib/reporters/chloeCarmichael';
import { generateMarcusPowerRankings } from '@/lib/reporters/marcusVance';
import { generateBuckPreview } from '@/lib/reporters/buckCallahan';
import { getReporterScheduleById, normalizeReporterId } from '@/lib/reporterSchedules';
import { verifyAdminSession } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { getNflState } from '@/lib/sleeper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s timeout for serverless generation

const SCHEDULED_DAYS_FALLBACK = {
  marty: 'Tuesday',
  marty_sullivan: 'Tuesday',
  chloe: 'Wednesday',
  chloe_carmichael: 'Wednesday',
  marcus: 'Tuesday',
  marcus_vance: 'Tuesday',
  buck: 'Thursday',
  buck_callahan: 'Thursday',
};

function getPacificDay() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
  });
  return formatter.format(new Date());
}

async function handleDispatch(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reporter = searchParams.get('reporter')?.toLowerCase();
    const secret = searchParams.get('secret');
    const force = searchParams.get('force') === 'true';

    // Verify Vercel Cron Secret OR Commissioner Session
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const adminCheck = await verifyAdminSession(request);

    if (!adminCheck.authorized) {
      if (cronSecret) {
        const isBearerValid = authHeader === `Bearer ${cronSecret}`;
        const isQueryValid = secret === cronSecret;
        if (!isBearerValid && !isQueryValid) {
          return NextResponse.json({ error: 'Unauthorized: Invalid Cron Secret or Commissioner clearance required' }, { status: 401 });
        }
      }
    }

    if (!reporter) {
      return NextResponse.json(
        { error: 'Missing reporter parameter. Valid options: marty, chloe, marcus, buck' },
        { status: 400 }
      );
    }

    const normId = normalizeReporterId(reporter);
    const validReporters = ['marty_sullivan', 'chloe_carmichael', 'marcus_vance', 'buck_callahan'];
    if (!validReporters.includes(normId)) {
      return NextResponse.json(
        { error: `Unknown reporter: "${reporter}". Valid options: marty, chloe, marcus, buck` },
        { status: 400 }
      );
    }

    // Fetch dynamic schedule from Supabase
    const schedule = await getReporterScheduleById(normId);
    const expectedDay = schedule?.day_of_week || SCHEDULED_DAYS_FALLBACK[reporter] || 'Tuesday';
    const isEnabled = schedule ? schedule.enabled : true;

    if (!isEnabled && !force) {
      return NextResponse.json(
        {
          error: `Publication schedule paused: ${schedule?.reporter_name || reporter} is currently paused in the Commissioner Portal. Use force=true to bypass.`,
          reporter,
        },
        { status: 400 }
      );
    }

    // Schedule Guard: Check day of the week in Pacific Time (Portland, Oregon)
    const currentPacificDay = getPacificDay();

    if (currentPacificDay !== expectedDay && !force) {
      return NextResponse.json(
        {
          error: `Publication schedule gate: ${schedule?.reporter_name || reporter} is scheduled for ${expectedDay}s (Pacific Time / Portland, OR). Current day in Portland is ${currentPacificDay}. Publication blocked to prevent premature article release.`,
          reporter,
          expectedDay,
          currentPacificDay,
          timezone: 'America/Los_Angeles (Portland, OR)',
        },
        { status: 400 }
      );
    }

    // Idempotency check: Don't republish if already published for this week unless force=true
    if (!force) {
      let currentWeek = 1;
      try {
        const nflState = await getNflState();
        currentWeek = nflState?.week || 1;
      } catch (err) {
        console.warn('Could not fetch NFL state for dispatch idempotency check:', err.message);
      }

      // Check if Marcus has already published power rankings for this week
      if (normId === 'marcus_vance') {
        const { data: existingRanking } = await supabase
          .from('power_rankings')
          .select('id, created_at')
          .eq('week_number', currentWeek)
          .maybeSingle();

        if (existingRanking) {
          return NextResponse.json({
            success: true,
            skipped: true,
            message: `Power Rankings for Week ${currentWeek} have already been published. Execution skipped to prevent duplicate release. Use force=true to override.`,
            reporter: normId,
            publishedAt: existingRanking.created_at,
          });
        }
      } else {
        // For other columnists, check newsroom_articles for existing publication this week
        const { data: existingArticle } = await supabase
          .from('newsroom_articles')
          .select('id, title, created_at')
          .eq('author_id', normId)
          .eq('week_number', currentWeek)
          .maybeSingle();

        if (existingArticle) {
          return NextResponse.json({
            success: true,
            skipped: true,
            message: `${schedule?.reporter_name || reporter} has already published for Week ${currentWeek} ("${existingArticle.title}"). Execution skipped to prevent duplicate release. Use force=true to override.`,
            reporter: normId,
            publishedAt: existingArticle.created_at,
          });
        }
      }
    }

    let result;
    switch (normId) {
      case 'marty_sullivan':
        result = await generateMartyRecap({ dryRun: false });
        break;
      case 'chloe_carmichael':
        result = await generateChloeTransactions({ dryRun: false });
        break;
      case 'marcus_vance':
        result = await generateMarcusPowerRankings({ dryRun: false });
        break;
      case 'buck_callahan':
        result = await generateBuckPreview({ dryRun: false });
        break;
    }

    return NextResponse.json({ success: true, reporter: normId, result });
  } catch (err) {
    console.error('Error executing newsroom cron dispatch:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

export async function GET(request) {
  return handleDispatch(request);
}

export async function POST(request) {
  return handleDispatch(request);
}
