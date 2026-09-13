import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: contests, error } = await supabase
      .from('weekly_contests')
      .select('*')
      .order('week_number', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ contests: contests || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { week_number, contest_name, description, prize, winner_manager, winner_team, winning_score, status } = body;

    const { data, error } = await supabase
      .from('weekly_contests')
      .upsert(
        {
          week_number: Number(week_number),
          season: 2026,
          contest_name,
          description: description || '',
          prize: prize || '$10',
          winner_manager: winner_manager || null,
          winner_team: winner_team || null,
          winning_score: winning_score || null,
          status: status || 'upcoming',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'week_number' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, contest: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

