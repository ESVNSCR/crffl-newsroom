import { NextResponse } from 'next/server';
import { generateMartyRecap } from '@/lib/reporters/martySullivan';
import { generateChloeTransactions } from '@/lib/reporters/chloeCarmichael';
import { generateMarcusPowerRankings } from '@/lib/reporters/marcusVance';
import { generateBuckPreview } from '@/lib/reporters/buckCallahan';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s timeout for serverless generation

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reporter = searchParams.get('reporter')?.toLowerCase();
    const secret = searchParams.get('secret');

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
      default:
        return NextResponse.json(
          { error: `Unknown reporter: "${reporter}". Valid options: marty, chloe, marcus, buck` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, reporter, result });
  } catch (err) {
    console.error('Error executing newsroom cron dispatch:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
