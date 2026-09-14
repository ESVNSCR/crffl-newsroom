import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_MANAGERS = [
  'Corey',
  'Ed',
  'Eric',
  'Jeff',
  'KC',
  'Marcus',
  'Mike F.',
  'Mike M.',
  'Pam',
  'Randy',
  'The Commissioner'
];

function resolveAuthManager(name) {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed.toLowerCase().includes('commissioner')) {
    return 'Eric';
  }
  // Strip team name if formatted as "Corey (Team CoreyCash)"
  const matched = VALID_MANAGERS.find(m => trimmed.toLowerCase().startsWith(m.toLowerCase()));
  return matched || trimmed;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('article_id');

    if (!articleId) {
      return NextResponse.json({ error: 'Missing article_id parameter.' }, { status: 400 });
    }

    const { data: comments, error } = await supabase
      .from('article_comments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      comments: comments || [],
      count: (comments || []).length
    });
  } catch (err) {
    console.error('Error fetching article comments:', err);
    return NextResponse.json({ error: 'Failed to retrieve comments.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { article_id, manager_name, pin, comment, parent_id } = body || {};

    if (!article_id) {
      return NextResponse.json({ error: 'Article ID is required.' }, { status: 400 });
    }

    if (!manager_name || !String(manager_name).trim()) {
      return NextResponse.json({ error: 'Manager identity is required.' }, { status: 400 });
    }

    if (!pin || !String(pin).trim()) {
      return NextResponse.json({ error: 'Security PIN is required to post.' }, { status: 401 });
    }

    const trimmedComment = String(comment || '').trim();
    if (!trimmedComment || trimmedComment.length < 1) {
      return NextResponse.json({ error: 'Comment text cannot be empty.' }, { status: 400 });
    }

    if (trimmedComment.length > 1000) {
      return NextResponse.json({ error: 'Comment must be under 1,000 characters.' }, { status: 400 });
    }

    // 1. Authenticate manager PIN via PostgreSQL RPC
    const authManager = resolveAuthManager(manager_name);
    const { data: isValidPin, error: pinError } = await supabase.rpc('verify_manager_pin', {
      p_manager: authManager,
      p_pin: String(pin).trim()
    });

    if (pinError || !isValidPin) {
      return NextResponse.json({ error: 'Incorrect security PIN. Comment transmission rejected.' }, { status: 401 });
    }

    // 2. Validate that article exists
    const { data: articleCheck, error: articleError } = await supabase
      .from('newsroom_articles')
      .select('id')
      .eq('id', article_id)
      .single();

    if (articleError || !articleCheck) {
      return NextResponse.json({ error: 'Target article not found.' }, { status: 404 });
    }

    // 3. If parent_id provided, validate that parent comment exists
    if (parent_id) {
      const { data: parentCheck, error: parentError } = await supabase
        .from('article_comments')
        .select('id, article_id')
        .eq('id', parent_id)
        .single();

      if (parentError || !parentCheck || parentCheck.article_id !== article_id) {
        return NextResponse.json({ error: 'Parent comment to reply to does not exist.' }, { status: 404 });
      }
    }

    // 4. Insert new comment (or reply)
    const { data: newComment, error: insertError } = await supabase
      .from('article_comments')
      .insert({
        article_id,
        manager_name: manager_name.trim(),
        comment: trimmedComment,
        parent_id: parent_id || null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      comment: newComment
    });
  } catch (err) {
    console.error('Error posting article comment:', err);
    return NextResponse.json({ error: 'Failed to post comment.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');
    const managerName = searchParams.get('manager');
    const pin = searchParams.get('pin');

    if (!commentId || !managerName || !pin) {
      return NextResponse.json({ error: 'Missing required credentials to delete comment.' }, { status: 400 });
    }

    const authManager = resolveAuthManager(managerName);
    const { data: isValidPin } = await supabase.rpc('verify_manager_pin', {
      p_manager: authManager,
      p_pin: String(pin).trim()
    });

    if (!isValidPin) {
      return NextResponse.json({ error: 'Invalid security PIN.' }, { status: 401 });
    }

    // Check if comment belongs to this manager or if manager is Eric (Commissioner)
    const { data: existingComment } = await supabase
      .from('article_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    }

    const isOwner = resolveAuthManager(existingComment.manager_name).toLowerCase() === authManager.toLowerCase();
    const isCommissioner = authManager.toLowerCase() === 'eric';

    if (!isOwner && !isCommissioner) {
      return NextResponse.json({ error: 'You do not have permission to delete this comment.' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('article_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: 'Comment deleted successfully.' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    return NextResponse.json({ error: 'Failed to delete comment.' }, { status: 500 });
  }
}

