import { cache } from './cache';
import { logger } from './logger';
import type { OMDbResponse } from './types';

const OMDB_BASE_URL = 'http://www.omdbapi.com/';
const API_KEY = process.env.OMDB_API_KEY;

if (!API_KEY) {
  logger.warn('OMDB_API_KEY is not set - ratings will be limited');
}

export async function getOMDbRatings(imdbId: string, requestId?: string): Promise<OMDbResponse | null> {
  const log = logger.child({ service: 'omdb', requestId });

  if (!API_KEY) {
    log.warn('OMDb API key not configured', { imdbId });
    return null;
  }

  const cacheKey = `omdb:${imdbId}`;
  const cached = cache.get<OMDbResponse>(cacheKey);
  if (cached) {
    log.logCache('hit', cacheKey);
    return cached;
  }

  log.logCache('miss', cacheKey);
  log.info('OMDb ratings request', { imdbId });

  const url = `${OMDB_BASE_URL}?apikey=${API_KEY}&i=${imdbId}`;
  const start = Date.now();

  try {
    const response = await fetch(url);

    if (!response.ok) {
      log.warn('OMDb API request failed', {
        imdbId,
        statusCode: response.status,
      });
      log.logApiCall('OMDb', '/', response.status, Date.now() - start, { imdbId });
      return null;
    }

    const data = await response.json();

    if (data.Response === 'False') {
      log.warn('OMDb returned no data', { imdbId, error: data.Error });
      log.logApiCall('OMDb', '/', response.status, Date.now() - start, {
        imdbId,
        omdbResponse: 'False',
        error: data.Error,
      });
      return null;
    }

    log.logApiCall('OMDb', '/', response.status, Date.now() - start, {
      imdbId,
      title: data.Title,
      ratingsCount: data.Ratings?.length,
    });

    cache.set(cacheKey, data);
    log.logCache('set', cacheKey);

    return data;
  } catch (error) {
    log.error('OMDb API error', error, { imdbId });
    return null;
  }
}

export function parseRottenTomatoesScore(ratings: OMDbResponse['Ratings']): number | undefined {
  const rtRating = ratings.find(r => r.Source === 'Rotten Tomatoes');
  if (!rtRating) return undefined;

  const match = rtRating.Value.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : undefined;
}
