# Logger Visual Example

This document shows realistic logger output for a complete API request flow.

## Scenario: User searches for "inception"

### Step 1: Request Arrives

```typescript
// middleware.ts or API route
const requestId = generateRequestId();
const log = logger.child({ requestId, route: '/api/search' });
log.info('Request received', {
  method: 'GET',
  path: '/api/search',
  query: 'inception',
  userAgent: 'Mozilla/5.0...',
});
```

**Development Output:**
```
[2:45:12 PM] INFO Request received
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "route": "/api/search",
    "method": "GET",
    "path": "/api/search",
    "query": "inception",
    "userAgent": "Mozilla/5.0..."
  }
```

**Production Output (JSON):**
```json
{"timestamp":"2024-02-14T14:45:12.345Z","level":"INFO","message":"Request received","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","route":"/api/search","method":"GET","path":"/api/search","query":"inception","userAgent":"Mozilla/5.0..."}}
```

---

### Step 2: TMDB API Call

```typescript
// lib/tmdb.ts
const tmdbLog = logger.child({ requestId, service: 'tmdb' });
tmdbLog.info('Searching TMDB', { query: 'inception' });

const timer = tmdbLog.startTimer('TMDB API call');
const response = await fetch('https://api.themoviedb.org/3/search/movie?query=inception');
const data = await response.json();

timer.end({ resultCount: data.results.length });
tmdbLog.logApiCall('TMDB', '/search/movie', response.status, 145, { query: 'inception' });
```

**Development Output:**
```
[2:45:12 PM] INFO Searching TMDB
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "service": "tmdb",
    "query": "inception"
  }

[2:45:12 PM] INFO TMDB API call completed
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "service": "tmdb",
    "resultCount": 15,
    "duration": 145
  }

[2:45:12 PM] INFO TMDB API call: /search/movie
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "service": "tmdb",
    "apiService": "TMDB",
    "apiEndpoint": "/search/movie",
    "apiStatusCode": 200,
    "apiDuration": 145,
    "query": "inception"
  }
```

---

### Step 3: Cache Check

```typescript
// lib/cache.ts
const cacheLog = logger.child({ requestId, component: 'cache' });

const cacheKey = 'movie:tt1375666:details';
const cached = await cache.get(cacheKey);

if (cached) {
  cacheLog.logCache('hit', cacheKey);
  return cached;
}

cacheLog.logCache('miss', cacheKey);
```

**Development Output:**
```
[2:45:12 PM] DEBUG Cache miss
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "component": "cache",
    "cacheKey": "movie:tt1375666:details",
    "cacheOperation": "miss"
  }
```

---

### Step 4: OMDb Enrichment

```typescript
// lib/omdb.ts
const omdbLog = logger.child({ requestId, service: 'omdb' });
omdbLog.info('Enriching with OMDb', { imdbId: 'tt1375666' });

const timer = omdbLog.startTimer('OMDb API call');
const response = await fetch(`http://www.omdbapi.com/?i=tt1375666`);
const data = await response.json();

timer.end({ hasRatings: data.Ratings?.length > 0 });
omdbLog.logApiCall('OMDb', '/', response.status, 89, { imdbId: 'tt1375666' });
```

**Development Output:**
```
[2:45:12 PM] INFO Enriching with OMDb
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "service": "omdb",
    "imdbId": "tt1375666"
  }

[2:45:12 PM] INFO OMDb API call completed
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "service": "omdb",
    "hasRatings": true,
    "duration": 89
  }

[2:45:12 PM] INFO OMDb API call: /
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "service": "omdb",
    "apiService": "OMDb",
    "apiEndpoint": "/",
    "apiStatusCode": 200,
    "apiDuration": 89,
    "imdbId": "tt1375666"
  }
```

---

### Step 5: Streaming Availability (404 Expected)

```typescript
// lib/streaming.ts
const streamLog = logger.child({ requestId, service: 'streaming' });
streamLog.info('Checking streaming availability', { movieId: 27205 });

try {
  const response = await fetch('https://streaming-availability.p.rapidapi.com/...');

  if (response.status === 404) {
    streamLog.warn('Streaming API returned 404 (expected on free tier)', {
      movieId: 27205,
      status: 404,
    });
    return { streamingOptions: [] }; // Use fallback
  }

  streamLog.logApiCall('StreamingAPI', '/availability', response.status, 234);
} catch (error) {
  streamLog.error('Streaming API call failed', error, { movieId: 27205 });
  streamLog.logApiCall('StreamingAPI', '/availability', 0, 234);
}
```

**Development Output:**
```
[2:45:12 PM] INFO Checking streaming availability
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "service": "streaming",
    "movieId": 27205
  }

[2:45:13 PM] WARN Streaming API returned 404 (expected on free tier)
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "service": "streaming",
    "movieId": 27205,
    "status": 404
  }

[2:45:13 PM] WARN StreamingAPI API call: /availability
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "service": "streaming",
    "apiService": "StreamingAPI",
    "apiEndpoint": "/availability",
    "apiStatusCode": 404,
    "apiDuration": 234
  }
```

---

### Step 6: Cache Set

```typescript
// lib/cache.ts
cacheLog.logCache('set', cacheKey, { ttl: 300 });
await cache.set(cacheKey, enrichedData, 300);
```

**Development Output:**
```
[2:45:13 PM] DEBUG Cache set
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "component": "cache",
    "cacheKey": "movie:tt1375666:details",
    "cacheOperation": "set",
    "ttl": 300
  }
```

---

### Step 7: Request Complete

```typescript
// API route
const duration = Date.now() - startTime;
log.info('Search completed', {
  resultCount: enrichedResults.length,
  duration,
});

log.logRequest('GET', '/api/search', 200, duration, {
  resultCount: enrichedResults.length,
  query: 'inception',
});

return Response.json({
  results: enrichedResults,
  requestId,
});
```

**Development Output:**
```
[2:45:13 PM] INFO Search completed
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "route": "/api/search",
    "resultCount": 15,
    "duration": 468
  }

[2:45:13 PM] INFO GET /api/search 200
  Context: {
    "requestId": "1707923112345-x7k9m2",
    "route": "/api/search",
    "method": "GET",
    "path": "/api/search",
    "statusCode": 200,
    "duration": 468,
    "resultCount": 15,
    "query": "inception"
  }
```

---

## Complete Flow Summary

### Development Console Output (Colorized)

```
[2:45:12 PM] INFO Request received
  Context: { requestId: "1707923112345-x7k9m2", route: "/api/search", method: "GET", path: "/api/search", query: "inception" }

[2:45:12 PM] INFO Searching TMDB
  Context: { requestId: "1707923112345-x7k9m2", service: "tmdb", query: "inception" }

[2:45:12 PM] INFO TMDB API call completed
  Context: { requestId: "1707923112345-x7k9m2", service: "tmdb", resultCount: 15, duration: 145 }

[2:45:12 PM] DEBUG Cache miss
  Context: { requestId: "1707923112345-x7k9m2", component: "cache", cacheKey: "movie:tt1375666:details" }

[2:45:12 PM] INFO Enriching with OMDb
  Context: { requestId: "1707923112345-x7k9m2", service: "omdb", imdbId: "tt1375666" }

[2:45:12 PM] INFO OMDb API call completed
  Context: { requestId: "1707923112345-x7k9m2", service: "omdb", hasRatings: true, duration: 89 }

[2:45:12 PM] INFO Checking streaming availability
  Context: { requestId: "1707923112345-x7k9m2", service: "streaming", movieId: 27205 }

[2:45:13 PM] WARN Streaming API returned 404 (expected on free tier)
  Context: { requestId: "1707923112345-x7k9m2", service: "streaming", movieId: 27205, status: 404 }

[2:45:13 PM] DEBUG Cache set
  Context: { requestId: "1707923112345-x7k9m2", component: "cache", cacheKey: "movie:tt1375666:details", ttl: 300 }

[2:45:13 PM] INFO Search completed
  Context: { requestId: "1707923112345-x7k9m2", route: "/api/search", resultCount: 15, duration: 468 }

[2:45:13 PM] INFO GET /api/search 200
  Context: { requestId: "1707923112345-x7k9m2", route: "/api/search", method: "GET", path: "/api/search", statusCode: 200, duration: 468 }
```

### Production Log Output (JSON, one line per log)

```json
{"timestamp":"2024-02-14T14:45:12.000Z","level":"INFO","message":"Request received","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","route":"/api/search","method":"GET","path":"/api/search","query":"inception"}}
{"timestamp":"2024-02-14T14:45:12.050Z","level":"INFO","message":"Searching TMDB","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","service":"tmdb","query":"inception"}}
{"timestamp":"2024-02-14T14:45:12.195Z","level":"INFO","message":"TMDB API call completed","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","service":"tmdb","resultCount":15,"duration":145}}
{"timestamp":"2024-02-14T14:45:12.200Z","level":"INFO","message":"Enriching with OMDb","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","service":"omdb","imdbId":"tt1375666"}}
{"timestamp":"2024-02-14T14:45:12.289Z","level":"INFO","message":"OMDb API call completed","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","service":"omdb","hasRatings":true,"duration":89}}
{"timestamp":"2024-02-14T14:45:12.290Z","level":"INFO","message":"Checking streaming availability","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","service":"streaming","movieId":27205}}
{"timestamp":"2024-02-14T14:45:12.524Z","level":"WARN","message":"Streaming API returned 404 (expected on free tier)","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","service":"streaming","movieId":27205,"status":404}}
{"timestamp":"2024-02-14T14:45:12.525Z","level":"WARN","message":"StreamingAPI API call: /availability","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","service":"streaming","apiService":"StreamingAPI","apiEndpoint":"/availability","apiStatusCode":404,"apiDuration":234}}
{"timestamp":"2024-02-14T14:45:13.000Z","level":"INFO","message":"Search completed","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","route":"/api/search","resultCount":15,"duration":468}}
{"timestamp":"2024-02-14T14:45:13.001Z","level":"INFO","message":"GET /api/search 200","service":"streamscout","context":{"requestId":"1707923112345-x7k9m2","route":"/api/search","method":"GET","path":"/api/search","statusCode":200,"duration":468,"resultCount":15}}
```

## Benefits Demonstrated

1. **Request Correlation** - Same `requestId` appears in all logs
2. **Structured Context** - Easy to parse and query
3. **Performance Visibility** - Timing data for each operation
4. **Error Tolerance** - 404 from Streaming API logged as WARN (expected)
5. **Service Tracking** - Each service identified (tmdb, omdb, streaming, cache)
6. **End-to-End Visibility** - Complete request lifecycle traced

## Log Analysis Examples

### Find all logs for a specific request:
```bash
# Production (jq)
cat logs.json | jq 'select(.context.requestId == "1707923112345-x7k9m2")'

# Development (grep)
grep "1707923112345-x7k9m2" logs.txt
```

### Find slow requests:
```bash
# Production (jq)
cat logs.json | jq 'select(.context.duration > 500)'

# Find average duration
cat logs.json | jq -s '[.[].context.duration] | add / length'
```

### Count API calls by service:
```bash
# Production (jq)
cat logs.json | jq -s 'group_by(.context.apiService) | map({service: .[0].context.apiService, count: length})'
```

### Find errors:
```bash
# Production (jq)
cat logs.json | jq 'select(.level == "ERROR")'

# Development (grep)
grep "ERROR" logs.txt
```

This demonstrates the power of structured logging for observability and debugging!
