import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { getReporterSchedules, updateReporterSchedule } from '@/lib/reporterSchedules';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Commissioner clearance required.' },
        { status: 401 }
      );
    }

    const schedules = await getReporterSchedules();
    return NextResponse.json({ success: true, schedules });
  } catch (err) {
    console.error('Error fetching reporter schedules:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch reporter schedules.' },
      { status: 500 }
    );
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
    const { reporter_id, day_of_week, time_of_day, enabled } = body;

    if (!reporter_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: reporter_id.' },
        { status: 400 }
      );
    }

    const updated = await updateReporterSchedule(
      reporter_id,
      { day_of_week, time_of_day, enabled },
      'Commissioner Eric Vaughan'
    );

    return NextResponse.json({ success: true, schedule: updated });
  } catch (err) {
    console.error('Error updating reporter schedule:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update reporter schedule.' },
      { status: 500 }
    );
  }
}

