import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getLeagueOverview } from '@/lib/sleeper';
import { verifyAdminSession } from '@/lib/adminAuth';
import { generateMarcusPowerRankings } from '@/lib/reporters/marcusVance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const overview = await getLeagueOverview();
    const currentWeek = overview.state.week || 1;

    // Get current week submission if any
    const { data: submission } = await supabase
      .from('rankings_submissions')
      .select('*')
      .eq('week_number', currentWeek)
      .single();

    return NextResponse.json({
      currentWeek,
      rosters: overview.rosters,
      submission: submission || null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
    const { week_number, team_order, notes, publishNow = false } = body;

    const { data, error } = await supabase
      .from('rankings_submissions')
      .upsert(
        {
          week_number,
          season: 2026,
          team_order,
          notes: notes || '',
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'week_number' }
      )
      .select()
      .single();

    if (error) throw error;

    let publishResult = null;
    if (publishNow) {
      publishResult = await generateMarcusPowerRankings({ dryRun: false });
    }

    return NextResponse.json({
      success: true,
      submission: data,
      published: Boolean(publishNow),
      publishResult,
    });
  } catch (err) {
    console.error('Error saving or publishing rankings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

