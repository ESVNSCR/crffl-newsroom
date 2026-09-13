const WP_URL = process.env.WORDPRESS_URL || 'https://crffl.org';
const WP_USER = process.env.WORDPRESS_USERNAME || 'esvnscr@gmail.com';
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD || 'PI28 01Yl ntDK QNuU 2DlE knW7';

export const AUTHOR_WP_IDS = {
  buck_callahan: 3,
  chloe_carmichael: 2,
  marcus_vance: 4,
  marty_sullivan: 5,
};

export const CATEGORY_IDS = {
  'The Grit Desk': 107,
  'The Tuesday Recap': 16,
  'The Spin Room': 108,
  'Power Rankings': 32,
};

/**
 * Extracts title and clean HTML from raw model output that may contain Postie shortcodes
 */
export function parseModelOutput(rawText) {
  let title = '';
  let cleanHtml = rawText;

  // Check for [title ...]
  const titleMatch = rawText.match(/\[title\s+([^\]]+)\]/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Strip shortcodes like [title ...], [author ...], [category ...], [status ...]
  cleanHtml = cleanHtml
    .replace(/\[title\s+[^\]]+\]\s*/gi, '')
    .replace(/\[author\s+[^\]]+\]\s*/gi, '')
    .replace(/\[category\s+[^\]]+\]\s*/gi, '')
    .replace(/\[status\s+[^\]]+\]\s*/gi, '')
    .trim();

  // If title was not found in shortcode, try finding first <h1> or <h2>, or default
  if (!title) {
    const hMatch = cleanHtml.match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
    if (hMatch) {
      title = hMatch[1].replace(/<[^>]+>/g, '').trim();
    } else {
      title = 'CRFFL Times-Herald Column';
    }
  }

  return { title, cleanHtml };
}

/**
 * Publishes or creates a draft post in WordPress via REST API
 */
export async function publishToWordpress({
  title,
  content,
  authorSlug,
  categoryName,
  status = 'publish',
}) {
  const authorId = AUTHOR_WP_IDS[authorSlug];
  const categoryId = CATEGORY_IDS[categoryName];

  const authString = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

  const payload = {
    title,
    content,
    status, // 'publish' or 'draft'
  };

  if (authorId) payload.author = authorId;
  if (categoryId) payload.categories = [categoryId];

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authString}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WordPress API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    link: data.link,
    slug: data.slug,
    status: data.status,
  };
}
