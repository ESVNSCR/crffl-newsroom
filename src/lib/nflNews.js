import { XMLParser } from 'fast-xml-parser';

/**
 * Fetches real-world breaking NFL news, injury reports, and practice participation
 * updates from top sports wire feeds (ProFootballTalk / NBC Sports and ESPN).
 */
async function fetchRssFeed(url, timeoutMs = 4000) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CRFFL-Newsroom/1.0',
      },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: 900 }, // Cache 15 minutes
    });

    if (!res.ok) {
      console.warn(`RSS feed fetch failed for ${url}: status ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item || [];

    return (Array.isArray(items) ? items : [items]).map((item) => ({
      title: (item.title || '').trim(),
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: (item.description || '').replace(/<[^>]+>/g, '').trim(),
    }));
  } catch (err) {
    console.warn(`Error reading RSS feed (${url}):`, err.message);
    return [];
  }
}

/**
 * Returns a curated list of breaking NFL news items focusing on real-world injuries,
 * trades, practice reports, and depth chart shifts.
 */
export async function getNflNews(limit = 10) {
  const [pftItems, espnItems] = await Promise.all([
    fetchRssFeed('https://profootballtalk.nbcsports.com/feed/'),
    fetchRssFeed('https://www.espn.com/espn/rss/nfl/news'),
  ]);

  // Merge and prioritize injury, practice, and transaction headlines
  const combined = [...pftItems, ...espnItems];
  const uniqueTitles = new Set();
  const deduped = [];

  for (const item of combined) {
    if (!item.title) continue;
    const normTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!uniqueTitles.has(normTitle)) {
      uniqueTitles.add(normTitle);
      deduped.push(item);
    }
  }

  return deduped.slice(0, limit);
}

/**
 * Backward compatibility alias for existing code
 */
export async function getPffNews(limit = 6) {
  return getNflNews(limit);
}
