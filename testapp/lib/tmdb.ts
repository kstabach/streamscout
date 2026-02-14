import { cache } from './cache';
import { logger } from './logger';
import type { TMDBSearchResponse, TMDBMovieDetails } from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  throw new Error('TMDB_API_KEY is not set in environment variables');
}

export async function searchMovies(query: string, requestId?: string): Promise<TMDBSearchResponse> {
  const log = logger.child({ service: 'tmdb', requestId });
  const cacheKey = `tmdb:search:${query}`;

  const cached = cache.get<TMDBSearchResponse>(cacheKey);
  if (cached) {
    log.logCache('hit', cacheKey);
    return cached;
  }

  log.logCache('miss', cacheKey);
  log.info('TMDB search', { query });

  const url = `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  const start = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      log.error('TMDB search failed', new Error(`TMDB API error: ${response.status}`), {
        query,
        statusCode: response.status,
      });
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    log.logApiCall('TMDB', '/search/movie', response.status, Date.now() - start, {
      query,
      resultCount: data.results?.length,
    });

    cache.set(cacheKey, data);
    log.logCache('set', cacheKey);

    return data;
  } catch (error) {
    log.error('TMDB search failed', error, { query });
    throw error;
  }
}

export async function getMovieDetails(movieId: number, requestId?: string): Promise<TMDBMovieDetails> {
  const log = logger.child({ service: 'tmdb', requestId });
  const cacheKey = `tmdb:movie:${movieId}`;

  const cached = cache.get<TMDBMovieDetails>(cacheKey);
  if (cached) {
    log.logCache('hit', cacheKey);
    return cached;
  }

  log.logCache('miss', cacheKey);
  log.info('TMDB movie details', { movieId });

  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=videos`;
  const start = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      log.error('TMDB movie details failed', new Error(`TMDB API error: ${response.status}`), {
        movieId,
        statusCode: response.status,
      });
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    log.logApiCall('TMDB', `/movie/${movieId}`, response.status, Date.now() - start, {
      movieId,
      title: data.title,
    });

    cache.set(cacheKey, data);
    log.logCache('set', cacheKey);

    return data;
  } catch (error) {
    log.error('TMDB movie details failed', error, { movieId });
    throw error;
  }
}

export function getPosterUrl(posterPath: string | null, size: 'w200' | 'w500' = 'w500'): string {
  if (!posterPath) return '/placeholder-poster.jpg';
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}
