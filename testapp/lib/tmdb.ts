import { cache } from './cache';
import type { TMDBSearchResponse, TMDBMovieDetails } from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  throw new Error('TMDB_API_KEY is not set in environment variables');
}

export async function searchMovies(query: string): Promise<TMDBSearchResponse> {
  const cacheKey = `tmdb:search:${query}`;
  const cached = cache.get<TMDBSearchResponse>(cacheKey);
  if (cached) return cached;

  const url = `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  const data = await response.json();
  cache.set(cacheKey, data);
  return data;
}

export async function getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
  const cacheKey = `tmdb:movie:${movieId}`;
  const cached = cache.get<TMDBMovieDetails>(cacheKey);
  if (cached) return cached;

  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=videos`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  const data = await response.json();
  cache.set(cacheKey, data);
  return data;
}

export function getPosterUrl(posterPath: string | null, size: 'w200' | 'w500' = 'w500'): string {
  if (!posterPath) return '/placeholder-poster.jpg';
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}
