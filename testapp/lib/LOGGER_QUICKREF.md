# Logger Quick Reference Card

## Import

```typescript
import { logger, generateRequestId } from '@/lib/logger';
```

## Basic Usage

```typescript
// Simple logging
logger.info('User logged in', { userId: '123' });
logger.error('Failed to save', error, { documentId: 'doc_456' });

// Request tracking
const requestId = generateRequestId();
const reqLogger = logger.child({ requestId });
```

## Common Patterns

### API Route

```typescript
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ requestId, route: '/api/search' });
  const start = Date.now();

  try {
    const result = await doWork();
    log.logRequest('GET', '/api/search', 200, Date.now() - start);
    return Response.json({ result, requestId });
  } catch (error) {
    log.error('Request failed', error);
    log.logRequest('GET', '/api/search', 500, Date.now() - start);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### Service Class

```typescript
class TMDBService {
  private log = logger.child({ service: 'tmdb' });

  async search(query: string) {
    const timer = this.log.startTimer('TMDB search');
    try {
      const data = await fetch(...);
      timer.end({ resultCount: data.results.length });
      return data;
    } catch (error) {
      this.log.error('Search failed', error, { query });
      throw error;
    }
  }
}
```

### Performance Timing

```typescript
const timer = logger.startTimer('Database query');
const results = await db.query('SELECT ...');
timer.end({ resultCount: results.length });
```

### External API

```typescript
const start = Date.now();
const response = await fetch(url);
const duration = Date.now() - start;
logger.logApiCall('TMDB', '/search', response.status, duration);
```

### Cache Operations

```typescript
logger.logCache('hit', 'search:inception');
logger.logCache('miss', 'search:matrix');
logger.logCache('set', 'search:interstellar', { ttl: 300 });
```

## Methods

| Method | Use Case | Example |
|--------|----------|---------|
| `logger.debug()` | Verbose debugging | `logger.debug('Cache lookup', { key })` |
| `logger.info()` | Normal operations | `logger.info('Request processed', { duration })` |
| `logger.warn()` | Degraded state | `logger.warn('Rate limit near', { remaining: 10 })` |
| `logger.error()` | Errors | `logger.error('Query failed', error, { table })` |
| `logger.child()` | Add context | `logger.child({ requestId, service: 'tmdb' })` |
| `logger.startTimer()` | Time operation | `const timer = logger.startTimer('DB query')` |
| `logger.logRequest()` | HTTP requests | `logger.logRequest('GET', '/api', 200, 123)` |
| `logger.logApiCall()` | External APIs | `logger.logApiCall('TMDB', '/search', 200, 145)` |
| `logger.logCache()` | Cache ops | `logger.logCache('hit', 'key')` |

## Log Levels (Severity Order)

1. **DEBUG** - Development only, disabled in production
2. **INFO** - Normal operations
3. **WARN** - Degraded but functional
4. **ERROR** - Actual errors

## Quick Tips

✅ **DO**
- Use `generateRequestId()` for every request
- Create child loggers for context
- Log structured data (objects)
- Include error objects
- Use timers for performance

❌ **DON'T**
- Use `console.log()` directly
- Log string templates (use structured data)
- Forget to include context
- Log errors without the Error object
- Use wrong log levels

## Environment

- **Development**: Colorized, human-readable, DEBUG enabled
- **Production**: JSON output, DEBUG disabled

## Output Example (Dev)

```
[10:30:45 AM] INFO Search completed
  Context: {
    "requestId": "1707923445789-a3f2c1",
    "query": "inception",
    "resultCount": 15,
    "duration": 234
  }
```

## Output Example (Prod)

```json
{"timestamp":"2024-02-14T10:30:45.123Z","level":"INFO","message":"Search completed","service":"streamscout","context":{"requestId":"1707923445789-a3f2c1","query":"inception","resultCount":15,"duration":234}}
```

## Testing

```bash
# Run test suite
npx tsx lib/logger.test.ts
```

## Full Documentation

See `lib/LOGGER_README.md` for complete API documentation and advanced patterns.
