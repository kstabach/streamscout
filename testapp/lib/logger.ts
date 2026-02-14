/**
 * StreamScout Production Logging Infrastructure
 *
 * A structured logging system designed for Next.js server-side use.
 * Features:
 * - Structured JSON logging for production
 * - Human-readable output for development
 * - Request correlation IDs for distributed tracing
 * - Automatic context enrichment
 * - Type-safe interface
 * - Zero external dependencies
 */

// ============================================================================
// Types
// ============================================================================

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  [key: string]: unknown;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface PerformanceTimer {
  end: (context?: LogContext) => void;
}

// ============================================================================
// Configuration
// ============================================================================

const SERVICE_NAME = 'streamscout';
const isDevelopment = process.env.NODE_ENV !== 'production';

// Log level hierarchy
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

// Minimum log level (DEBUG disabled in production by default)
const minLogLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
const minPriority = LOG_LEVEL_PRIORITY[minLogLevel];

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a correlation ID for request tracing
 * Format: timestamp-random (e.g., "1707923456789-a3f2c1")
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Format error object for logging
 */
function formatError(error: unknown): LogEntry['error'] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

/**
 * Format log entry for human-readable output (development)
 */
function formatDevLog(entry: LogEntry): string {
  const { timestamp, level, message, context, error } = entry;
  const time = new Date(timestamp).toLocaleTimeString();

  // Color codes for terminal output
  const colors = {
    DEBUG: '\x1b[36m',    // Cyan
    INFO: '\x1b[32m',     // Green
    WARN: '\x1b[33m',     // Yellow
    ERROR: '\x1b[31m',    // Red
    RESET: '\x1b[0m',
  };

  const color = colors[level];
  const reset = colors.RESET;

  let output = `${color}[${time}] ${level}${reset} ${message}`;

  if (context && Object.keys(context).length > 0) {
    output += `\n  Context: ${JSON.stringify(context, null, 2)}`;
  }

  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack) {
      output += `\n${error.stack}`;
    }
  }

  return output;
}

/**
 * Format log entry for JSON output (production)
 */
function formatProdLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Write log entry to output
 */
function writeLog(entry: LogEntry): void {
  const output = isDevelopment ? formatDevLog(entry) : formatProdLog(entry);

  // Use stderr for errors and warnings, stdout for info/debug
  if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) {
    console.error(output);
  } else {
    console.log(output);
  }
}

/**
 * Check if log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= minPriority;
}

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
  private defaultContext: LogContext;

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext;
  }

  /**
   * Create a child logger with additional default context
   */
  child(context: LogContext): Logger {
    return new Logger({ ...this.defaultContext, ...context });
  }

  /**
   * Log a debug message (disabled in production)
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.DEBUG)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      service: SERVICE_NAME,
      context: { ...this.defaultContext, ...context },
    };

    writeLog(entry);
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.INFO)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      service: SERVICE_NAME,
      context: { ...this.defaultContext, ...context },
    };

    writeLog(entry);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.WARN)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      service: SERVICE_NAME,
      context: { ...this.defaultContext, ...context },
    };

    writeLog(entry);
  }

  /**
   * Log an error message with optional Error object
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (!shouldLog(LogLevel.ERROR)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      service: SERVICE_NAME,
      context: { ...this.defaultContext, ...context },
      error: error ? formatError(error) : undefined,
    };

    writeLog(entry);
  }

  /**
   * Start a performance timer
   * Returns an object with end() method to log duration
   */
  startTimer(operation: string, context?: LogContext): PerformanceTimer {
    const startTime = Date.now();
    const startContext = { ...this.defaultContext, ...context };

    return {
      end: (endContext?: LogContext) => {
        const duration = Date.now() - startTime;
        this.info(`${operation} completed`, {
          ...startContext,
          ...endContext,
          duration,
        });
      },
    };
  }

  /**
   * Log HTTP request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? LogLevel.ERROR :
                  statusCode >= 400 ? LogLevel.WARN :
                  LogLevel.INFO;

    const message = `${method} ${path} ${statusCode}`;
    const fullContext = {
      ...this.defaultContext,
      ...context,
      method,
      path,
      statusCode,
      duration,
    };

    if (level === LogLevel.ERROR) {
      this.error(message, undefined, fullContext);
    } else if (level === LogLevel.WARN) {
      this.warn(message, fullContext);
    } else {
      this.info(message, fullContext);
    }
  }

  /**
   * Log cache hit/miss
   */
  logCache(operation: 'hit' | 'miss' | 'set', key: string, context?: LogContext): void {
    this.debug(`Cache ${operation}`, {
      ...this.defaultContext,
      ...context,
      cacheKey: key,
      cacheOperation: operation,
    });
  }

  /**
   * Log external API call
   */
  logApiCall(
    service: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 || statusCode === 0 ? LogLevel.ERROR :
                  statusCode >= 400 ? LogLevel.WARN :
                  LogLevel.INFO;

    const message = `${service} API call: ${endpoint}`;
    const fullContext = {
      ...this.defaultContext,
      ...context,
      apiService: service,
      apiEndpoint: endpoint,
      apiStatusCode: statusCode,
      apiDuration: duration,
    };

    if (level === LogLevel.ERROR) {
      this.error(message, undefined, fullContext);
    } else if (level === LogLevel.WARN) {
      this.warn(message, fullContext);
    } else {
      this.info(message, fullContext);
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

// Default logger instance
export const logger = new Logger();

// Export Logger class for creating custom instances
export { Logger };
