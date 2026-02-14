import { cache } from './cache';
import type { StreamingAvailabilityResponse, StreamingOption } from './types';

const STREAMING_BASE_URL = 'https://streaming-availability.p.rapidapi.com';
const API_KEY = process.env.STREAMING_API_KEY;

if (!API_KEY) {
  console.warn('STREAMING_API_KEY is not set - streaming info will be unavailable');
}

export async function getStreamingAvailability(tmdbId: number): Promise<StreamingOption[]> {
  if (!API_KEY) return [];

  const cacheKey = `streaming:${tmdbId}`;
  const cached = cache.get<StreamingOption[]>(cacheKey);
  if (cached) return cached;

  const url = `${STREAMING_BASE_URL}/get?tmdb_id=movie/${tmdbId}&country=us&output_language=en`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      console.error('Streaming API error:', response.status);
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

    cache.set(cacheKey, options);
    return options;
  } catch (error) {
    console.error('Streaming availability error:', error);
    return [];
  }
}
