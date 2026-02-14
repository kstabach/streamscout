/**
 * Rate Limiter Implementation
 *
 * Uses a token bucket algorithm to enforce API rate limits.
 * Each API has its own rate limiter with configurable limits.
 *
 * Token bucket algorithm:
 * - Tokens refill at a constant rate (refillRate per refillInterval)
 * - Each request consumes 1 token
 * - If no tokens available, request waits until one becomes available
 * - Maximum tokens stored = maxTokens (prevents bursts beyond limit)
 */

interface RateLimiterConfig {
  /** Maximum number of tokens that can be stored (burst capacity) */
  maxTokens: number;
  /** Number of tokens to refill per interval */
  refillRate: number;
  /** Interval in milliseconds for token refill */
  refillInterval: number;
}

class RateLimiter {
  private tokens: number;
  private readonly config: RateLimiterConfig;
  private lastRefillTime: number;
  private pendingRequests: Array<() => void> = [];

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.tokens = config.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Refills tokens based on time elapsed since last refill
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const intervalsElapsed = Math.floor(timePassed / this.config.refillInterval);

    if (intervalsElapsed > 0) {
      const tokensToAdd = intervalsElapsed * this.config.refillRate;
      this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  /**
   * Processes pending requests if tokens are available
   */
  private processPendingRequests(): void {
    while (this.pendingRequests.length > 0 && this.tokens > 0) {
      this.tokens--;
      const resolve = this.pendingRequests.shift();
      resolve?.();
    }
  }

  /**
   * Acquires a token to make an API request
   * Returns a promise that resolves when a token is available
   *
   * @returns Promise that resolves when the request can proceed
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return Promise.resolve();
    }

    // No tokens available - wait for next refill
    return new Promise<void>((resolve) => {
      this.pendingRequests.push(resolve);

      // Schedule a refill check
      const nextRefillIn = this.config.refillInterval - (Date.now() - this.lastRefillTime);
      setTimeout(() => {
        this.refill();
        this.processPendingRequests();
      }, Math.max(0, nextRefillIn));
    });
  }

  /**
   * Gets current state for debugging/monitoring
   */
  getState(): { availableTokens: number; pendingRequests: number } {
    this.refill();
    return {
      availableTokens: this.tokens,
      pendingRequests: this.pendingRequests.length,
    };
  }
}

/**
 * Pre-configured rate limiters for each API
 *
 * TMDB: 40 requests per 10 seconds (4 requests/second)
 * OMDb: 10 requests per second
 * Streaming: 10 requests per second (RapidAPI free tier)
 */
export const rateLimiters = {
  tmdb: new RateLimiter({
    maxTokens: 40,
    refillRate: 4,
    refillInterval: 1000, // 1 second
  }),

  omdb: new RateLimiter({
    maxTokens: 10,
    refillRate: 10,
    refillInterval: 1000, // 1 second
  }),

  streaming: new RateLimiter({
    maxTokens: 10,
    refillRate: 10,
    refillInterval: 1000, // 1 second
  }),
} as const;

/**
 * Type-safe API names
 */
export type RateLimiterAPI = keyof typeof rateLimiters;

/**
 * Helper function to get rate limiter for an API
 */
export function getRateLimiter(api: RateLimiterAPI): RateLimiter {
  return rateLimiters[api];
}
