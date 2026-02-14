import { NextRequest, NextResponse } from 'next/server';
import { getMovieDetails, getPosterUrl } from '@/lib/tmdb';
import { getOMDbRatings, parseRottenTomatoesScore } from '@/lib/omdb';
import { getStreamingAvailability } from '@/lib/streaming';
import { validateMovieId } from '@/lib/validation';
import { logger, generateRequestId } from '@/lib/logger';
import type { EnrichedMovie, StreamingOption } from '@/lib/types';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ requestId, route: '/api/enrich' });
  const startTime = Date.now();

  const searchParams = request.nextUrl.searchParams;
  const movieId = searchParams.get('id');

  log.info('Enrich request received', { movieId });

  // Validate movie ID
  const validation = validateMovieId(movieId);
  if (!validation.valid) {
    log.warn('Invalid movie ID', { movieId, error: validation.error });
    log.logRequest('GET', '/api/enrich', 400, Date.now() - startTime);
    return NextResponse.json(
      { error: validation.error, requestId },
      { status: 400 }
    );
  }

  try {
    // After validation, movieId is guaranteed to be a valid integer string
    const validMovieId = parseInt(movieId!, 10);

    log.info('Fetching movie data from APIs', { movieId: validMovieId });

    // Fetch all data in parallel with resilience
    const results = await Promise.allSettled([
      getMovieDetails(validMovieId, requestId),
      getStreamingAvailability(validMovieId, requestId),
    ]);

    // TMDB is critical - fail if it's unavailable
    const tmdbResult = results[0];
    if (tmdbResult.status === 'rejected') {
      log.error('TMDB fetch failed', tmdbResult.reason, { movieId: validMovieId });
      log.logRequest('GET', '/api/enrich', 500, Date.now() - startTime);
      return NextResponse.json(
        { error: 'Failed to fetch movie details from TMDB', requestId },
        { status: 500 }
      );
    }
    const tmdbData = tmdbResult.value;

    log.info('TMDB data retrieved successfully', {
      movieId: validMovieId,
      title: tmdbData.title,
    });

    // Streaming is optional - gracefully handle failure
    const streamingResult = results[1];
    let streamingOptions: StreamingOption[] = [];
    if (streamingResult.status === 'fulfilled') {
      streamingOptions = streamingResult.value;
      log.info('Streaming data retrieved', {
        movieId: validMovieId,
        streamingCount: streamingOptions.length,
      });
    } else {
      log.warn('Streaming availability fetch failed', {
        movieId: validMovieId,
        error: streamingResult.reason,
      });
    }

    // Fetch OMDb ratings if we have IMDb ID (optional)
    let omdbData = null;
    if (tmdbData.imdb_id) {
      try {
        omdbData = await getOMDbRatings(tmdbData.imdb_id, requestId);
        log.info('OMDb ratings retrieved', {
          movieId: validMovieId,
          imdbId: tmdbData.imdb_id,
        });
      } catch (error) {
        log.warn('OMDb fetch failed', {
          movieId: validMovieId,
          imdbId: tmdbData.imdb_id,
          error,
        });
        // Continue without OMDb data
      }
    } else {
      log.debug('No IMDb ID available for OMDb lookup', { movieId: validMovieId });
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

    log.info('Movie enrichment completed successfully', {
      movieId: validMovieId,
      title: enrichedMovie.title,
      hasRatings: !!(imdbRating || rtRating),
      hasStreaming: streamingOptions.length > 0,
      hasTrailer: !!enrichedMovie.trailerKey,
    });

    log.logRequest('GET', '/api/enrich', 200, Date.now() - startTime, {
      movieId: validMovieId,
      streamingCount: streamingOptions.length,
    });

    return NextResponse.json({ ...enrichedMovie, requestId });
  } catch (error) {
    log.error('Enrich failed', error, { movieId });
    log.logRequest('GET', '/api/enrich', 500, Date.now() - startTime);
    return NextResponse.json(
      { error: 'Failed to enrich movie data', requestId },
      { status: 500 }
    );
  }
}
