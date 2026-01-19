/**
 * Centralized logging utility for the mobile app
 * Supports log levels with filtering - by default only shows warnings and errors in dev
 * Set global.ENABLE_DEBUG_LOGS = true to see all logs including debug/info
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

// Check if debug logs are enabled via global flag (can be set in app initialization)
const DEBUG_LOGS_ENABLED = 
  typeof global !== 'undefined' && (global as any).ENABLE_DEBUG_LOGS === true;

// Default log level: only show warnings and errors unless debug is enabled
const shouldLog = (level: LogLevel): boolean => {
  if (!__DEV__) {
    // Production: only errors
    return level === 'error';
  }
  
  if (DEBUG_LOGS_ENABLED) {
    // Debug mode enabled: show everything
    return true;
  }
  
  // Development default: show only warnings and errors
  // Set global.ENABLE_DEBUG_LOGS = true to see info/debug logs
  return level === 'warn' || level === 'error';
};

/**
 * Base logger function that checks log level before logging
 */
const createLogger = (level: LogLevel) => (...args: any[]) => {
  if (shouldLog(level)) {
    // Use console.log for debug level since console.debug might not be visible
    console[level === 'debug' ? 'log' : level](...args);
  }
};

/**
 * Error logger - always logs errors, even in production
 */
const error = (...args: any[]) => {
  console.error(...args);
};

/**
 * Logging utilities with level-based filtering
 * - error: Always logged (critical issues)
 * - warn: Always shown in dev (warnings)
 * - info: Hidden by default in dev (set ENABLE_DEBUG_LOGS=true to see)
 * - log: Hidden by default (use info for important messages)
 * - debug: Hidden by default (verbose technical logs - state updates, calculations, etc.)
 */
export const logger = {
  log: createLogger('log'),   // Hidden by default in dev (use info for important messages)
  warn: createLogger('warn'), // Always shown in dev
  info: createLogger('info'), // Shown in dev by default (important events)
  debug: createLogger('debug'), // Hidden by default (verbose technical logs)
  error, // Always logged
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
