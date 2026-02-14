import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, getPosterUrl } from '@/lib/tmdb';
import { validateSearchQuery } from '@/lib/validation';
import { logger, generateRequestId } from '@/lib/logger';
import type { SearchResult } from '@/lib/types';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ requestId, route: '/api/search' });
  const startTime = Date.now();

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  log.info('Search request received', { query });

  // Validate search query
  const validation = validateSearchQuery(query);
  if (!validation.valid) {
    log.warn('Invalid search query', { query, error: validation.error });
    log.logRequest('GET', '/api/search', 400, Date.now() - startTime);
    return NextResponse.json(
      { error: validation.error, requestId },
      { status: 400 }
    );
  }

  try {
    // After validation, query is guaranteed to be non-null and valid
    const tmdbResponse = await searchMovies(query!, requestId);

    const results: SearchResult[] = tmdbResponse.results.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date?.split('-')[0] || 'Unknown',
      poster: getPosterUrl(movie.poster_path, 'w200'),
      rating: movie.vote_average,
    }));

    log.info('Search completed successfully', {
      query,
      resultCount: results.length,
    });

    log.logRequest('GET', '/api/search', 200, Date.now() - startTime, {
      resultCount: results.length,
    });

    return NextResponse.json({ results, requestId });
  } catch (error) {
    log.error('Search failed', error, { query });
    log.logRequest('GET', '/api/search', 500, Date.now() - startTime);
    return NextResponse.json(
      { error: 'Failed to search movies', requestId },
      { status: 500 }
    );
  }
}
