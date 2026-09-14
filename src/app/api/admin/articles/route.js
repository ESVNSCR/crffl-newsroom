import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { publishToWordpress } from '@/lib/wordpress';
import { COLUMNISTS } from '@/lib/columnists';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function slugify(text) {
  return (text || 'dispatch')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export async function GET(request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Commissioner clearance required.' },
        { status: 401 }
      );
    }

    const { data: articles, error } = await supabase
      .from('newsroom_articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, articles: articles || [] });
  } catch (err) {
    console.error('Error fetching admin articles:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    const {
      id,
      title,
      summary,
      contentHtml,
      authorId = 'commissioner',
      authorName,
      categoryName,
      weekNumber = 1,
      season = 2026,
      status = 'published',
      publishToWp = true,
      broadcastPush = false,
      bannerUrl = null,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Article title is required.' }, { status: 400 });
    }

    if (!contentHtml || !contentHtml.trim()) {
      return NextResponse.json({ error: 'Article content is required.' }, { status: 400 });
    }

    // Resolve author metadata
    const columnist = COLUMNISTS[authorId];
    const finalAuthorName = authorName || columnist?.name || (authorId === 'commissioner' ? 'Eric Vaughan' : 'Staff Reporter');
    const finalCategoryName = categoryName || columnist?.category || (authorId === 'commissioner' ? "Commissioner's Corner" : 'Dispatch');
    const finalBannerUrl = bannerUrl || (authorId === 'commissioner' ? '/commissioner-banner.png' : null);

    const baseSlug = slugify(title);
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    let wpResult = null;
    if (publishToWp && status === 'published') {
      try {
        wpResult = await publishToWordpress({
          title: title.trim(),
          content: contentHtml,
          authorSlug: authorId,
          categoryName: finalCategoryName,
          status: 'publish',
        });
      } catch (wpErr) {
        console.warn('WordPress auto-publishing warning:', wpErr.message);
      }
    }

    const articlePayload = {
      title: title.trim(),
      summary: summary?.trim() || title.trim(),
      content_html: contentHtml,
      author_id: authorId,
      author_name: finalAuthorName,
      category_name: finalCategoryName,
      week_number: Number(weekNumber) || 1,
      season: Number(season) || 2026,
      status,
      slug,
      wordpress_post_id: wpResult?.id || null,
      wordpress_url: wpResult?.link || null,
    };

    if (id) {
      articlePayload.id = id;
    }

    const { data: savedArticle, error: dbError } = await supabase
      .from('newsroom_articles')
      .upsert(articlePayload)
      .select()
      .single();

    if (dbError) throw dbError;

    // Optional push broadcast for published dispatches
    let pushResult = null;
    if (broadcastPush && status === 'published') {
      try {
        const { protocol, host } = new URL(request.url);
        const origin = `${protocol}//${host}`;
        const pushRes = await fetch(`${origin}/api/alerts/test-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `CRFFL Dispatch: ${title.trim()}`,
            body: summary?.trim() ? summary.slice(0, 120) : `New dispatch published by ${finalAuthorName}.`,
            category: finalCategoryName,
            url: '/',
          }),
        });
        pushResult = await pushRes.json();
      } catch (pushErr) {
        console.warn('Push alert broadcast warning:', pushErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      article: savedArticle,
      wordpress: wpResult,
      push: pushResult,
    });
  } catch (err) {
    console.error('Error saving article:', err);
    return NextResponse.json({ error: err.message || 'Failed to save article.' }, { status: 500 });
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
    const articleId = searchParams.get('id');

    if (!articleId) {
      return NextResponse.json({ error: 'Article ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('newsroom_articles')
      .delete()
      .eq('id', articleId);

    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: articleId });
  } catch (err) {
    console.error('Error deleting article:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
