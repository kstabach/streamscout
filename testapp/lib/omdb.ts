import { cache } from './cache';
import type { OMDbResponse } from './types';

const OMDB_BASE_URL = 'http://www.omdbapi.com/';
const API_KEY = process.env.OMDB_API_KEY;

if (!API_KEY) {
  console.warn('OMDB_API_KEY is not set - ratings will be limited');
}

export async function getOMDbRatings(imdbId: string): Promise<OMDbResponse | null> {
  if (!API_KEY) return null;

  const cacheKey = `omdb:${imdbId}`;
  const cached = cache.get<OMDbResponse>(cacheKey);
  if (cached) return cached;

  const url = `${OMDB_BASE_URL}?apikey=${API_KEY}&i=${imdbId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.Response === 'False') return null;

    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('OMDb API error:', error);
    return null;
  }
}

export function parseRottenTomatoesScore(ratings: OMDbResponse['Ratings']): number | undefined {
  const rtRating = ratings.find(r => r.Source === 'Rotten Tomatoes');
  if (!rtRating) return undefined;

  const match = rtRating.Value.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : undefined;
}
