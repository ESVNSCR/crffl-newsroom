import { supabase } from './supabase';

const ALL_REPORTERS = [
  { id: 'buck_callahan', name: 'Buck Callahan', role: 'Look-Ahead Preview' },
  { id: 'marty_sullivan', name: 'Marty Sullivan', role: 'Tuesday Recap' },
  { id: 'chloe_carmichael', name: 'Chloe Carmichael', role: 'Transactions & Waiver Wire' },
  { id: 'marcus_vance', name: 'Dr. Marcus Vance', role: 'Data Desk & Power Rankings' },
];

/**
 * Retrieves the author's own recent articles from Supabase for narrative continuity.
 */
export async function getAuthorMemory(authorId, limit = 3) {
  try {
    const { data: articles, error } = await supabase
      .from('newsroom_articles')
      .select('title, summary, week_number, season, created_at')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !articles || articles.length === 0) {
      return 'No prior articles recorded yet this season. Establish your foundational narrative and grudges.';
    }

    return articles
      .map(
        (a, i) =>
          `[ARTICLE ${i + 1} - Week ${a.week_number} (${new Date(a.created_at).toLocaleDateString()})]:\nTitle: "${a.title}"\nKey Angles & Summary: ${a.summary || 'N/A'}`
      )
      .join('\n\n');
  } catch (err) {
    console.error('Error fetching author memory:', err);
    return 'Continuity data temporarily unavailable.';
  }
}

/**
 * Selects a dynamic rival: fetches the most recently published article from ANY of the other three columnists.
 * Alternatively, can randomly pick among recent articles by peers.
 */
export async function getDynamicRival(currentAuthorId, randomRival = false) {
  try {
    const query = supabase
      .from('newsroom_articles')
      .select('author_id, author_name, title, summary, content_html, week_number, created_at')
      .neq('author_id', currentAuthorId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: articles, error } = await query;

    if (error || !articles || articles.length === 0) {
      // Fallback default rival
      const defaultRival = ALL_REPORTERS.find((r) => r.id !== currentAuthorId) || ALL_REPORTERS[0];
      return {
        rivalId: defaultRival.id,
        rivalName: defaultRival.name,
        articleTitle: 'General Pre-Season Musings',
        excerpt: 'No recent article logged yet.',
        promptContext: `Your newsroom target is ${defaultRival.name}. Weave a passing, organic critique of their general philosophy into your piece without breaking character.`,
      };
    }

    let targetArticle;
    if (randomRival && articles.length > 1) {
      const idx = Math.floor(Math.random() * Math.min(articles.length, 3));
      targetArticle = articles[idx];
    } else {
      // Most recent publication by a peer
      targetArticle = articles[0];
    }

    const cleanExcerpt = targetArticle.summary || (targetArticle.content_html || '').replace(/<[^>]+>/g, ' ').slice(0, 400);

    return {
      rivalId: targetArticle.author_id,
      rivalName: targetArticle.author_name,
      articleTitle: targetArticle.title,
      excerpt: cleanExcerpt,
      promptContext: `TARGET FOR ORGANIC REBUTTAL:
Colleague: ${targetArticle.author_name}
Recent Article: "${targetArticle.title}" (Week ${targetArticle.week_number})
Key Excerpt/Position: "${cleanExcerpt}"
CRITICAL INSTRUCTION: Organically weave a sharp, in-character rebuttal or passing critique of ${targetArticle.author_name}'s recent take into one of your paragraphs. Do NOT use phrases like "as my rival" or "my colleague"—snipe at them naturally like real print columnists.`,
    };
  } catch (err) {
    console.error('Error selecting dynamic rival:', err);
    return {
      rivalId: 'unknown',
      rivalName: 'The Newsroom',
      articleTitle: '',
      excerpt: '',
      promptContext: '',
    };
  }
}

