import { NextResponse } from 'next/server';
import { generateMartyRecap } from '@/lib/reporters/martySullivan';
import { generateChloeTransactions } from '@/lib/reporters/chloeCarmichael';
import { generateMarcusPowerRankings } from '@/lib/reporters/marcusVance';
import { generateBuckPreview } from '@/lib/reporters/buckCallahan';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s timeout for serverless generation

const SCHEDULED_DAYS = {
  marty: 'Tuesday',
  marty_sullivan: 'Tuesday',
  chloe: 'Wednesday',
  chloe_carmichael: 'Wednesday',
  marcus: 'Wednesday',
  marcus_vance: 'Wednesday',
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reporter = searchParams.get('reporter')?.toLowerCase();
    const secret = searchParams.get('secret');
    const force = searchParams.get('force') === 'true';

    // Verify Vercel Cron Secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const isBearerValid = authHeader === `Bearer ${cronSecret}`;
      const isQueryValid = secret === cronSecret;
      if (!isBearerValid && !isQueryValid) {
        return NextResponse.json({ error: 'Unauthorized: Invalid Cron Secret' }, { status: 401 });
      }
    }

    if (!reporter || !SCHEDULED_DAYS[reporter]) {
      return NextResponse.json(
        { error: `Unknown reporter: "${reporter}". Valid options: marty, chloe, marcus, buck` },
        { status: 400 }
      );
    }

    // Schedule Guard: Check day of the week in Pacific Time (Portland, Oregon)
    const currentPacificDay = getPacificDay();
    const expectedDay = SCHEDULED_DAYS[reporter];

    if (currentPacificDay !== expectedDay && !force) {
      return NextResponse.json(
        {
          error: `Publication schedule gate: ${reporter} is scheduled for ${expectedDay}s (Pacific Time / Portland, OR). Current day in Portland is ${currentPacificDay}. Publication blocked to prevent premature article release.`,
          reporter,
          expectedDay,
          currentPacificDay,
          timezone: 'America/Los_Angeles (Portland, OR)',
        },
        { status: 400 }
      );
    }

    let result;
    switch (reporter) {
      case 'marty':
      case 'marty_sullivan':
        result = await generateMartyRecap({ dryRun: false });
        break;
      case 'chloe':
      case 'chloe_carmichael':
        result = await generateChloeTransactions({ dryRun: false });
        break;
      case 'marcus':
      case 'marcus_vance':
        result = await generateMarcusPowerRankings({ dryRun: false });
        break;
      case 'buck':
      case 'buck_callahan':
        result = await generateBuckPreview({ dryRun: false });
        break;
    }

    return NextResponse.json({ success: true, reporter, result });
  } catch (err) {
    console.error('Error executing newsroom cron dispatch:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
