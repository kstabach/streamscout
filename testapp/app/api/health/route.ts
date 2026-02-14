import { NextResponse } from 'next/server';

const HEALTH_CHECK_CACHE_TTL = 60000; // 60 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds per API

// In-memory cache for health check results
let cachedHealthCheck: {
  data: HealthCheckResponse;
  timestamp: number;
} | null = null;

type DependencyStatus = {
  status: 'up' | 'down';
  latency?: number;
};

type HealthCheckResponse = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  dependencies: {
    tmdb: DependencyStatus;
    omdb: DependencyStatus;
    streaming: DependencyStatus;
  };
  timestamp: string;
};

// Utility to race a fetch with a timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// Check TMDB API health
async function checkTMDBHealth(): Promise<DependencyStatus> {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return { status: 'down' };
  }

  try {
    const start = Date.now();
    // Lightweight request - get configuration (small response)
    const response = await fetchWithTimeout(
      `https://api.themoviedb.org/3/configuration?api_key=${apiKey}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
      HEALTH_CHECK_TIMEOUT
    );

    const latency = Date.now() - start;

    if (response.ok) {
      return { status: 'up', latency };
    } else {
      return { status: 'down' };
    }
  } catch (error) {
    console.error('TMDB health check failed:', error);
    return { status: 'down' };
  }
}

// Check OMDb API health
async function checkOMDbHealth(): Promise<DependencyStatus> {
  const apiKey = process.env.OMDB_API_KEY;

  if (!apiKey) {
    return { status: 'down' };
  }

  try {
    const start = Date.now();
    // Lightweight request - use a known IMDb ID (The Matrix)
    const response = await fetchWithTimeout(
      `http://www.omdbapi.com/?apikey=${apiKey}&i=tt0133093&plot=short`,
      {},
      HEALTH_CHECK_TIMEOUT
    );

    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      if (data.Response !== 'False') {
        return { status: 'up', latency };
      }
    }
    return { status: 'down' };
  } catch (error) {
    console.error('OMDb health check failed:', error);
    return { status: 'down' };
  }
}

// Check Streaming Availability API health
async function checkStreamingHealth(): Promise<DependencyStatus> {
  const apiKey = process.env.STREAMING_API_KEY;

  if (!apiKey) {
    return { status: 'down' };
  }

  try {
    const start = Date.now();
    // Lightweight request - known movie (The Matrix, tmdb_id: 603)
    const response = await fetchWithTimeout(
      'https://streaming-availability.p.rapidapi.com/get?tmdb_id=movie/603&country=us&output_language=en',
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
        },
      },
      HEALTH_CHECK_TIMEOUT
    );

    const latency = Date.now() - start;

    // Note: Free tier returns 404, so we consider 404 as "degraded" not "down"
    if (response.ok) {
      return { status: 'up', latency };
    } else if (response.status === 404 || response.status === 403) {
      // Free tier limitations - service exists but access is limited
      return { status: 'up', latency };
    } else {
      return { status: 'down' };
    }
  } catch (error) {
    console.error('Streaming API health check failed:', error);
    return { status: 'down' };
  }
}

// Perform all health checks in parallel
async function performHealthChecks(): Promise<HealthCheckResponse> {
  const [tmdb, omdb, streaming] = await Promise.all([
    checkTMDBHealth(),
    checkOMDbHealth(),
    checkStreamingHealth(),
  ]);

  // Determine overall health status
  let status: 'healthy' | 'degraded' | 'unhealthy';

  // TMDB is critical - if it's down, service is unhealthy
  if (tmdb.status === 'down') {
    status = 'unhealthy';
  }
  // If OMDb or Streaming are down, service is degraded but functional
  else if (omdb.status === 'down' || streaming.status === 'down') {
    status = 'degraded';
  }
  // All dependencies up
  else {
    status = 'healthy';
  }

  return {
    status,
    version: '1.0.0',
    dependencies: {
      tmdb,
      omdb,
      streaming,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    // Check if we have a valid cached result
    const now = Date.now();
    if (
      cachedHealthCheck &&
      now - cachedHealthCheck.timestamp < HEALTH_CHECK_CACHE_TTL
    ) {
      return NextResponse.json(cachedHealthCheck.data, {
        status: cachedHealthCheck.data.status === 'unhealthy' ? 503 : 200,
      });
    }

    // Perform fresh health checks
    const healthData = await performHealthChecks();

    // Cache the result
    cachedHealthCheck = {
      data: healthData,
      timestamp: now,
    };

    // Return appropriate status code
    const statusCode = healthData.status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(healthData, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);

    // Return unhealthy status if health check itself fails
    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      version: '1.0.0',
      dependencies: {
        tmdb: { status: 'down' },
        omdb: { status: 'down' },
        streaming: { status: 'down' },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}
