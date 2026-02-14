# Rate Limiter Integration Checklist

## For Agent Integrating Rate Limiter into API Clients

### Files to Modify

- ✅ `/Users/kenneth.stabach/testapp/lib/tmdb.ts`
- ✅ `/Users/kenneth.stabach/testapp/lib/omdb.ts`
- ✅ `/Users/kenneth.stabach/testapp/lib/streaming.ts`

### Step-by-Step Integration

#### 1. TMDB Client (`lib/tmdb.ts`)

**Add import at top:**

```typescript
import { rateLimiters } from './rate-limiter';
```

**Modify `searchMovies` function:**

```typescript
export async function searchMovies(query: string): Promise<TMDBSearchResponse> {
  const cacheKey = `tmdb:search:${query}`;
  const cached = cache.get<TMDBSearchResponse>(cacheKey);
  if (cached) return cached;

  await rateLimiters.tmdb.acquire(); // ← ADD THIS LINE

  const url = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`;
  // ... rest of function
}
```

**Modify `getMovieDetails` function:**

```typescript
export async function getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
  const cacheKey = `tmdb:movie:${movieId}`;
  const cached = cache.get<TMDBMovieDetails>(cacheKey);
  if (cached) return cached;

  await rateLimiters.tmdb.acquire(); // ← ADD THIS LINE

  const url = `${TMDB_BASE_URL}/movie/${movieId}?append_to_response=videos`;
  // ... rest of function
}
```

#### 2. OMDb Client (`lib/omdb.ts`)

**Add import at top:**

```typescript
import { rateLimiters } from './rate-limiter';
```

**Modify `getOMDbRatings` function:**

```typescript
export async function getOMDbRatings(imdbId: string): Promise<OMDbResponse | null> {
  if (!API_KEY) return null;

  const cacheKey = `omdb:${imdbId}`;
  const cached = cache.get<OMDbResponse>(cacheKey);
  if (cached) return cached;

  await rateLimiters.omdb.acquire(); // ← ADD THIS LINE

  const url = `${OMDB_BASE_URL}?apikey=${API_KEY}&i=${imdbId}`;
  // ... rest of function
}
```

#### 3. Streaming Client (`lib/streaming.ts`)

**Add import at top:**

```typescript
import { rateLimiters } from './rate-limiter';
```

**Modify `getStreamingAvailability` function:**

```typescript
export async function getStreamingAvailability(tmdbId: number): Promise<StreamingOption[]> {
  if (!API_KEY) return [];

  const cacheKey = `streaming:${tmdbId}`;
  const cached = cache.get<StreamingOption[]>(cacheKey);
  if (cached) return cached;

  await rateLimiters.streaming.acquire(); // ← ADD THIS LINE

  const url = `${STREAMING_BASE_URL}/get?tmdb_id=movie/${tmdbId}&country=us&output_language=en`;
  // ... rest of function
}
```

### Verification Steps

#### 1. Type Check

```bash
npx tsc --noEmit
```

Expected: No errors

#### 2. Run Tests

```bash
npx ts-node lib/rate-limiter.test.ts
```

Expected: All tests pass

#### 3. Test Integration Manually

```bash
npm run dev
```

Then:
1. Search for a movie
2. Click on a result to open detail modal
3. Check browser network tab - should see staggered requests if limits are hit
4. No errors in console

#### 4. Verify Rate Limiting in Action

Add temporary logging in one of the API clients:

```typescript
console.log('[RATE LIMIT] Acquiring token...');
await rateLimiters.tmdb.acquire();
console.log('[RATE LIMIT] Token acquired, making request');
```

Expected console output for burst of 45 requests:
```
[RATE LIMIT] Acquiring token...
[RATE LIMIT] Token acquired, making request  (immediate)
[... 39 more immediate ...]
[RATE LIMIT] Acquiring token...
[RATE LIMIT] Token acquired, making request  (~1 second delay)
```

### Common Issues

#### Issue: TypeScript errors about missing module

**Error:** `Cannot find module './rate-limiter'`

**Solution:** Ensure `rate-limiter.ts` is in `/Users/kenneth.stabach/testapp/lib/` directory

#### Issue: Requests still seem unlimited

**Possible causes:**
1. Cache is serving most requests (good! not a problem)
2. Import added but `await` call not added
3. `await` added in wrong place (should be AFTER cache check, BEFORE fetch)

**Verify:** Add logging as shown in step 4 above

#### Issue: Tests fail with timing errors

**Possible causes:**
1. System under heavy load (CI environments)
2. Node.js timers slightly inaccurate

**Solution:** Tests have 200ms tolerance built in. If consistently failing, increase tolerance in test file.

### Rollback Plan

If rate limiter causes issues:

1. **Quick rollback** - Comment out the `await rateLimiters.*` lines
2. **Full rollback** - Remove import statements
3. **Test** - Verify app works without rate limiting

Rate limiter has zero dependencies and doesn't modify any external state, so removing it is safe.

### Performance Impact

Expected performance impact:

- **Cache hits:** Zero impact (rate limiter not called)
- **First 40 TMDB requests:** < 1ms overhead per request
- **Sustained load:** Requests queue automatically, transparent to user
- **Memory:** ~1KB per rate limiter instance (negligible)

### Files Reference

```
lib/
├── rate-limiter.ts               # Main implementation
├── rate-limiter.example.ts       # Reference examples (DO NOT IMPORT)
├── rate-limiter.test.ts          # Validation tests
├── RATE_LIMITER_README.md        # Full documentation
└── INTEGRATION_CHECKLIST.md      # This file
```

### Questions?

Refer to:
- **Usage examples:** `lib/rate-limiter.example.ts`
- **Full documentation:** `lib/RATE_LIMITER_README.md`
- **Algorithm details:** See "Token Bucket" section in README

---

**Estimated integration time:** 5-10 minutes

**Risk level:** Low (easy rollback, no external dependencies)

**Testing required:** Type check + manual verification (tests optional but recommended)
