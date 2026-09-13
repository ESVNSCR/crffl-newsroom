import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getLeagueOverview } from '@/lib/sleeper';

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
    const body = await request.json();
    const { week_number, team_order, notes } = body;

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
    return NextResponse.json({ success: true, submission: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
