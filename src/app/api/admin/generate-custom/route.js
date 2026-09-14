import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { generateCustomReporterArticle, REPORTER_PERSONAS } from '@/lib/customArticleGenerator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    const { reporterId, customPrompt, targetManager, category, week } = body;

    if (!reporterId || !REPORTER_PERSONAS[reporterId]) {
      return NextResponse.json(
        { error: `Invalid reporter requested: ${reporterId}` },
        { status: 400 }
      );
    }

    const article = await generateCustomReporterArticle({
      reporterId,
      customPrompt,
      targetManager,
      category,
      week,
    });

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (err) {
    console.error('Error generating custom reporter dispatch:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate custom dispatch.' },
      { status: 500 }
    );
  }
}

