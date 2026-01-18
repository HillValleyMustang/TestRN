/**
 * Centralized logging utility for the mobile app
 * All logs are automatically gated by __DEV__ to prevent production logs
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

/**
 * Base logger function that checks __DEV__ before logging
 */
const createLogger = (level: LogLevel) => (...args: any[]) => {
  if (__DEV__) {
    console[level](...args);
  }
};

/**
 * Error logger - always logs errors, even in production
 * (but can be filtered by log level if needed)
 */
const error = (...args: any[]) => {
  console.error(...args);
};

/**
 * Logging utilities - only log in development mode
 */
export const logger = {
  log: createLogger('log'),
  warn: createLogger('warn'),
  info: createLogger('info'),
  debug: createLogger('debug'),
  error, // Errors are always logged
};

/**
 * Helper for tagged logs (e.g., [ComponentName])
 */
export const createTaggedLogger = (tag: string) => ({
  log: (...args: any[]) => logger.log(`[${tag}]`, ...args),
  warn: (...args: any[]) => logger.warn(`[${tag}]`, ...args),
  info: (...args: any[]) => logger.info(`[${tag}]`, ...args),
  debug: (...args: any[]) => logger.debug(`[${tag}]`, ...args),
  error: (...args: any[]) => logger.error(`[${tag}]`, ...args),
});
