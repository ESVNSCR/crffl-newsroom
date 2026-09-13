import { NextResponse } from 'next/server';
import { generateMartyRecap } from '@/lib/reporters/martySullivan';
import { generateChloeTransactions } from '@/lib/reporters/chloeCarmichael';
import { generateMarcusPowerRankings } from '@/lib/reporters/marcusVance';
import { generateBuckPreview } from '@/lib/reporters/buckCallahan';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Commissioner clearance required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reporter, dryRun = true, forcePreseason } = body;

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
        result = await generateMarcusPowerRankings({ dryRun, forcePreseason });
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

