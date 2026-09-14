import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);

    return NextResponse.json({
      success: true,
      message: 'Commissioner session terminated.',
    });
  } catch (err) {
    console.error('Error during admin logout:', err);
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}

