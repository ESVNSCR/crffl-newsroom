import webpush from 'web-push';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './pushConfig';
import { supabase } from './supabase';

// Configure Web Push with VAPID keys
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/**
 * Format a stored subscription or raw subscription for web-push library
 */
function formatSubscription(sub) {
  if (sub.keys && sub.keys.p256dh) {
    return sub;
  }
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };
}

/**
 * Send an individual web push notification
 */
export async function sendPushNotification(subscription, payload) {
  try {
    const formatted = formatSubscription(subscription);
    const result = await webpush.sendNotification(
      formatted,
      JSON.stringify(payload)
    );
    return { success: true, result };
  } catch (err) {
    console.error('Error sending push notification to endpoint:', subscription.endpoint, err);

    // If subscription is expired or unsubscribed, remove from database
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`Pruning expired push subscription: ${subscription.endpoint}`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);
    }

    return {
      success: false,
      error: err.message,
      statusCode: err.statusCode,
    };
  }
}

/**
 * Broadcast push notification to subscribers based on category preference
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.body
 * @param {string} [options.url]
 * @param {string} [options.category] 'articles' | 'rankings' | 'bets' | 'payouts'
 * @param {string} [options.icon]
 * @param {string} [options.tag]
 */
export async function broadcastPushNotification({
  title,
  body,
  url = '/',
  category = null,
  icon = '/logos/league.png',
  tag = 'crffl-alert',
}) {
  try {
    let query = supabase.from('push_subscriptions').select('*');

    if (category === 'articles') {
      query = query.eq('notify_articles', true);
    } else if (category === 'rankings') {
      query = query.eq('notify_rankings', true);
    } else if (category === 'bets') {
      query = query.eq('notify_new_bets', true);
    } else if (category === 'payouts') {
      query = query.eq('notify_payouts', true);
    }

    const { data: subscribers, error } = await query;
    if (error) {
      console.error('Error fetching push subscribers:', error);
      return { total: 0, sent: 0, failed: 0, error: error.message };
    }

    if (!subscribers || subscribers.length === 0) {
      return { total: 0, sent: 0, failed: 0, message: 'No subscribers found for this category.' };
    }

    const payload = {
      title,
      body,
      url,
      icon,
      badge: '/logos/league.png',
      tag,
      timestamp: Date.now(),
    };

    const results = await Promise.allSettled(
      subscribers.map((sub) => sendPushNotification(sub, payload))
    );

    let sent = 0;
    let failed = 0;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return {
      total: subscribers.length,
      sent,
      failed,
    };
  } catch (err) {
    console.error('Error broadcasting push notifications:', err);
    return { error: err.message };
  }
}
