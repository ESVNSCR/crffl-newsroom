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
 * Automatically closes any unclosed HTML tags to preserve preview & layout DOM integrity
 */
export function closeUnclosedHtmlTags(html) {
  if (!html || typeof html !== 'string') return html || '';
  const targetTags = ['p', 'blockquote', 'strong', 'em', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'span', 'div'];
  const openTags = [];
  const tagRegex = /<\/?([a-z0-9]+)(?:\s+[^>]*)?>/gi;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isSelfClosing = fullTag.endsWith('/>') || ['br', 'hr', 'img', 'input', 'meta'].includes(tagName);
    if (isSelfClosing) continue;

    if (fullTag.startsWith('</')) {
      const lastIndex = openTags.lastIndexOf(tagName);
      if (lastIndex !== -1) {
        openTags.splice(lastIndex, 1);
      }
    } else {
      if (targetTags.includes(tagName)) {
        openTags.push(tagName);
      }
    }
  }

  let closedHtml = html;
  while (openTags.length > 0) {
    const tag = openTags.pop();
    closedHtml += `</${tag}>`;
  }
  return closedHtml;
}

/**
 * Extracts title and clean HTML from raw model output that may contain Postie shortcodes
 */
export function parseModelOutput(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { title: 'CRFFL Times-Herald Column', cleanHtml: '' };
  }

  let text = rawText.trim();

  // Strip wrapping markdown code blocks if the model emitted ```html ... ```
  text = text.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let title = '';

  // Check for [title ...]
  const titleMatch = text.match(/\[title\s+([^\]]+)\]/i);
  if (titleMatch) {
    title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Strip shortcodes like [title ...], [author ...], [category ...], [status ...]
  let cleanHtml = text
    .replace(/\[title\s+[^\]]+\]\s*/gi, '')
    .replace(/\[author\s+[^\]]+\]\s*/gi, '')
    .replace(/\[category\s+[^\]]+\]\s*/gi, '')
    .replace(/\[status\s+[^\]]+\]\s*/gi, '')
    .trim();

  // Strip any residual code fences in case shortcodes were inside or outside
  cleanHtml = cleanHtml.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Strip any trailing broken/incomplete tag opening at the very end of generation (e.g. `<p` or `<strong` without `>`)
  cleanHtml = cleanHtml.replace(/<[^>]*$/, '').trim();

  // Defensively close any unclosed HTML tags to prevent layout bleeding or browser cutoff
  cleanHtml = closeUnclosedHtmlTags(cleanHtml);

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


