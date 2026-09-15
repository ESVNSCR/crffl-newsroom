import { decodeHtmlEntities } from './formatters.js';

export const AUTHOR_WP_IDS = {
  buck_callahan: 3,
  chloe_carmichael: 2,
  marcus_vance: 4,
  marty_sullivan: 5,
  commissioner: 6,
};

export const CATEGORY_IDS = {
  'The Grit Desk': 107,
  'The Tuesday Recap': 16,
  'The Spin Room': 108,
  'Power Rankings': 32,
  "Commissioner's Corner": 109,
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
    title = decodeHtmlEntities(titleMatch[1].trim());
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
 * Legacy WordPress publishing placeholder (now deactivated: articles are hosted natively on crffl.org via Supabase)
 */
export async function publishToWordpress() {
  return null;
}


