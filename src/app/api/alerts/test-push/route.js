import { NextResponse } from 'next/server';
import { sendPushNotification, broadcastPushNotification } from '@/lib/pushNotifications';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      subscription,
      category,
      title = 'CRFFL Times-Herald Dispatch Alert',
      body: messageBody = 'This is a live test of the CRFFL Push Notification network.',
      url = '/',
    } = body;

    if (subscription && subscription.endpoint) {
      const res = await sendPushNotification(subscription, {
        title,
        body: messageBody,
        url,
        icon: '/logos/league.png',
        tag: `crffl-test-${Date.now()}`,
      });

      if (!res.success) {
        return NextResponse.json(
          { error: res.error || 'Failed to send test push to device.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Direct test push delivered to device!',
        result: res,
      });
    }

    // Broadcasting to subscribers requires commissioner clearance
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Commissioner clearance required for push broadcasts.' },
        { status: 401 }
      );
    }

    // Broadcast to all or category subscribers
    const broadcastResult = await broadcastPushNotification({
      title,
      body: messageBody,
      url,
      category,
      tag: `crffl-broadcast-${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      message: `Broadcast complete. Sent to ${broadcastResult.sent} subscriber(s).`,
      details: broadcastResult,
    });
  } catch (err) {
    console.error('Error in test-push route:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to trigger test push.' },
      { status: 500 }
    );
  }
}

