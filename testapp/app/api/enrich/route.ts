import { NextRequest, NextResponse } from 'next/server';
import { getMovieDetails, getPosterUrl } from '@/lib/tmdb';
import { getOMDbRatings, parseRottenTomatoesScore } from '@/lib/omdb';
import { getStreamingAvailability } from '@/lib/streaming';
import type { EnrichedMovie } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const movieId = searchParams.get('id');

  if (!movieId) {
    return NextResponse.json(
      { error: 'Movie ID is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch all data in parallel
    const [tmdbData, streamingOptions] = await Promise.all([
      getMovieDetails(parseInt(movieId, 10)),
      getStreamingAvailability(parseInt(movieId, 10)),
    ]);

    // Fetch OMDb ratings if we have IMDb ID
    let omdbData = null;
    if (tmdbData.imdb_id) {
      omdbData = await getOMDbRatings(tmdbData.imdb_id);
    }

    // Find trailer
    const trailer = tmdbData.videos?.results.find(
      v => v.type === 'Trailer' && v.site === 'YouTube' && v.official
    ) || tmdbData.videos?.results.find(
      v => v.type === 'Trailer' && v.site === 'YouTube'
    );

    // Aggregate ratings
    const imdbRating = omdbData?.imdbRating ? parseFloat(omdbData.imdbRating) : undefined;
    const rtRating = omdbData ? parseRottenTomatoesScore(omdbData.Ratings) : undefined;

    let combinedRating: number | undefined;
    if (imdbRating && rtRating) {
      // Convert RT to 10 scale and average
      combinedRating = (imdbRating + (rtRating / 10)) / 2;
    } else if (imdbRating) {
      combinedRating = imdbRating;
    } else if (rtRating) {
      combinedRating = rtRating / 10;
    }

    const enrichedMovie: EnrichedMovie = {
      id: tmdbData.id,
      title: tmdbData.title,
      year: tmdbData.release_date?.split('-')[0] || 'Unknown',
      poster: getPosterUrl(tmdbData.poster_path),
      overview: tmdbData.overview,
      rating: {
        imdb: imdbRating,
        rottenTomatoes: rtRating,
        combined: combinedRating,
      },
      streamingOptions,
      runtime: tmdbData.runtime,
      genres: tmdbData.genres.map(g => g.name),
      trailerKey: trailer?.key,
    };

    return NextResponse.json(enrichedMovie);
  } catch (error) {
    console.error('Enrich error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich movie data' },
      { status: 500 }
    );
  }
}
