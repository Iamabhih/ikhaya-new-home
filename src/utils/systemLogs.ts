/**
 * System Logging Utilities
 * For tracking changes and API requests between lovable.dev and Supabase
 * 
 * Note: These are utility functions that log to console.
 * Database logging tables can be added later via migration if needed.
 */

import { logger } from './logger';

export type ChangeType = 
  | 'migration'
  | 'schema_change'
  | 'config_update'
  | 'data_import'
  | 'feature_toggle'
  | 'deployment'
  | 'rollback'
  | 'manual_fix'
  | 'other';

export type SourceSystem = 'lovable' | 'supabase' | 'manual' | 'automated';

export interface SystemChangeLogParams {
  changeType: ChangeType;
  sourceSystem: SourceSystem;
  description: string;
  component?: string;
  changeData?: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Log a system change (console-based logging)
 * Used for tracking changes from lovable.dev, migrations, config updates, etc.
 */
export async function logSystemChange(params: SystemChangeLogParams): Promise<string | null> {
  try {
    const logId = generateRequestId();
    logger.info('System change logged:', {
      id: logId,
      changeType: params.changeType,
      sourceSystem: params.sourceSystem,
      description: params.description,
      component: params.component,
      tags: params.tags,
    });
    return logId;
  } catch (error) {
    logger.error('Error logging system change:', error);
    return null;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
export type RequestStatus = 'success' | 'error' | 'timeout' | 'cancelled' | 'partial';

export interface ApiRequestLogParams {
  method: HttpMethod;
  endpoint: string;
  sourceSystem: string;
  targetSystem: string;
  responseStatus?: number;
  responseTimeMs?: number;
  status?: RequestStatus;
  requestId?: string;
  correlationId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an API request for tracking and debugging (console-based)
 * Used to monitor requests between frontend, lovable.dev, and Supabase
 */
export async function logApiRequest(params: ApiRequestLogParams): Promise<string | null> {
  try {
    const logId = params.requestId || generateRequestId();
    
    if (params.status === 'error') {
      logger.error('API request failed:', {
        id: logId,
        method: params.method,
        endpoint: params.endpoint,
        status: params.responseStatus,
        error: params.errorMessage,
      });
    } else {
      logger.debug('API request:', {
        id: logId,
        method: params.method,
        endpoint: params.endpoint,
        status: params.responseStatus,
        responseTimeMs: params.responseTimeMs,
      });
    }
    
    return logId;
  } catch (error) {
    logger.error('Error logging API request:', error);
    return null;
  }
}

/**
 * Create a correlation ID for tracking related requests
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().split('-')[0];
  return `corr-${timestamp}-${random}`;
}

/**
 * Create a request ID for unique request identification
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().split('-')[0];
  return `req-${timestamp}-${random}`;
}

/**
 * Helper to track Supabase function calls
 */
export async function trackSupabaseCall<T>(
  functionName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();
  const requestId = generateRequestId();

  try {
    const result = await operation();
    const responseTime = Math.round(performance.now() - startTime);

    // Log successful request
    await logApiRequest({
      method: 'POST',
      endpoint: `/functions/v1/${functionName}`,
      sourceSystem: 'frontend',
      targetSystem: 'supabase',
      responseStatus: 200,
      responseTimeMs: responseTime,
      status: 'success',
      requestId,
      metadata,
    });

    return result;
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);

    // Log failed request
    await logApiRequest({
      method: 'POST',
      endpoint: `/functions/v1/${functionName}`,
      sourceSystem: 'frontend',
      targetSystem: 'supabase',
      responseStatus: 500,
      responseTimeMs: responseTime,
      status: 'error',
      requestId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata,
    });

    throw error;
  }
}

/**
 * Get recent error logs (placeholder - returns empty array)
 * Can be implemented with database tables later
 */
export async function getRecentErrors(limit: number = 50): Promise<any[]> {
  logger.debug(`getRecentErrors called with limit: ${limit}`);
  return [];
}

/**
 * Get system change logs (placeholder - returns empty array)
 * Can be implemented with database tables later
 */
export async function getSystemChangeLogs(
  limit: number = 50,
  changeType?: ChangeType,
  sourceSystem?: SourceSystem
): Promise<any[]> {
  logger.debug(`getSystemChangeLogs called with limit: ${limit}, changeType: ${changeType}, sourceSystem: ${sourceSystem}`);
  return [];
}
