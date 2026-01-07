/**
 * Comprehensive Application Logger with Database Persistence
 * 
 * This logger provides structured logging with:
 * - Multiple log levels (debug, info, warn, error, fatal)
 * - Categories for filtering (auth, cart, checkout, payment, product, admin, error, performance, navigation, api)
 * - Correlation IDs for tracing related events
 * - Automatic capture of user context, session, page, user agent
 * - Database persistence to application_logs table
 * - Console output in development mode
 */

import { supabase } from '@/integrations/supabase/client';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogCategory = 
  | 'auth' 
  | 'cart' 
  | 'checkout' 
  | 'payment' 
  | 'product' 
  | 'admin' 
  | 'error' 
  | 'performance' 
  | 'navigation' 
  | 'api'
  | 'system';

export type LogSource = 'frontend' | 'edge_function' | 'database';

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  source?: LogSource;
  function_name?: string;
  user_id?: string;
  session_id?: string;
  correlation_id?: string;
  metadata?: Record<string, unknown>;
  error_stack?: string;
  duration_ms?: number;
  page_path?: string;
}

interface LogContext {
  userId?: string;
  sessionId?: string;
  correlationId?: string;
}

// Generate unique session ID for this browser session
const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('app_log_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('app_log_session_id', sessionId);
  }
  return sessionId;
};

// Generate a new correlation ID for tracing related events
export const generateCorrelationId = (): string => {
  return crypto.randomUUID();
};

// Get current user ID from Supabase session
const getCurrentUserId = async (): Promise<string | undefined> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id;
  } catch {
    return undefined;
  }
};

// Get browser/device info
const getUserAgent = (): string => {
  if (typeof window === 'undefined') return '';
  return navigator.userAgent;
};

// Get current page path
const getPagePath = (): string => {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
};

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

// Console output formatting
const consoleOutput = (level: LogLevel, category: LogCategory, message: string, metadata?: Record<string, unknown>) => {
  if (!isDev) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`;
  
  const logFn = level === 'error' || level === 'fatal' 
    ? console.error 
    : level === 'warn' 
      ? console.warn 
      : level === 'debug' 
        ? console.debug 
        : console.log;
  
  if (metadata && Object.keys(metadata).length > 0) {
    logFn(prefix, message, metadata);
  } else {
    logFn(prefix, message);
  }
};

// Persist log to database
const persistLog = async (entry: LogEntry) => {
  try {
    const userId = entry.user_id || await getCurrentUserId();
    const sessionId = entry.session_id || getSessionId();
    
    const logData: Record<string, unknown> = {
      level: entry.level,
      category: entry.category,
      source: entry.source || 'frontend',
      function_name: entry.function_name || null,
      message: entry.message,
      user_id: userId || null,
      session_id: sessionId || null,
      correlation_id: entry.correlation_id || null,
      metadata: entry.metadata || {},
      error_stack: entry.error_stack || null,
      duration_ms: entry.duration_ms || null,
      ip_address: null, // Can be captured server-side
      user_agent: getUserAgent() || null,
      page_path: entry.page_path || getPagePath() || null,
    };

    // Use type assertion for insert - the table accepts these fields
    const { error } = await supabase
      .from('application_logs')
      .insert([logData as any]);

    if (error) {
      // Don't throw - logging errors shouldn't break the app
      console.error('[AppLogger] Failed to persist log:', error.message);
    }
  } catch (err) {
    // Silently fail - logging should never crash the app
    console.error('[AppLogger] Error persisting log:', err);
  }
};

// Main log function
const log = async (entry: LogEntry) => {
  // Always output to console in dev
  consoleOutput(entry.level, entry.category, entry.message, entry.metadata);
  
  // Always persist to database
  await persistLog(entry);
};

// Context holder for correlation IDs
let currentContext: LogContext = {};

export const appLogger = {
  // Set context for subsequent logs
  setContext(context: Partial<LogContext>) {
    currentContext = { ...currentContext, ...context };
  },

  // Clear context
  clearContext() {
    currentContext = {};
  },

  // Get current correlation ID
  getCorrelationId(): string | undefined {
    return currentContext.correlationId;
  },

  // Start a new correlation (e.g., for checkout flow)
  startCorrelation(): string {
    const correlationId = generateCorrelationId();
    currentContext.correlationId = correlationId;
    return correlationId;
  },

  // Generic log methods
  debug(category: LogCategory, message: string, metadata?: Record<string, unknown>) {
    log({
      level: 'debug',
      category,
      message,
      metadata,
      correlation_id: currentContext.correlationId,
      user_id: currentContext.userId,
      session_id: currentContext.sessionId,
    });
  },

  info(category: LogCategory, message: string, metadata?: Record<string, unknown>) {
    log({
      level: 'info',
      category,
      message,
      metadata,
      correlation_id: currentContext.correlationId,
      user_id: currentContext.userId,
      session_id: currentContext.sessionId,
    });
  },

  warn(category: LogCategory, message: string, metadata?: Record<string, unknown>) {
    log({
      level: 'warn',
      category,
      message,
      metadata,
      correlation_id: currentContext.correlationId,
      user_id: currentContext.userId,
      session_id: currentContext.sessionId,
    });
  },

  error(category: LogCategory, message: string, error?: Error | unknown, metadata?: Record<string, unknown>) {
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    log({
      level: 'error',
      category,
      message,
      metadata: { ...metadata, errorMessage },
      error_stack: errorStack,
      correlation_id: currentContext.correlationId,
      user_id: currentContext.userId,
      session_id: currentContext.sessionId,
    });
  },

  fatal(category: LogCategory, message: string, error?: Error | unknown, metadata?: Record<string, unknown>) {
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    log({
      level: 'fatal',
      category,
      message,
      metadata: { ...metadata, errorMessage },
      error_stack: errorStack,
      correlation_id: currentContext.correlationId,
      user_id: currentContext.userId,
      session_id: currentContext.sessionId,
    });
  },

  // Convenience methods for specific categories
  auth: {
    login(email: string, success: boolean, metadata?: Record<string, unknown>) {
      log({
        level: success ? 'info' : 'warn',
        category: 'auth',
        message: success ? `User logged in: ${email}` : `Login failed for: ${email}`,
        metadata: { email, success, ...metadata },
        function_name: 'auth.login',
      });
    },
    logout(email?: string) {
      log({
        level: 'info',
        category: 'auth',
        message: `User logged out${email ? `: ${email}` : ''}`,
        metadata: { email },
        function_name: 'auth.logout',
      });
    },
    signUp(email: string, success: boolean, metadata?: Record<string, unknown>) {
      log({
        level: success ? 'info' : 'warn',
        category: 'auth',
        message: success ? `User signed up: ${email}` : `Sign up failed for: ${email}`,
        metadata: { email, success, ...metadata },
        function_name: 'auth.signUp',
      });
    },
    sessionRestored(userId: string, email?: string) {
      log({
        level: 'info',
        category: 'auth',
        message: `Session restored for user: ${email || userId}`,
        metadata: { userId, email },
        function_name: 'auth.sessionRestored',
      });
    },
    sessionExpired() {
      log({
        level: 'info',
        category: 'auth',
        message: 'Session expired',
        function_name: 'auth.sessionExpired',
      });
    },
  },

  cart: {
    addItem(productId: string, quantity: number, productName?: string, price?: number) {
      log({
        level: 'info',
        category: 'cart',
        message: `Added to cart: ${productName || productId}`,
        metadata: { productId, quantity, productName, price },
        function_name: 'cart.addItem',
        correlation_id: currentContext.correlationId,
      });
    },
    removeItem(productId: string, productName?: string) {
      log({
        level: 'info',
        category: 'cart',
        message: `Removed from cart: ${productName || productId}`,
        metadata: { productId, productName },
        function_name: 'cart.removeItem',
        correlation_id: currentContext.correlationId,
      });
    },
    updateQuantity(productId: string, oldQuantity: number, newQuantity: number) {
      log({
        level: 'info',
        category: 'cart',
        message: `Updated cart quantity: ${oldQuantity} → ${newQuantity}`,
        metadata: { productId, oldQuantity, newQuantity },
        function_name: 'cart.updateQuantity',
        correlation_id: currentContext.correlationId,
      });
    },
    clear(itemCount: number, totalValue: number) {
      log({
        level: 'info',
        category: 'cart',
        message: `Cart cleared: ${itemCount} items, total R${totalValue}`,
        metadata: { itemCount, totalValue },
        function_name: 'cart.clear',
        correlation_id: currentContext.correlationId,
      });
    },
  },

  checkout: {
    started(cartValue: number, itemCount: number) {
      const correlationId = generateCorrelationId();
      currentContext.correlationId = correlationId;
      log({
        level: 'info',
        category: 'checkout',
        message: `Checkout started: ${itemCount} items, R${cartValue}`,
        metadata: { cartValue, itemCount },
        function_name: 'checkout.started',
        correlation_id: correlationId,
      });
      return correlationId;
    },
    formValidated(valid: boolean, errors?: string[]) {
      log({
        level: valid ? 'info' : 'warn',
        category: 'checkout',
        message: valid ? 'Checkout form validated' : 'Checkout form validation failed',
        metadata: { valid, errors },
        function_name: 'checkout.formValidated',
        correlation_id: currentContext.correlationId,
      });
    },
    deliverySelected(option: string, fee: number) {
      log({
        level: 'info',
        category: 'checkout',
        message: `Delivery option selected: ${option}, fee: R${fee}`,
        metadata: { option, fee },
        function_name: 'checkout.deliverySelected',
        correlation_id: currentContext.correlationId,
      });
    },
    paymentMethodSelected(method: string) {
      log({
        level: 'info',
        category: 'checkout',
        message: `Payment method selected: ${method}`,
        metadata: { method },
        function_name: 'checkout.paymentMethodSelected',
        correlation_id: currentContext.correlationId,
      });
    },
    paymentInitiated(method: string, amount: number, orderId?: string) {
      log({
        level: 'info',
        category: 'checkout',
        message: `Payment initiated: ${method}, R${amount}`,
        metadata: { method, amount, orderId },
        function_name: 'checkout.paymentInitiated',
        correlation_id: currentContext.correlationId,
      });
    },
    paymentRedirect(provider: string, orderId: string) {
      log({
        level: 'info',
        category: 'checkout',
        message: `Redirecting to ${provider} for payment`,
        metadata: { provider, orderId },
        function_name: 'checkout.paymentRedirect',
        correlation_id: currentContext.correlationId,
      });
    },
    completed(orderId: string, amount: number) {
      log({
        level: 'info',
        category: 'checkout',
        message: `Checkout completed: Order ${orderId}, R${amount}`,
        metadata: { orderId, amount },
        function_name: 'checkout.completed',
        correlation_id: currentContext.correlationId,
      });
    },
    failed(reason: string, error?: unknown) {
      log({
        level: 'error',
        category: 'checkout',
        message: `Checkout failed: ${reason}`,
        metadata: { reason },
        error_stack: error instanceof Error ? error.stack : undefined,
        function_name: 'checkout.failed',
        correlation_id: currentContext.correlationId,
      });
    },
  },

  payment: {
    webhookReceived(paymentId: string, status: string, provider: string) {
      log({
        level: 'info',
        category: 'payment',
        message: `Payment webhook received: ${status}`,
        metadata: { paymentId, status, provider },
        function_name: 'payment.webhookReceived',
        source: 'edge_function',
      });
    },
    success(orderId: string, amount: number, provider: string) {
      log({
        level: 'info',
        category: 'payment',
        message: `Payment successful: Order ${orderId}, R${amount}`,
        metadata: { orderId, amount, provider },
        function_name: 'payment.success',
        correlation_id: currentContext.correlationId,
      });
    },
    failed(orderId: string, reason: string, provider: string) {
      log({
        level: 'error',
        category: 'payment',
        message: `Payment failed: ${reason}`,
        metadata: { orderId, reason, provider },
        function_name: 'payment.failed',
        correlation_id: currentContext.correlationId,
      });
    },
  },

  product: {
    viewed(productId: string, productName: string, price: number) {
      log({
        level: 'info',
        category: 'product',
        message: `Product viewed: ${productName}`,
        metadata: { productId, productName, price },
        function_name: 'product.viewed',
      });
    },
    searched(query: string, resultsCount: number) {
      log({
        level: 'info',
        category: 'product',
        message: `Product search: "${query}" (${resultsCount} results)`,
        metadata: { query, resultsCount },
        function_name: 'product.searched',
      });
    },
  },

  admin: {
    action(action: string, target: string, metadata?: Record<string, unknown>) {
      log({
        level: 'info',
        category: 'admin',
        message: `Admin action: ${action} on ${target}`,
        metadata: { action, target, ...metadata },
        function_name: 'admin.action',
      });
    },
    login(email: string) {
      log({
        level: 'info',
        category: 'admin',
        message: `Admin login: ${email}`,
        metadata: { email },
        function_name: 'admin.login',
      });
    },
  },

  navigation: {
    pageView(path: string, referrer?: string) {
      log({
        level: 'info',
        category: 'navigation',
        message: `Page view: ${path}`,
        metadata: { path, referrer },
        function_name: 'navigation.pageView',
        page_path: path,
      });
    },
  },

  performance: {
    timing(operation: string, durationMs: number, metadata?: Record<string, unknown>) {
      log({
        level: 'info',
        category: 'performance',
        message: `Performance: ${operation} took ${durationMs}ms`,
        metadata: { operation, ...metadata },
        duration_ms: durationMs,
        function_name: 'performance.timing',
      });
    },
    apiCall(endpoint: string, method: string, durationMs: number, status: number) {
      log({
        level: status >= 400 ? 'warn' : 'info',
        category: 'api',
        message: `API ${method} ${endpoint}: ${status} (${durationMs}ms)`,
        metadata: { endpoint, method, status },
        duration_ms: durationMs,
        function_name: 'performance.apiCall',
      });
    },
  },

  componentError(componentName: string, error: Error, componentStack?: string) {
    log({
      level: 'error',
      category: 'error',
      message: `Component error in ${componentName}: ${error.message}`,
      metadata: { componentName, componentStack },
      error_stack: error.stack,
      function_name: 'componentError',
    });
  },
};

export default appLogger;
