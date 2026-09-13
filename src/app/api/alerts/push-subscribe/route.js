import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { VAPID_PUBLIC_KEY } from '@/lib/pushConfig';
import { sendPushNotification } from '@/lib/pushNotifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    publicKey: VAPID_PUBLIC_KEY,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      subscription,
      manager_name = 'Fan / Observer',
      notify_articles = true,
      notify_rankings = true,
      notify_new_bets = true,
      notify_payouts = true,
      send_welcome = true,
    } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid push subscription object.' },
        { status: 400 }
      );
    }

    const payload = {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      manager_name: (manager_name || '').trim(),
      notify_articles: Boolean(notify_articles),
      notify_rankings: Boolean(notify_rankings),
      notify_new_bets: Boolean(notify_new_bets),
      notify_payouts: Boolean(notify_payouts),
      user_agent: request.headers.get('user-agent') || 'Unknown',
      updated_at: new Date().toISOString(),
    };

    // Upsert on endpoint
    const { data: existingRows } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .limit(1);

    let savedRecord;
    if (existingRows && existingRows.length > 0) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .update(payload)
        .eq('id', existingRows[0].id)
        .select()
        .single();

      if (error) throw error;
      savedRecord = data;
    } else {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      savedRecord = data;
    }

    // Optionally send welcome push notification immediately
    if (send_welcome) {
      const welcomeName = manager_name && manager_name !== 'Other' ? ` ${manager_name}` : '';
      await sendPushNotification(subscription, {
        title: 'CRFFL Times-Herald Alerts Enabled',
        body: `Welcome${welcomeName}! Push notifications are now active on this device.`,
        url: '/',
        icon: '/logos/league.png',
        tag: 'crffl-welcome',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Push notifications active on this device!',
      subscription: savedRecord,
    });
  } catch (err) {
    console.error('Error saving push subscription:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save push subscription.' },
      { status: 500 }
    );
  }
}

