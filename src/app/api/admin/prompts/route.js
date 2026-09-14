import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { getAllReporterPrompts, saveReporterPrompt, resetReporterPrompt } from '@/lib/promptManager';

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

    const prompts = await getAllReporterPrompts();
    return NextResponse.json({ prompts });
  } catch (err) {
    console.error('Error fetching reporter prompts:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch reporter prompts.' },
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
    const { reporter_id, prompt_guidelines } = body;

    if (!reporter_id || !prompt_guidelines || !prompt_guidelines.trim()) {
      return NextResponse.json(
        { error: 'Missing required parameters: reporter_id and prompt_guidelines.' },
        { status: 400 }
      );
    }

    const saved = await saveReporterPrompt(reporter_id, prompt_guidelines.trim(), 'Commissioner Eric Vaughan');
    return NextResponse.json({ success: true, prompt: saved });
  } catch (err) {
    console.error('Error saving reporter prompt override:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save reporter prompt.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Commissioner clearance required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let reporterId = searchParams.get('reporter_id');

    if (!reporterId) {
      try {
        const body = await request.json();
        reporterId = body.reporter_id;
      } catch {
        // ignore json parse error
      }
    }

    if (!reporterId) {
      return NextResponse.json(
        { error: 'Missing required parameter: reporter_id.' },
        { status: 400 }
      );
    }

    await resetReporterPrompt(reporterId);
    return NextResponse.json({
      success: true,
      message: `Successfully reset ${reporterId} prompt to system defaults.`
    });
  } catch (err) {
    console.error('Error resetting reporter prompt:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to reset reporter prompt.' },
      { status: 500 }
    );
  }
}

