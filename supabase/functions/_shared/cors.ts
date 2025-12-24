/**
 * CORS Configuration for Edge Functions
 * Provides secure CORS headers for production
 */

export interface CorsOptions {
  origin?: string | string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
}

/**
 * Get CORS headers for edge functions
 * In production, restricts to specific origins
 * In development, allows all origins
 */
export function getCorsHeaders(options: CorsOptions = {}): HeadersInit {
  const isDev = Deno.env.get('ENVIRONMENT') === 'development';
  const allowedOrigins = options.origin || [
    'https://ikhayahomeware.online',
    'https://www.ikhayahomeware.online',
    'https://ozzsa.com',
    'https://www.ozzsa.com',
  ];

  const allowedMethods = options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
  const allowedHeaders = options.headers || ['Content-Type', 'Authorization', 'X-Client-Info', 'apikey'];

  return {
    'Access-Control-Allow-Origin': isDev ? '*' : (Array.isArray(allowedOrigins) ? allowedOrigins[0] : allowedOrigins),
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    'Access-Control-Max-Age': '86400', // 24 hours
    ...(options.credentials ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(options: CorsOptions = {}): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(options),
  });
}

/**
 * Add CORS headers to an existing response
 */
export function addCorsHeaders(response: Response, options: CorsOptions = {}): Response {
  const corsHeaders = getCorsHeaders(options);
  const headers = new Headers(response.headers);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Validate origin against allowed list
 */
export function isOriginAllowed(origin: string | null, allowedOrigins: string | string[]): boolean {
  if (!origin) return false;

  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins];
  return origins.some((allowed) => {
    // Exact match
    if (origin === allowed) return true;

    // Wildcard subdomain match (e.g., *.example.com)
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      return origin.endsWith(domain);
    }

    return false;
  });
}
