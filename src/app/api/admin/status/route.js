import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await verifyAdminSession(request);
    return NextResponse.json({
      authenticated: auth.authorized,
    });
  } catch (err) {
    console.error('Error checking admin session status:', err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
