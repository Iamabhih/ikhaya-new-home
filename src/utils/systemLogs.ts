/**
 * System Logging Utilities
 * For tracking changes and API requests between lovable.dev and Supabase
 */

import { supabase } from '@/integrations/supabase/client';
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
 * Log a system change to the database
 * Used for tracking changes from lovable.dev, migrations, config updates, etc.
 */
export async function logSystemChange(params: SystemChangeLogParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_system_change', {
      p_change_type: params.changeType,
      p_source_system: params.sourceSystem,
      p_description: params.description,
      p_component: params.component || null,
      p_change_data: params.changeData || null,
      p_previous_state: params.previousState || null,
      p_new_state: params.newState || null,
      p_tags: params.tags || null,
      p_metadata: params.metadata || null,
    });

    if (error) {
      logger.error('Failed to log system change:', error);
      return null;
    }

    logger.info('System change logged:', params.description);
    return data as string;
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
 * Log an API request for tracking and debugging
 * Used to monitor requests between frontend, lovable.dev, and Supabase
 */
export async function logApiRequest(params: ApiRequestLogParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_api_request', {
      p_method: params.method,
      p_endpoint: params.endpoint,
      p_source_system: params.sourceSystem,
      p_target_system: params.targetSystem,
      p_response_status: params.responseStatus || null,
      p_response_time_ms: params.responseTimeMs || null,
      p_status: params.status || 'success',
      p_request_id: params.requestId || null,
      p_correlation_id: params.correlationId || null,
      p_error_message: params.errorMessage || null,
      p_metadata: params.metadata || null,
    });

    if (error) {
      logger.error('Failed to log API request:', error);
      return null;
    }

    return data as string;
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
  return 'corr-' + timestamp + '-' + random;
}

/**
 * Create a request ID for unique request identification
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().split('-')[0];
  return 'req-' + timestamp + '-' + random;
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
      endpoint: '/functions/v1/' + functionName,
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
      endpoint: '/functions/v1/' + functionName,
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
 * Get recent error logs (admin only)
 */
export async function getRecentErrors(limit: number = 50) {
  const { data, error } = await supabase
    .from('recent_request_errors')
    .select('*')
    .limit(limit);

  if (error) {
    logger.error('Failed to fetch recent errors:', error);
    return [];
  }

  return data || [];
}

/**
 * Get system change logs (admin only)
 */
export async function getSystemChangeLogs(
  limit: number = 50,
  changeType?: ChangeType,
  sourceSystem?: SourceSystem
) {
  let query = supabase
    .from('system_change_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (changeType) {
    query = query.eq('change_type', changeType);
  }

  if (sourceSystem) {
    query = query.eq('source_system', sourceSystem);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch system change logs:', error);
    return [];
  }

  return data || [];
}
