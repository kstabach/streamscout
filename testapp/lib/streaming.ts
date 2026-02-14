import { cache } from './cache';
import { logger } from './logger';
import type { StreamingAvailabilityResponse, StreamingOption } from './types';

const STREAMING_BASE_URL = 'https://streaming-availability.p.rapidapi.com';
const API_KEY = process.env.STREAMING_API_KEY;

if (!API_KEY) {
  logger.warn('STREAMING_API_KEY is not set - streaming info will be unavailable');
}

export async function getStreamingAvailability(tmdbId: number, requestId?: string): Promise<StreamingOption[]> {
  const log = logger.child({ service: 'streaming', requestId });

  if (!API_KEY) {
    log.warn('Streaming API key not configured', { tmdbId });
    return [];
  }

  const cacheKey = `streaming:${tmdbId}`;
  const cached = cache.get<StreamingOption[]>(cacheKey);
  if (cached) {
    log.logCache('hit', cacheKey);
    return cached;
  }

  log.logCache('miss', cacheKey);
  log.info('Streaming availability request', { tmdbId });

  const url = `${STREAMING_BASE_URL}/get?tmdb_id=movie/${tmdbId}&country=us&output_language=en`;
  const start = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      log.warn('Streaming API request failed', {
        tmdbId,
        statusCode: response.status,
      });
      log.logApiCall('Streaming', '/get', response.status, Date.now() - start, {
        tmdbId,
      });
      return [];
    }

    const data: StreamingAvailabilityResponse = await response.json();

    const options: StreamingOption[] = [];
    const usOptions = data.streamingOptions?.us || [];

    for (const option of usOptions) {
      options.push({
        service: option.service.name,
        type: option.type,
        link: option.link,
      });
    }

    log.logApiCall('Streaming', '/get', response.status, Date.now() - start, {
      tmdbId,
      servicesFound: options.length,
      services: options.map(o => o.service),
    });

    cache.set(cacheKey, options);
    log.logCache('set', cacheKey);

    return options;
  } catch (error) {
    log.error('Streaming availability error', error, { tmdbId });
    return [];
  }
}
