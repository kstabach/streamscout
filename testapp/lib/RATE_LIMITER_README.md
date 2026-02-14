# Rate Limiter Implementation

## Overview

This rate limiter implementation protects StreamScout from exceeding external API quotas and prevents IP bans. It uses a **token bucket algorithm** with configurable limits for each API service.

## Files

- **`rate-limiter.ts`** - Main implementation
- **`rate-limiter.example.ts`** - Integration examples (reference only, do not import)
- **`rate-limiter.test.ts`** - Validation tests

## Algorithm: Token Bucket

The token bucket algorithm provides smooth rate limiting with burst capacity:

1. **Tokens represent available requests** - Each API call consumes 1 token
2. **Tokens refill at constant rate** - e.g., 4 tokens per second for TMDB
3. **Maximum bucket capacity** - Prevents unlimited bursting (e.g., 40 tokens max for TMDB)
4. **Automatic queuing** - When no tokens available, requests wait until refill

### Why Token Bucket?

- **Allows bursts** - First N requests execute immediately (good for initial page load)
- **Smooth limiting** - Distributes requests evenly over time
- **Fair queuing** - First-in-first-out request ordering
- **Simple implementation** - No complex sliding windows or distributed coordination needed

## Configuration

### Current Limits (Conservative Defaults)

```typescript
TMDB:      40 requests per 10 seconds (4/second sustained)
OMDb:      10 requests per second
Streaming: 10 requests per second (RapidAPI free tier)
```

### Why These Limits?

- **TMDB: 40/10s** - Official documented limit; allows burst of 40, then 4/second
- **OMDb: 10/s** - Conservative for free tier; adjust based on your tier
- **Streaming: 10/s** - RapidAPI free tier default; adjust if you upgrade

## Usage

### Basic Integration Pattern

```typescript
import { rateLimiters } from './rate-limiter';

async function fetchData() {
  // Acquire token BEFORE fetch
  await rateLimiters.tmdb.acquire();

  // Make API call
  const response = await fetch(url);
  return response.json();
}
```

### Integration Steps for Existing API Clients

1. **Import the rate limiter** at the top of your API client file:

```typescript
import { rateLimiters } from './rate-limiter';
```

2. **Add `await rateLimiters.<api>.acquire()` before each fetch**:

**TMDB Client (`lib/tmdb.ts`):**

```typescript
export async function searchMovies(query: string) {
  await rateLimiters.tmdb.acquire(); // ← Add this line
  const response = await fetch(url, { headers });
  // ... rest of code
}
```

**OMDb Client (`lib/omdb.ts`):**

```typescript
export async function getOMDbRatings(imdbId: string) {
  await rateLimiters.omdb.acquire(); // ← Add this line
  const response = await fetch(url);
  // ... rest of code
}
```

**Streaming Client (`lib/streaming.ts`):**

```typescript
export async function getStreamingAvailability(tmdbId: number) {
  await rateLimiters.streaming.acquire(); // ← Add this line
  const response = await fetch(url, { headers });
  // ... rest of code
}
```

That's it! The rate limiter handles everything else automatically.

## Behavior Examples

### Scenario 1: Burst Load (New Page Load)

User searches for "Inception" - triggers 1 search + 10 detail fetches:

```
t=0ms:   TMDB search request (token 1/40 consumed)
t=0ms:   10 parallel detail requests (tokens 2-11/40 consumed)
Result:  All 11 requests execute immediately (within burst capacity)
```

### Scenario 2: Heavy Usage

User rapidly searches multiple movies, triggering 50 TMDB requests:

```
t=0ms:     Requests 1-40 execute immediately (burst capacity)
t=1000ms:  Requests 41-44 execute (4 tokens refilled)
t=2000ms:  Requests 45-48 execute (4 tokens refilled)
t=3000ms:  Requests 49-50 execute (2 of 4 tokens refilled)
```

### Scenario 3: Parallel API Calls

Route handler makes 3 parallel API calls:

```typescript
const [tmdb, omdb, streaming] = await Promise.all([
  getMovieDetails(id),      // TMDB rate limiter
  getOMDbRatings(imdbId),   // OMDb rate limiter
  getStreamingAvailability(id), // Streaming rate limiter
]);
```

Each API has its own token bucket - they don't interfere with each other.

## Monitoring

### Check Rate Limiter State

```typescript
import { rateLimiters } from './rate-limiter';

const state = rateLimiters.tmdb.getState();
console.log(state);
// { availableTokens: 36, pendingRequests: 0 }
```

Use this for:
- **Debugging** - See if requests are queuing up
- **Monitoring** - Track API usage patterns
- **Alerts** - Warn if pendingRequests grows large

## Testing

Run the validation tests:

```bash
npx ts-node lib/rate-limiter.test.ts
```

Expected output:

```
╔═══════════════════════════════════════════╗
║   StreamScout Rate Limiter Test Suite   ║
╚═══════════════════════════════════════════╝

=== Test 1: Basic Token Acquisition ===
✓ First acquisition took 1ms (should be < 10ms)
  State: { availableTokens: 39, pendingRequests: 0 }

=== Test 2: Burst Capacity ===
✓ 10 requests took 5ms (should be < 50ms)
  State: { availableTokens: 0, pendingRequests: 0 }

[... more tests ...]

╔═══════════════════════════════════════════╗
║        ✓ ALL TESTS PASSED                ║
╚═══════════════════════════════════════════╝
```

## Type Safety

The rate limiter is fully type-safe:

```typescript
import { rateLimiters, getRateLimiter, type RateLimiterAPI } from './rate-limiter';

// Direct access (preferred)
await rateLimiters.tmdb.acquire();

// Dynamic access with type safety
const api: RateLimiterAPI = 'tmdb';
const limiter = getRateLimiter(api);
await limiter.acquire();

// TypeScript will error on invalid API names
const bad = getRateLimiter('invalid'); // ← Type error
```

## Error Handling

The rate limiter does NOT handle HTTP errors - handle those separately:

```typescript
try {
  await rateLimiters.tmdb.acquire(); // Wait for rate limit

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`); // Handle HTTP errors
  }

  return response.json();
} catch (error) {
  console.error('API call failed:', error);
  throw error;
}
```

## Adjusting Limits

To adjust rate limits, modify the configuration in `rate-limiter.ts`:

```typescript
export const rateLimiters = {
  tmdb: new RateLimiter({
    maxTokens: 40,      // ← Burst capacity
    refillRate: 4,      // ← Tokens per interval
    refillInterval: 1000, // ← Interval in ms
  }),
  // ...
};
```

**Example:** Upgrade to OMDb Pro (1000 requests/day = ~0.7/second):

```typescript
omdb: new RateLimiter({
  maxTokens: 10,     // Keep burst capacity
  refillRate: 1,     // Reduce to 1 token per second
  refillInterval: 1000,
}),
```

## Caveats & Limitations

### Works With In-Memory Cache

Rate limiting happens AFTER cache checks in current API clients:

```typescript
// Current pattern in tmdb.ts
const cached = cache.get(cacheKey);
if (cached) return cached; // ← No rate limit consumed

await rateLimiters.tmdb.acquire(); // ← Only called for cache misses
const response = await fetch(url);
```

This is **correct behavior** - cache hits don't consume API quota.

### Not Distributed

This implementation is **in-process only**:

- ✅ Works for single-server deployments
- ✅ Works for serverless (each function instance has its own limiter)
- ❌ Does NOT coordinate across multiple server instances
- ❌ Does NOT persist state across restarts

For distributed rate limiting (multi-server), consider:
- Redis-based rate limiting
- API gateway rate limiting (e.g., AWS API Gateway, Cloudflare)

### Serverless Considerations

In serverless environments (Vercel, AWS Lambda), each function instance has its own rate limiter state:

- **Cold starts** reset token buckets to full capacity
- **Concurrent instances** each have independent limits
- **Actual API limit** = `your_config × number_of_instances`

Example: If you have 10 concurrent Lambda instances with TMDB limit of 4/second:
- **Configured limit**: 4/second per instance
- **Actual limit**: 40/second across all instances

**Mitigation strategies:**
1. Reduce per-instance limits (e.g., 1/second instead of 4/second)
2. Use a distributed rate limiter (Redis)
3. Configure serverless concurrency limits
4. Rely on caching to reduce API calls

## Next Steps

1. **Integrate into API clients** - Add `await rateLimiters.<api>.acquire()` before each fetch
2. **Test in development** - Run validation tests and monitor behavior
3. **Monitor in production** - Track `getState()` to ensure limits are effective
4. **Adjust limits** - Fine-tune based on actual API tier and usage patterns

## Reference

- [TMDB API Rate Limits](https://developer.themoviedb.org/docs/rate-limiting)
- [Token Bucket Algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Token_bucket)
- [RapidAPI Rate Limits](https://docs.rapidapi.com/docs/rate-limits)
