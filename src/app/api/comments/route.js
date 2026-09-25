import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

import { resolveManager } from '@/lib/managers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('article_id');
    const rankingId = searchParams.get('ranking_id');
    const weekNumber = searchParams.get('week_number');

    // 1. Power Rankings comments
    if (rankingId || weekNumber) {
      let query = supabase
        .from('power_ranking_comments')
        .select('*')
        .order('created_at', { ascending: true });

      if (rankingId) {
        query = query.eq('ranking_id', rankingId);
      } else if (weekNumber) {
        query = query.eq('week_number', Number(weekNumber));
      }

      const { data: comments, error } = await query;
      if (error) throw error;

      return NextResponse.json({
        success: true,
        comments: comments || [],
        count: (comments || []).length
      });
    }

    // 2. Article comments
    if (!articleId) {
      return NextResponse.json({ error: 'Missing article_id or ranking_id parameter.' }, { status: 400 });
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
    console.error('Error fetching comments:', err);
    return NextResponse.json({ error: 'Failed to retrieve comments.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      article_id,
      ranking_id,
      week_number,
      manager_name,
      pin,
      comment,
      parent_id,
      target_type
    } = body || {};

    const isRanking = target_type === 'power_ranking' || Boolean(ranking_id) || (Boolean(week_number) && !article_id);

    if (!isRanking && !article_id) {
      return NextResponse.json({ error: 'Target identifier (article_id or ranking_id) is required.' }, { status: 400 });
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
    const resolved = resolveManager(manager_name);
    const authManager = resolved ? resolved.authName : manager_name.trim();
    const { data: isValidPin, error: pinError } = await supabase.rpc('verify_manager_pin', {
      p_manager: authManager,
      p_pin: String(pin).trim()
    });

    if (pinError || !isValidPin) {
      return NextResponse.json({ error: 'Incorrect security PIN. Comment transmission rejected.' }, { status: 401 });
    }

    // --- Branch A: Power Rankings Comments ---
    if (isRanking) {
      let targetRankingId = ranking_id;
      let targetWeekNumber = week_number ? Number(week_number) : null;

      if (!targetRankingId && targetWeekNumber) {
        const { data: rRow } = await supabase
          .from('power_rankings')
          .select('id, week_number')
          .eq('week_number', targetWeekNumber)
          .maybeSingle();
        if (rRow) {
          targetRankingId = rRow.id;
        }
      } else if (targetRankingId && !targetWeekNumber) {
        const { data: rRow } = await supabase
          .from('power_rankings')
          .select('id, week_number')
          .eq('id', targetRankingId)
          .maybeSingle();
        if (rRow) {
          targetWeekNumber = rRow.week_number;
        }
      }

      if (!targetRankingId) {
        return NextResponse.json({ error: 'Target power rankings edition not found.' }, { status: 404 });
      }

      // If parent_id provided, validate parent comment
      if (parent_id) {
        const { data: parentCheck, error: parentError } = await supabase
          .from('power_ranking_comments')
          .select('id, ranking_id')
          .eq('id', parent_id)
          .single();

        if (parentError || !parentCheck || parentCheck.ranking_id !== targetRankingId) {
          return NextResponse.json({ error: 'Parent comment to reply to does not exist.' }, { status: 404 });
        }
      }

      const { data: newComment, error: insertError } = await supabase
        .from('power_ranking_comments')
        .insert({
          ranking_id: targetRankingId,
          week_number: targetWeekNumber || 1,
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
    }

    // --- Branch B: Article Comments ---
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
    console.error('Error posting comment:', err);
    return NextResponse.json({ error: 'Failed to post comment.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');
    const managerName = searchParams.get('manager');
    const pin = searchParams.get('pin');
    const type = searchParams.get('type'); // 'article', 'ranking', or auto-detect

    if (!commentId || !managerName || !pin) {
      return NextResponse.json({ error: 'Missing required credentials to delete comment.' }, { status: 400 });
    }

    const authManager = resolveAuthManager(managerName);

    // If type is explicitly 'ranking', call delete_power_ranking_comment
    if (type === 'ranking') {
      const { data: result, error: rpcError } = await supabase.rpc('delete_power_ranking_comment', {
        p_comment_id: commentId,
        p_manager: authManager,
        p_pin: String(pin).trim(),
      });

      if (rpcError) {
        console.error('delete_power_ranking_comment RPC error:', rpcError);
        return NextResponse.json({ error: 'Failed to delete comment.' }, { status: 500 });
      }

      if (!result?.success) {
        const status = result?.error === 'Invalid security PIN' ? 401 : (result?.error === 'Permission denied' ? 403 : 400);
        return NextResponse.json({ error: result?.error || 'Failed to delete comment.' }, { status });
      }

      return NextResponse.json({ success: true, message: result.message || 'Comment deleted successfully.' });
    }

    // Default: try delete_article_comment first, fall back to delete_power_ranking_comment if not found
    let { data: result, error: rpcError } = await supabase.rpc('delete_article_comment', {
      p_comment_id: commentId,
      p_manager: authManager,
      p_pin: String(pin).trim(),
    });

    if (result?.error === 'Comment not found') {
      const fallback = await supabase.rpc('delete_power_ranking_comment', {
        p_comment_id: commentId,
        p_manager: authManager,
        p_pin: String(pin).trim(),
      });
      if (!fallback.error) {
        result = fallback.data;
        rpcError = null;
      }
    }

    if (rpcError) {
      console.error('delete comment RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to delete comment.' }, { status: 500 });
    }

    if (!result?.success) {
      const status = result?.error === 'Invalid security PIN' ? 401 : (result?.error === 'Permission denied' ? 403 : 400);
      return NextResponse.json({ error: result?.error || 'Failed to delete comment.' }, { status });
    }

    return NextResponse.json({ success: true, message: result.message || 'Comment deleted successfully.' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    return NextResponse.json({ error: 'Failed to delete comment.' }, { status: 500 });
  }
}


