import { NextResponse } from 'next/server';
import { generateMartyRecap } from '@/lib/reporters/martySullivan';
import { generateChloeTransactions } from '@/lib/reporters/chloeCarmichael';
import { generateMarcusPowerRankings } from '@/lib/reporters/marcusVance';
import { generateBuckPreview } from '@/lib/reporters/buckCallahan';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json();
    const { reporter, dryRun = true } = body;

    let result;
    switch (reporter?.toLowerCase()) {
      case 'marty':
      case 'marty_sullivan':
        result = await generateMartyRecap({ dryRun });
        break;
      case 'chloe':
      case 'chloe_carmichael':
        result = await generateChloeTransactions({ dryRun });
        break;
      case 'marcus':
      case 'marcus_vance':
        result = await generateMarcusPowerRankings({ dryRun });
        break;
      case 'buck':
      case 'buck_callahan':
        result = await generateBuckPreview({ dryRun });
        break;
      default:
        return NextResponse.json({ error: `Invalid reporter: ${reporter}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, reporter, dryRun, result });
  } catch (err) {
    console.error('Error running manual reporter generation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

