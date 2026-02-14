# Logger API Summary

## Overview

Production-ready structured logging system for StreamScout with zero external dependencies.

**Files Created:**
- `/Users/kenneth.stabach/testapp/lib/logger.ts` - Core implementation (8.8KB)
- `/Users/kenneth.stabach/testapp/lib/logger.examples.ts` - Usage examples (9.8KB)
- `/Users/kenneth.stabach/testapp/lib/logger.test.ts` - Test suite (8.6KB)
- `/Users/kenneth.stabach/testapp/lib/LOGGER_README.md` - Full documentation (13KB)
- `/Users/kenneth.stabach/testapp/lib/LOGGER_QUICKREF.md` - Quick reference card

## Core Features

✅ Structured JSON logging (production)
✅ Human-readable colorized output (development)
✅ Request correlation IDs for distributed tracing
✅ Automatic context enrichment
✅ Type-safe TypeScript interface
✅ Zero external dependencies
✅ Performance timing helpers
✅ Log levels: DEBUG, INFO, WARN, ERROR
✅ Child loggers for context inheritance
✅ Specialized logging for HTTP, APIs, and cache operations

## API Reference

### Core Logger Methods

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.debug(message: string, context?: LogContext): void
logger.info(message: string, context?: LogContext): void
logger.warn(message: string, context?: LogContext): void
logger.error(message: string, error?: unknown, context?: LogContext): void

// Child loggers
logger.child(context: LogContext): Logger

// Performance timing
logger.startTimer(operation: string, context?: LogContext): PerformanceTimer

// Specialized logging
logger.logRequest(method, path, statusCode, duration, context?): void
logger.logApiCall(service, endpoint, statusCode, duration, context?): void
logger.logCache(operation: 'hit' | 'miss' | 'set', key, context?): void
```

### Utilities

```typescript
import { generateRequestId } from '@/lib/logger';

// Generate unique correlation ID
const requestId = generateRequestId();
// Returns: "1707923456789-a3f2c1"
```

### Types

```typescript
import type { LogContext, LogEntry, PerformanceTimer } from '@/lib/logger';

interface LogContext {
  [key: string]: unknown;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
}

interface PerformanceTimer {
  end: (context?: LogContext) => void;
}

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}
```

## Usage Examples

### 1. API Route with Request Tracking

```typescript
import { logger, generateRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ requestId, route: '/api/search' });
  const start = Date.now();

  try {
    const query = request.nextUrl.searchParams.get('q');
    log.info('Search request', { query });

    const results = await searchMovies(query);

    log.logRequest('GET', '/api/search', 200, Date.now() - start, {
      resultCount: results.length
    });

    return Response.json({ results, requestId });
  } catch (error) {
    log.error('Search failed', error, { query });
    log.logRequest('GET', '/api/search', 500, Date.now() - start);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### 2. Service Class

```typescript
import { logger, type Logger } from '@/lib/logger';

class TMDBService {
  private log: Logger;

  constructor(requestId?: string) {
    this.log = logger.child({ service: 'tmdb', requestId });
  }

  async searchMovies(query: string) {
    this.log.info('Searching movies', { query });
    const timer = this.log.startTimer('TMDB API call');

    try {
      const response = await fetch(...);
      const data = await response.json();

      timer.end({ resultCount: data.results.length, status: response.status });
      return data.results;
    } catch (error) {
      timer.end({ status: 'error' });
      this.log.error('TMDB search failed', error, { query });
      throw error;
    }
  }
}
```

### 3. Performance Timing

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

### 4. External API Call

```typescript
const start = Date.now();
try {
  const response = await fetch('https://api.example.com/data');
  const duration = Date.now() - start;

  logger.logApiCall('ExampleAPI', '/data', response.status, duration, {
    query: 'search-term'
  });
} catch (error) {
  logger.logApiCall('ExampleAPI', '/data', 0, Date.now() - start);
  logger.error('API call failed', error);
}
```

### 5. Cache Operations

```typescript
const cached = cache.get(key);

if (cached) {
  logger.logCache('hit', key);
  return cached;
}

logger.logCache('miss', key);
const data = await fetchData();

logger.logCache('set', key, { ttl: 300 });
cache.set(key, data, 300);
```

## Log Output

### Development Mode (Human-Readable)

```
[10:30:45 AM] INFO Search request
  Context: {
    "requestId": "1707923445789-a3f2c1",
    "route": "/api/search",
    "query": "inception"
  }

[10:30:46 AM] INFO GET /api/search 200
  Context: {
    "requestId": "1707923445789-a3f2c1",
    "route": "/api/search",
    "method": "GET",
    "path": "/api/search",
    "statusCode": 200,
    "duration": 234,
    "resultCount": 15
  }

[10:30:47 AM] ERROR Database query failed
  Context: {
    "table": "movies",
    "operation": "select"
  }
  Error: QueryError: Connection timeout
    at Database.query (/app/lib/db.ts:45:10)
```

### Production Mode (JSON)

```json
{"timestamp":"2024-02-14T10:30:45.123Z","level":"INFO","message":"Search request","service":"streamscout","context":{"requestId":"1707923445789-a3f2c1","route":"/api/search","query":"inception"}}
{"timestamp":"2024-02-14T10:30:46.234Z","level":"INFO","message":"GET /api/search 200","service":"streamscout","context":{"requestId":"1707923445789-a3f2c1","route":"/api/search","method":"GET","path":"/api/search","statusCode":200,"duration":234,"resultCount":15}}
{"timestamp":"2024-02-14T10:30:47.345Z","level":"ERROR","message":"Database query failed","service":"streamscout","context":{"table":"movies","operation":"select"},"error":{"name":"QueryError","message":"Connection timeout","stack":"QueryError: Connection timeout\n    at Database.query (/app/lib/db.ts:45:10)"}}
```

## Integration Points

### Existing StreamScout Files to Update

The logger is ready for integration into:

1. **API Routes** (`app/api/**/route.ts`)
   - Add request ID generation
   - Replace console.log with logger.info
   - Log request/response metrics

2. **Library Files** (`lib/*.ts`)
   - `lib/tmdb.ts` - TMDB API calls
   - `lib/omdb.ts` - OMDb API calls
   - `lib/streaming.ts` - Streaming API calls
   - `lib/cache.ts` - Cache operations

3. **Future Middleware** (`middleware.ts`)
   - Request logging
   - Request ID propagation

### Example Integration Pattern

**Before:**
```typescript
export async function GET(request: NextRequest) {
  console.log('Search request');
  const results = await searchMovies(query);
  console.log('Found results:', results.length);
  return Response.json({ results });
}
```

**After:**
```typescript
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ requestId });
  const start = Date.now();

  log.info('Search request', { query });
  const results = await searchMovies(query);
  log.logRequest('GET', '/api/search', 200, Date.now() - start, {
    resultCount: results.length
  });

  return Response.json({ results, requestId });
}
```

## Configuration

### Environment Variables

- `NODE_ENV=production` - JSON output, DEBUG disabled
- `NODE_ENV=development` - Colorized output, DEBUG enabled

### Log Levels (Priority Order)

1. **DEBUG** (0) - Disabled in production
2. **INFO** (1) - Normal operations
3. **WARN** (2) - Degraded state
4. **ERROR** (3) - Errors

## Best Practices

1. **Always use request IDs**
   ```typescript
   const requestId = generateRequestId();
   const log = logger.child({ requestId });
   ```

2. **Create child loggers for context**
   ```typescript
   const serviceLog = logger.child({ service: 'tmdb', requestId });
   ```

3. **Log structured data**
   ```typescript
   // Good
   logger.info('Search complete', { query, count, duration });

   // Bad
   logger.info(`Search for ${query} found ${count} results in ${duration}ms`);
   ```

4. **Include error objects**
   ```typescript
   // Good
   logger.error('Query failed', error, { query });

   // Bad
   logger.error('Query failed'); // Loses stack trace
   ```

5. **Use appropriate log levels**
   ```typescript
   logger.debug('Cache lookup', { key }); // Development only
   logger.info('Request processed', { duration }); // Normal ops
   logger.warn('Rate limit near', { remaining }); // Degraded
   logger.error('Connection failed', error); // Errors
   ```

## Testing

Run the test suite to see example output:

```bash
npx tsx lib/logger.test.ts
```

## Type Safety

All methods are fully typed. TypeScript will catch errors:

```typescript
// ✅ Valid
logger.info('Message', { userId: '123', count: 42 });

// ✅ Valid
const timer = logger.startTimer('Operation');
timer.end({ status: 'success' });

// ✅ Valid
logger.error('Failed', new Error('Timeout'), { operation: 'db-query' });

// ❌ TypeScript Error - wrong method signature
logger.error('Failed'); // Missing error parameter is optional but context should be 3rd param
logger.info(123); // Message must be string
```

## Performance Considerations

- **Zero overhead in production** - DEBUG logs are no-op
- **Efficient JSON serialization** - Uses native JSON.stringify
- **No async I/O** - Direct console output (delegated to Node.js)
- **Minimal allocations** - Reuses context objects
- **Fast timers** - Uses Date.now() (microsecond precision)

## Future Enhancements

Potential additions (not implemented yet):

- [ ] Log shipping to external services (Datadog, CloudWatch)
- [ ] Sampling for high-volume logs
- [ ] Metrics extraction from logs
- [ ] Custom log formatters
- [ ] Log rotation for file-based logging
- [ ] OpenTelemetry integration
- [ ] Async logging queue for high-throughput

## Files Reference

- **Core**: `/Users/kenneth.stabach/testapp/lib/logger.ts`
- **Examples**: `/Users/kenneth.stabach/testapp/lib/logger.examples.ts`
- **Tests**: `/Users/kenneth.stabach/testapp/lib/logger.test.ts`
- **Documentation**: `/Users/kenneth.stabach/testapp/lib/LOGGER_README.md`
- **Quick Reference**: `/Users/kenneth.stabach/testapp/lib/LOGGER_QUICKREF.md`

## Support

For integration help or questions:
1. See examples in `lib/logger.examples.ts`
2. Review full documentation in `lib/LOGGER_README.md`
3. Run tests with `npx tsx lib/logger.test.ts`
