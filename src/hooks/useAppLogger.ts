/**
 * React hook for application logging
 * Provides easy access to the app logger within React components
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { appLogger, LogCategory, generateCorrelationId } from '@/utils/appLogger';

interface UseAppLoggerOptions {
  // Auto-log page views
  autoLogPageViews?: boolean;
  // Set correlation ID for this component's logs
  correlationId?: string;
}

export function useAppLogger(options: UseAppLoggerOptions = {}) {
  const { autoLogPageViews = false, correlationId } = options;
  const location = useLocation();
  const { user } = useAuth();
  const hasLoggedInitialPageView = useRef(false);

  // Set user context when available
  useEffect(() => {
    if (user?.id) {
      logger.setContext({ userId: user.id });
    }
  }, [user?.id]);

  // Set correlation ID if provided
  useEffect(() => {
    if (correlationId) {
      logger.setContext({ correlationId });
    }
  }, [correlationId]);

  // Auto-log page views
  useEffect(() => {
    if (autoLogPageViews && !hasLoggedInitialPageView.current) {
      hasLoggedInitialPageView.current = true;
      logger.navigation.pageView(location.pathname, document.referrer);
    }
  }, [autoLogPageViews, location.pathname]);

  // Log page changes after initial
  useEffect(() => {
    if (autoLogPageViews && hasLoggedInitialPageView.current) {
      logger.navigation.pageView(location.pathname);
    }
  }, [autoLogPageViews, location.pathname]);

  // Start a performance timer
  const startTimer = useCallback((operation: string) => {
    const startTime = performance.now();
    return {
      end: (metadata?: Record<string, unknown>) => {
        const duration = Math.round(performance.now() - startTime);
        logger.performance.timing(operation, duration, metadata);
        return duration;
      },
    };
  }, []);

  // Log with automatic user context
  const logDebug = useCallback((category: LogCategory, message: string, metadata?: Record<string, unknown>) => {
    logger.debug(category, message, { ...metadata, userId: user?.id });
  }, [user?.id]);

  const logInfo = useCallback((category: LogCategory, message: string, metadata?: Record<string, unknown>) => {
    logger.info(category, message, { ...metadata, userId: user?.id });
  }, [user?.id]);

  const logWarn = useCallback((category: LogCategory, message: string, metadata?: Record<string, unknown>) => {
    logger.warn(category, message, { ...metadata, userId: user?.id });
  }, [user?.id]);

  const logError = useCallback((category: LogCategory, message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
    logger.error(category, message, error, { ...metadata, userId: user?.id });
  }, [user?.id]);

  return {
    // Core logger
    logger: appLogger,
    
    // Convenience methods
    logDebug,
    logInfo,
    logWarn,
    logError,
    
    // Auth logging
    logAuth: logger.auth,
    
    // Cart logging
    logCart: logger.cart,
    
    // Checkout logging
    logCheckout: logger.checkout,
    
    // Payment logging
    logPayment: logger.payment,
    
    // Product logging
    logProduct: logger.product,
    
    // Admin logging
    logAdmin: logger.admin,
    
    // Navigation logging
    logNavigation: logger.navigation,
    
    // Performance helpers
    startTimer,
    logTiming: logger.performance.timing,
    logApiCall: logger.performance.apiCall,
    
    // Correlation ID helpers
    startCorrelation: logger.startCorrelation,
    generateCorrelationId,
    getCorrelationId: logger.getCorrelationId,
    
    // Component error logging
    logComponentError: logger.componentError,
  };
}

export default useAppLogger;
