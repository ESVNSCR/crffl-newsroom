import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      manager_name,
      email,
      phone,
      carrier,
      notify_articles = true,
      notify_rankings = true,
      notify_payouts = true,
      notify_new_bets = true,
      channel_preference = 'both',
    } = body;

    if (!manager_name) {
      return NextResponse.json(
        { error: 'Please select or enter your manager name.' },
        { status: 400 }
      );
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    let cleanPhone = phone ? phone.replace(/\D/g, '') : null;
    if (cleanPhone && cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      cleanPhone = cleanPhone.slice(1);
    }

    if (!cleanEmail && !cleanPhone) {
      return NextResponse.json(
        { error: 'Please provide either an email address or a mobile phone number for alerts.' },
        { status: 400 }
      );
    }

    if (cleanPhone && cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please provide a valid 10-digit phone number (e.g. 480-209-7790).' },
        { status: 400 }
      );
    }

    // Upsert into Supabase alert_subscriptions table
    const subscriptionPayload = {
      manager_name: manager_name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      carrier: carrier ? carrier.toLowerCase().trim() : null,
      notify_articles: Boolean(notify_articles),
      notify_rankings: Boolean(notify_rankings),
      notify_payouts: Boolean(notify_payouts),
      notify_new_bets: Boolean(notify_new_bets),
      channel_preference: channel_preference || 'both',
      updated_at: new Date().toISOString(),
    };

    // Check if an existing subscription exists for this manager/email/phone
    const query = supabase
      .from('alert_subscriptions')
      .select('id');

    if (cleanEmail && cleanPhone) {
      query.or(`email.eq.${cleanEmail},phone.eq.${cleanPhone},manager_name.eq.${manager_name.trim()}`);
    } else if (cleanEmail) {
      query.or(`email.eq.${cleanEmail},manager_name.eq.${manager_name.trim()}`);
    } else {
      query.or(`phone.eq.${cleanPhone},manager_name.eq.${manager_name.trim()}`);
    }

    const { data: existingRows } = await query.limit(1);

    let savedRecord;
    if (existingRows && existingRows.length > 0) {
      const { data, error } = await supabase
        .from('alert_subscriptions')
        .update(subscriptionPayload)
        .eq('id', existingRows[0].id)
        .select()
        .single();

      if (error) throw error;
      savedRecord = data;
    } else {
      const { data, error } = await supabase
        .from('alert_subscriptions')
        .insert([subscriptionPayload])
        .select()
        .single();

      if (error) throw error;
      savedRecord = data;
    }

    return NextResponse.json({
      success: true,
      message: `Alert preferences successfully saved for ${manager_name}!`,
      subscription: savedRecord,
    });
  } catch (err) {
    console.error('Error saving alert subscription:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save alert preferences.' },
      { status: 500 }
    );
  }
}

