/**
 * Utility string and HTML formatters for CRFFL Times-Herald
 */

/**
 * Decodes common HTML entities (e.g. &#39;, &apos;, &quot;, &amp;, &lt;, &gt;, &#8217;, etc.)
 * into human-readable characters.
 */
export function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Formats a date or ISO string consistently in Pacific time (America/Los_Angeles)
 * with en-US locale to prevent server/client hydration mismatches.
 */
export function formatDatePacific(dateInput, options = { month: 'short', day: 'numeric' }) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    ...options,
  });
}

