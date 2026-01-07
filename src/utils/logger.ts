/**
 * Production-safe logger utility
 * Logs are only output in development mode (import.meta.env.DEV)
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.log('message');
 *   logger.error('error message');
 *   logger.warn('warning');
 *   logger.debug('debug info');
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'info';

const createLogger = () => {
  const noop = () => {};

  const log = (level: LogLevel, ...args: unknown[]) => {
    if (isDev && console[level]) {
      console[level](...args);
    }
  };

  return {
    log: isDev ? (...args: unknown[]) => log('log', ...args) : noop,
    error: isDev ? (...args: unknown[]) => log('error', ...args) : noop,
    warn: isDev ? (...args: unknown[]) => log('warn', ...args) : noop,
    debug: isDev ? (...args: unknown[]) => log('debug', ...args) : noop,
    info: isDev ? (...args: unknown[]) => log('info', ...args) : noop,

    // Force log even in production (use sparingly)
    force: {
      log: (...args: unknown[]) => console.log(...args),
      error: (...args: unknown[]) => console.error(...args),
      warn: (...args: unknown[]) => console.warn(...args),
    }
  };
};

export const logger = createLogger();

// Re-export for convenience
export default logger;
