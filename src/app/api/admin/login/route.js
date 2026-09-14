import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  COOKIE_NAME,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  verifyCommissionerPin,
  createSessionToken,
} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // 1. Rate Limit Check
    const rateStatus = checkRateLimit(ip);
    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Access locked for ${rateStatus.minutesLeft} minute(s).`,
          locked: true,
          minutesLeft: rateStatus.minutesLeft,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { pin } = body;

    // 2. Verify Commissioner PIN
    const isValid = verifyCommissionerPin(pin);
    if (!isValid) {
      const record = recordFailedAttempt(ip);
      return NextResponse.json(
        {
          error: 'Invalid Commissioner PIN. Access denied.',
          remaining: record.remaining,
        },
        { status: 401 }
      );
    }

    // 3. Clear failed attempts on success
    clearRateLimit(ip);

    // 4. Generate signed session token and set httpOnly cookie
    const token = createSessionToken();
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: 'Commissioner clearance verified.',
    });
  } catch (err) {
    console.error('Error during admin login:', err);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}

