import { getNflNews } from './nflNews.js';

export async function getPffNews(limit = 8) {
  return getNflNews(limit);
}
