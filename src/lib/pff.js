import { XMLParser } from 'fast-xml-parser';

export async function getPffNews(limit = 5) {
  try {
    const res = await fetch('https://www.pff.com/feed/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CRFFL-Newsroom/1.0',
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      console.error(`PFF RSS fetch failed with status: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item || [];

    const formatted = (Array.isArray(items) ? items : [items]).slice(0, limit).map((item) => ({
      title: item.title?.trim() || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: (item.description || '').replace(/<[^>]+>/g, '').trim(),
    }));

    return formatted;
  } catch (err) {
    console.error('Error fetching PFF news:', err);
    return [];
  }
}
