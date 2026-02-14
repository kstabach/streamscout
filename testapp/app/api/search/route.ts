import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, getPosterUrl } from '@/lib/tmdb';
import type { SearchResult } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const tmdbResponse = await searchMovies(query);

    const results: SearchResult[] = tmdbResponse.results.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date?.split('-')[0] || 'Unknown',
      poster: getPosterUrl(movie.poster_path, 'w200'),
      rating: movie.vote_average,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search movies' },
      { status: 500 }
    );
  }
}
