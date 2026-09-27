/**
 * Lightweight HTML sanitizer for AI-generated and feed article content.
 * Strips dangerous executable script tags, object/embed/iframe tags, event handlers, and javascript: links.
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  return html
    // Remove script, style, iframe, object, embed tags and their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    // Remove event handlers (e.g., onclick, onerror, onload)
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    // Remove javascript: and data: URIs in href or src
    .replace(/(href|src)\s*=\s*(?:['"]javascript:[^'"]*['"]|javascript:[^\s>]+)/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*(?:['"]data:text\/html[^'"]*['"])/gi, '$1="#"');
}
