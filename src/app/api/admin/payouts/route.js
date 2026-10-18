import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/adminAuth';
import { LEAGUE_PAYOUTS } from '@/lib/contests';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('artie_settings')
      .select('value')
      .eq('key', 'league_payouts_override')
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch error for league_payouts_override:', error.message);
    }

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json({ payouts: parsed, isCustom: true });
        }
      } catch (parseErr) {
        console.error('Failed to parse league_payouts_override JSON:', parseErr);
      }
    }

    return NextResponse.json({ payouts: LEAGUE_PAYOUTS, isCustom: false });
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
    const { payouts } = body;

    if (!Array.isArray(payouts) || payouts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: payouts must be a non-empty array.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('artie_settings')
      .upsert(
        {
          key: 'league_payouts_override',
          value: JSON.stringify(payouts),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, payouts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

