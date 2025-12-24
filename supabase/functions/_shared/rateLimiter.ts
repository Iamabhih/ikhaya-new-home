/**
 * Simple in-memory rate limiter for Edge Functions
 * For production, consider using Upstash Redis or Supabase Rate Limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on function cold start)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

/**
 * Default rate limit configs
 */
export const RATE_LIMIT_CONFIGS = {
  strict: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
  normal: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 requests per minute
  lenient: { windowMs: 60 * 1000, maxRequests: 120 }, // 120 requests per minute
  webhook: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute for webhooks
};

/**
 * Check if request is within rate limit
 * Returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.normal
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanupExpiredEntries(now);
  }

  if (!entry || entry.resetAt < now) {
    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Increment existing entry
  entry.count++;

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit key from request
 * Uses IP address, user ID, or custom identifier
 */
export function getRateLimitKey(req: Request, prefix: string = 'global'): string {
  // Try to get user ID from auth header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const userId = extractUserIdFromAuth(authHeader);
    if (userId) {
      return `${prefix}:user:${userId}`;
    }
  }

  // Fall back to IP address
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';

  return `${prefix}:ip:${ip}`;
}

/**
 * Extract user ID from authorization header
 */
function extractUserIdFromAuth(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      return payload.sub || null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': new Date(resetAt).toISOString(),
      },
    }
  );
}

/**
 * Middleware to apply rate limiting to edge function
 */
export async function withRateLimit(
  req: Request,
  handler: (req: Request) => Promise<Response>,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.normal,
  keyPrefix: string = 'global'
): Promise<Response> {
  // Skip rate limiting for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return handler(req);
  }

  const key = getRateLimitKey(req, keyPrefix);
  const { allowed, remaining, resetAt } = checkRateLimit(key, config);

  if (!allowed) {
    return createRateLimitResponse(resetAt);
  }

  // Add rate limit headers to response
  const response = await handler(req);
  const headers = new Headers(response.headers);

  headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(resetAt).toISOString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
