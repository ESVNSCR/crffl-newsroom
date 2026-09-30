import { supabase } from './supabase.js';

const ALL_REPORTERS = [
  { id: 'buck_callahan', name: 'Buck Callahan', role: 'Look-Ahead & Trench Warfare Desk' },
  { id: 'marty_sullivan', name: 'Marty Sullivan', role: 'Tuesday Recap & Traditionalist Desk' },
  { id: 'chloe_carmichael', name: 'Chloe Carmichael', role: 'Waiver Wire & Front-Office Espionage Desk' },
  { id: 'marcus_vance', name: 'Dr. Marcus Vance', role: 'Applied Mathematics & Fantasy Arbitrage Desk' },
];

/**
 * Retrieves the Commissioner's official executive dispatches and memorandums.
 * All reporters must read these so they are completely informed on league rulings,
 * trade reversals, constitution interpretations, and front-office mandates.
 */
export async function getCommissionerMemory(season = 2026) {
  try {
    const { data: dispatches, error } = await supabase
      .from('newsroom_articles')
      .select('title, summary, content_html, week_number, created_at')
      .or(`author_id.in.(commissioner,the-commissioner),category_name.eq.Commissioner's Corner`)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !dispatches || dispatches.length === 0) {
      return 'No official executive memorandums recorded yet this season by Commissioner Eric Vaughan.';
    }

    return dispatches
      .map((d, i) => {
        const plainText = (d.content_html || d.summary || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const excerpt = plainText.length > 800 ? plainText.slice(0, 800) + '...' : plainText;
        return `[OFFICIAL COMMISSIONER MEMORANDUM #${i + 1} - Week ${d.week_number} (${new Date(d.created_at).toLocaleDateString()})]:
Title: "${d.title}"
Executive Ruling / Content: ${excerpt}`;
      })
      .join('\n\n');
  } catch (err) {
    console.error('Error fetching commissioner memory:', err);
    return 'Commissioner dispatches currently unavailable.';
  }
}

/**
 * Retrieves the entirety of the author's own works for the season so they understand
 * their running jokes, storylines, and evolution—while avoiding stale repetition.
 */
export async function getAuthorMemory(authorId, season = 2026) {
  try {
    const { data: articles, error } = await supabase
      .from('newsroom_articles')
      .select('title, summary, content_html, week_number, season, created_at')
      .eq('author_id', authorId)
      .eq('status', 'published')
      .order('created_at', { ascending: true })
      .limit(15);

    if (error || !articles || articles.length === 0) {
      return 'No prior articles recorded yet this season. Establish your foundational voice, distinctive philosophy, and character quirks.';
    }

    const dossier = articles.map((a, i) => {
      const plainText = (a.content_html || a.summary || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const firstTwoSentences = plainText.split('. ').slice(0, 2).join('. ') + '.';
      return `• [Season Week ${a.week_number}]: "${a.title}"
  Opening Hook Used: "${firstTwoSentences}"
  Core Take: ${a.summary || 'Weekly column dispatch'}`;
    }).join('\n\n');

    return `YOUR COMPLETE PUBLISHED CATALOG THIS SEASON (READ FOR CONTINUITY & FRESHNESS):
${dossier}

CRITICAL ANTI-REPETITION & PERSONALITY GUIDELINES:
1. Maintain running storylines and ongoing character arcs across the season, but DO NOT recycle identical opening tropes or one-note jokes.
   - For Marty Sullivan: DO NOT open every column with drinking black coffee that strips trailer-hitch enamel. Rotate through varied observational routines (e.g. greasy diner breakfast specials, cheap cigars, memory of 1980s high school mud bowls, crooked replacement referees, or bad AM radio call-ins).
   - For Chloe Carmichael: Mix high-society espionage with insider locker-room leaks, midnight phone bills, group-chat screenshot receipts, and corporate corporate-speak mockery.
   - For Dr. Marcus Vance: Vary the mathematical analogies (e.g. Monte Carlo simulations, Bayes' theorem, regression residuals, thermodynamic entropy, quantum decoherence).
   - For Buck Callahan: Rotate trench metaphors (e.g. dirt under fingernails, broken tape, smelling salts, cold whirlpool tanks, blitz pickups).
2. TONE MANDATE: Be witty, sharp, and snarky! Poke good-natured fun at your fellow columnists, Commissioner Eric Vaughan, and the franchise managers, but NEVER be mean-spirited, malicious, or profane. Keep it clever and enjoyable to read.`;
  } catch (err) {
    console.error('Error fetching author memory:', err);
    return 'Continuity data temporarily unavailable.';
  }
}

/**
 * Randomly chooses a rival among the other columnists (Marty, Chloe, Marcus, Buck)
 * and retrieves their recent body of work so the author can organically poke fun at their theories.
 */
export async function getDynamicRival(currentAuthorId) {
  try {
    // 1. Filter out the author themselves to pick from remaining peers
    const peerReporters = ALL_REPORTERS.filter((r) => r.id !== currentAuthorId);
    if (peerReporters.length === 0) {
      return { rivalId: 'unknown', rivalName: 'The Newsroom', promptContext: '' };
    }

    // 2. Randomly select one rival for this week's banter
    const chosenRival = peerReporters[Math.floor(Math.random() * peerReporters.length)];

    // 3. Fetch several recent articles written by this specific rival
    const { data: rivalArticles } = await supabase
      .from('newsroom_articles')
      .select('title, summary, content_html, week_number, created_at')
      .eq('author_id', chosenRival.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(3);

    let rivalBodyOfWork = 'No recent articles logged for this colleague yet.';
    if (rivalArticles && rivalArticles.length > 0) {
      rivalBodyOfWork = rivalArticles
        .map((a) => {
          const plain = (a.content_html || a.summary || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const take = plain.length > 250 ? plain.slice(0, 250) + '...' : plain;
          return `  - Week ${a.week_number}: "${a.title}" -> "${take}"`;
        })
        .join('\n');
    }

    const promptContext = `TARGET FOR NATURAL COLLEGIAL BANTER THIS WEEK:
Colleague: ${chosenRival.name} (${chosenRival.role})
Their Recent Columns & Takes:
${rivalBodyOfWork}

INSTRUCTION FOR RIVALRY INTERACTION:
- Organically poke fun at ${chosenRival.name}'s ongoing theories, recurring obsessions, or philosophical flaws somewhere in your column.
- DO NOT use meta labels like "my designated rival", "my foil", or "as assigned by editorial".
- Make it sound completely natural and conversational—like sharp, witty sports columnists ribbing each other across the newsroom floor.`;

    return {
      rivalId: chosenRival.id,
      rivalName: chosenRival.name,
      articleTitle: rivalArticles?.[0]?.title || '',
      excerpt: rivalArticles?.[0]?.summary || '',
      promptContext,
    };
  } catch (err) {
    console.error('Error selecting dynamic rival:', err);
    return {
      rivalId: 'newsroom_peers',
      rivalName: 'The Editorial Board',
      articleTitle: '',
      excerpt: '',
      promptContext: '',
    };
  }
}

