/**
 * Input validation utilities for API routes
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a search query string
 *
 * Rules:
 * - Must be between 1 and 200 characters (after trimming)
 * - No control characters (ASCII 0-31)
 * - No null bytes
 *
 * @param query - The search query to validate
 * @returns Validation result with error message if invalid
 */
export function validateSearchQuery(query: string | null | undefined): ValidationResult {
  // Check if query exists
  if (!query) {
    return { valid: false, error: 'Query parameter is required' };
  }

  // Trim and check length
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: 'Query cannot exceed 200 characters' };
  }

  // Check for control characters (ASCII 0-31, except space which is allowed after trim)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B-\x0C\x0E-\x1F]/.test(trimmed)) {
    return { valid: false, error: 'Query contains invalid control characters' };
  }

  return { valid: true };
}

/**
 * Validates a TMDB movie ID
 *
 * Rules:
 * - Must be a valid integer
 * - Must be positive (> 0)
 * - Must not exceed 10,000,000 (TMDB's approximate upper bound)
 *
 * @param id - The movie ID to validate (as string from URL param)
 * @returns Validation result with error message if invalid
 */
export function validateMovieId(id: string | null | undefined): ValidationResult {
  // Check if ID exists
  if (!id) {
    return { valid: false, error: 'Movie ID is required' };
  }

  // Parse to integer
  const parsed = parseInt(id, 10);

  // Check if parsing resulted in NaN
  if (isNaN(parsed)) {
    return { valid: false, error: 'Movie ID must be a valid number' };
  }

  // Check if it's a positive integer
  if (parsed <= 0) {
    return { valid: false, error: 'Movie ID must be a positive number' };
  }

  // Check if it's within reasonable bounds (TMDB IDs don't go this high yet)
  if (parsed > 10000000) {
    return { valid: false, error: 'Movie ID exceeds maximum value' };
  }

  // Check if the string representation matches (catches decimal inputs like "123.456")
  if (id !== parsed.toString()) {
    return { valid: false, error: 'Movie ID must be an integer' };
  }

  return { valid: true };
}
