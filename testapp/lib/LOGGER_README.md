# StreamScout Logging Infrastructure

Production-ready structured logging system for the StreamScout application.

## Features

- **Structured JSON logging** - Machine-parseable logs for production
- **Human-readable development logs** - Colorized, formatted output for local dev
- **Request correlation IDs** - Trace requests across distributed systems
- **Automatic context enrichment** - Timestamps, service names, structured metadata
- **Type-safe interface** - Full TypeScript support
- **Zero dependencies** - No external logging libraries required
- **Performance timing** - Built-in helpers for measuring operation duration
- **Log levels** - DEBUG, INFO, WARN, ERROR with configurable filtering

## Quick Start

```typescript
import { logger, generateRequestId } from '@/lib/logger';

// Basic logging
logger.info('Application started');
logger.error('Failed to connect', new Error('Connection timeout'));

// With context
logger.info('User logged in', { userId: '123', method: 'oauth' });

// Request correlation
const requestId = generateRequestId();
const requestLogger = logger.child({ requestId });
requestLogger.info('Processing request', { path: '/api/search' });
```

## API Reference

### Basic Logging Methods

#### `logger.debug(message, context?)`
Debug-level logging. Disabled in production by default.

```typescript
logger.debug('Cache lookup', { key: 'search:inception', ttl: 300 });
```

#### `logger.info(message, context?)`
Informational messages for normal operations.

```typescript
logger.info('Search completed', { query: 'inception', resultCount: 15 });
```

#### `logger.warn(message, context?)`
Warning messages for degraded but functional states.

```typescript
logger.warn('API rate limit approaching', { remaining: 10, limit: 100 });
```

#### `logger.error(message, error?, context?)`
Error messages with optional Error object and context.

```typescript
logger.error('Database query failed', error, { query: 'SELECT ...', duration: 5000 });
```

### Advanced Features

#### Child Loggers

Create child loggers with inherited context:

```typescript
const requestLogger = logger.child({ requestId: generateRequestId() });
const serviceLogger = requestLogger.child({ service: 'tmdb' });

// All logs from serviceLogger include requestId and service
serviceLogger.info('Fetching movie details', { movieId: 123 });
// Output includes: { requestId: '...', service: 'tmdb', movieId: 123 }
```

#### Request Correlation IDs

Generate unique IDs to trace requests:

```typescript
import { generateRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = logger.child({ requestId });

  logger.info('Request received', { path: request.nextUrl.pathname });
  // ... handle request
  logger.info('Request completed', { duration: 123 });

  return Response.json({ requestId }); // Return to client
}
```

#### Performance Timing

Measure operation duration:

```typescript
const timer = logger.startTimer('Database query');

try {
  const results = await db.query('SELECT ...');
  timer.end({ resultCount: results.length, status: 'success' });
} catch (error) {
  timer.end({ status: 'error' });
  throw error;
}
```

#### HTTP Request Logging

Log HTTP requests with automatic severity based on status code:

```typescript
logger.logRequest(
  method,      // 'GET', 'POST', etc.
  path,        // '/api/search'
  statusCode,  // 200, 404, 500, etc.
  duration,    // milliseconds
  context?     // optional additional context
);

// Example
logger.logRequest('GET', '/api/search', 200, 123, { resultCount: 15 });
// Logs as INFO for 2xx, WARN for 4xx, ERROR for 5xx
```

#### Cache Logging

Log cache operations:

```typescript
logger.logCache('miss', 'search:inception');
logger.logCache('set', 'search:inception', { ttl: 300 });
logger.logCache('hit', 'search:inception');
```

#### External API Logging

Log external API calls with automatic severity:

```typescript
logger.logApiCall(
  service,     // 'TMDB', 'OMDb', etc.
  endpoint,    // '/search/movie'
  statusCode,  // HTTP status code
  duration,    // milliseconds
  context?     // optional context
);

// Example
logger.logApiCall('TMDB', '/search/movie', 200, 145, { query: 'inception' });
```

## Usage Patterns

### Pattern 1: API Route Handler

```typescript
import { logger, generateRequestId } from '@/lib/logger';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const routeLogger = logger.child({ requestId, route: '/api/search' });

  const startTime = Date.now();

  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q');

    routeLogger.info('Search request received', { query });

    const results = await searchMovies(query);

    const duration = Date.now() - startTime;
    routeLogger.logRequest('GET', '/api/search', 200, duration, {
      resultCount: results.length,
    });

    return Response.json({ results, requestId });

  } catch (error) {
    const duration = Date.now() - startTime;
    routeLogger.error('Search request failed', error, { query });
    routeLogger.logRequest('GET', '/api/search', 500, duration);

    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Pattern 2: Service Class

```typescript
import { logger, type Logger } from '@/lib/logger';

export class TMDBService {
  private logger: Logger;

  constructor(requestId?: string) {
    this.logger = logger.child({
      service: 'tmdb',
      requestId,
    });
  }

  async searchMovies(query: string) {
    this.logger.info('Searching movies', { query });

    const timer = this.logger.startTimer('TMDB API call');

    try {
      const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${query}`, {
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
      });

      const data = await response.json();

      timer.end({
        resultCount: data.results.length,
        status: response.status,
      });

      return data.results;

    } catch (error) {
      timer.end({ status: 'error' });
      this.logger.error('TMDB search failed', error, { query });
      throw error;
    }
  }
}
```

### Pattern 3: Multi-Step Operation

```typescript
export async function enrichedSearch(query: string) {
  const requestId = generateRequestId();
  const opLogger = logger.child({ requestId, operation: 'enriched-search' });

  opLogger.info('Starting enriched search', { query });

  try {
    // Step 1: TMDB search
    opLogger.debug('Step 1: TMDB search', { query });
    const tmdbTimer = opLogger.startTimer('TMDB search');
    const tmdbResults = await searchTMDB(query);
    tmdbTimer.end({ resultCount: tmdbResults.length });

    // Step 2: OMDb enrichment
    opLogger.debug('Step 2: OMDb enrichment', { count: tmdbResults.length });
    const omdbTimer = opLogger.startTimer('OMDb enrichment');
    const enrichedResults = await enrichWithOMDb(tmdbResults);
    omdbTimer.end({ enrichedCount: enrichedResults.length });

    // Step 3: Streaming data
    opLogger.debug('Step 3: Streaming availability');
    const streamTimer = opLogger.startTimer('Streaming data fetch');
    const finalResults = await addStreamingData(enrichedResults);
    streamTimer.end({ streamingCount: finalResults.length });

    opLogger.info('Enriched search completed', {
      totalResults: finalResults.length,
    });

    return finalResults;

  } catch (error) {
    opLogger.error('Enriched search failed', error, { query });
    throw error;
  }
}
```

### Pattern 4: Middleware Integration

```typescript
import { logger, generateRequestId } from '@/lib/logger';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const requestId = generateRequestId();
  const middlewareLogger = logger.child({ requestId, layer: 'middleware' });

  const startTime = Date.now();

  middlewareLogger.info('Request received', {
    path: request.nextUrl.pathname,
    method: request.method,
  });

  const response = NextResponse.next();

  // Add request ID to headers for client-side correlation
  response.headers.set('X-Request-ID', requestId);

  const duration = Date.now() - startTime;
  middlewareLogger.logRequest(
    request.method,
    request.nextUrl.pathname,
    response.status,
    duration
  );

  return response;
}
```

## Log Output Formats

### Development (Human-Readable)

Colorized, formatted output with context and stack traces:

```
[10:30:45 AM] INFO Application started
[10:30:46 AM] INFO Search completed
  Context: {
    "query": "inception",
    "resultCount": 15,
    "duration": 234
  }
[10:30:47 AM] ERROR Database query failed
  Context: {
    "table": "movies",
    "operation": "select"
  }
  Error: QueryError: Connection timeout
    at Database.query (/app/lib/db.ts:45:10)
    at searchMovies (/app/lib/search.ts:12:20)
```

### Production (JSON)

Structured JSON for log aggregation and analysis:

```json
{"timestamp":"2024-02-14T10:30:45.123Z","level":"INFO","message":"Application started","service":"streamscout"}
{"timestamp":"2024-02-14T10:30:46.234Z","level":"INFO","message":"Search completed","service":"streamscout","context":{"query":"inception","resultCount":15,"duration":234}}
{"timestamp":"2024-02-14T10:30:47.345Z","level":"ERROR","message":"Database query failed","service":"streamscout","context":{"table":"movies","operation":"select"},"error":{"name":"QueryError","message":"Connection timeout","stack":"QueryError: Connection timeout\n    at Database.query (/app/lib/db.ts:45:10)"}}
```

## Configuration

### Environment Variables

- `NODE_ENV=production` - Enables JSON logging, disables DEBUG level
- `NODE_ENV=development` - Enables human-readable logs, enables DEBUG level

### Log Levels

Log level hierarchy (from lowest to highest priority):

1. **DEBUG** - Verbose debugging info (disabled in production)
2. **INFO** - Normal operational messages
3. **WARN** - Warning messages
4. **ERROR** - Error messages

## Best Practices

### 1. Always Use Request IDs

```typescript
// Good
const requestId = generateRequestId();
const logger = logger.child({ requestId });

// Bad
logger.info('Processing request'); // No way to trace this request
```

### 2. Use Child Loggers for Context

```typescript
// Good
const serviceLogger = logger.child({ service: 'tmdb', requestId });
serviceLogger.info('Fetching data'); // Includes service and requestId

// Bad
logger.info('Fetching data', { service: 'tmdb', requestId }); // Repetitive
```

### 3. Log Structured Data

```typescript
// Good
logger.info('Search completed', { query, resultCount, duration });

// Bad
logger.info(`Search for "${query}" returned ${resultCount} results in ${duration}ms`);
```

### 4. Include Error Objects

```typescript
// Good
logger.error('Database query failed', error, { query, table });

// Bad
logger.error('Database query failed'); // Loses stack trace
logger.error(error.message); // Loses error type and stack
```

### 5. Use Appropriate Log Levels

```typescript
// Good
logger.debug('Cache lookup', { key }); // Development debugging
logger.info('Request completed', { duration }); // Normal operation
logger.warn('Rate limit approaching', { remaining }); // Degraded state
logger.error('Database connection failed', error); // Actual error

// Bad
logger.info('Something went wrong'); // Use error()
logger.error('User logged in'); // Use info()
```

### 6. Time Operations

```typescript
// Good
const timer = logger.startTimer('Database query');
const results = await db.query('...');
timer.end({ resultCount: results.length });

// Bad
const start = Date.now();
const results = await db.query('...');
logger.info('Query took ' + (Date.now() - start) + 'ms'); // Not structured
```

## Integration Checklist

When integrating the logger into existing code:

- [ ] Replace all `console.log()` with `logger.info()`
- [ ] Replace all `console.error()` with `logger.error()`
- [ ] Add request ID generation in API routes
- [ ] Use child loggers for services
- [ ] Add performance timing for slow operations
- [ ] Include structured context in all logs
- [ ] Log HTTP requests with status codes
- [ ] Log external API calls
- [ ] Log cache operations
- [ ] Test in both development and production modes

## Testing

Run the test suite to see example output:

```bash
# If you have tsx installed
npx tsx lib/logger.test.ts

# Or use ts-node
npx ts-node lib/logger.test.ts
```

## TypeScript Types

All types are exported for use in your application:

```typescript
import type {
  LogLevel,
  LogContext,
  LogEntry,
  PerformanceTimer,
} from '@/lib/logger';
```

## Future Enhancements

Potential additions for future iterations:

- [ ] Log shipping to external services (Datadog, CloudWatch, etc.)
- [ ] Sampling for high-volume logs
- [ ] Metrics extraction from logs
- [ ] Custom log formatters
- [ ] Log rotation for file-based logging
- [ ] OpenTelemetry integration
- [ ] Async logging queue for high-throughput scenarios

## Support

For questions or issues with the logging infrastructure, refer to:

- `lib/logger.ts` - Core implementation
- `lib/logger.examples.ts` - Usage examples
- `lib/logger.test.ts` - Test suite
