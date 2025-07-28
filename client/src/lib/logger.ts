// client/src/lib/logger.ts
/**
 * Centralized logging system for comprehensive debugging and monitoring
 * Provides different log levels and formatted output with timestamps
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep only last 1000 logs in memory
  private isDevelopment = import.meta.env.DEV;

  private constructor() {
    // Make logger available globally in development
    if (this.isDevelopment && typeof window !== 'undefined') {
      (window as any).DyfitLogger = this;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log WARN and ERROR
    if (!this.isDevelopment) {
      return level >= LogLevel.WARN;
    }
    return true;
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }
  }

  private getLogColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '#6B7280'; // gray
      case LogLevel.INFO: return '#3B82F6';  // blue
      case LogLevel.WARN: return '#F59E0B';  // amber
      case LogLevel.ERROR: return '#EF4444'; // red
      default: return '#000000';
    }
  }

  private getLogPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍 DEBUG';
      case LogLevel.INFO: return 'ℹ️ INFO';
      case LogLevel.WARN: return '⚠️ WARN';
      case LogLevel.ERROR: return '❌ ERROR';
      default: return 'LOG';
    }
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = this.getLogPrefix(entry.level);
    const color = this.getLogColor(entry.level);
    const style = `color: ${color}; font-weight: bold;`;
    
    const message = `[${entry.timestamp}] ${prefix} [${entry.component}] ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`%c${message}`, style, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(`%c${message}`, style, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(`%c${message}`, style, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(`%c${message}`, style, entry.data || '', entry.error || '');
        break;
    }
  }

  debug(component: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.DEBUG,
      component,
      message,
      data,
    };
    
    this.addLog(entry);
    this.logToConsole(entry);
  }

  info(component: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.INFO,
      component,
      message,
      data,
    };
    
    this.addLog(entry);
    this.logToConsole(entry);
  }

  warn(component: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.WARN,
      component,
      message,
      data,
    };
    
    this.addLog(entry);
    this.logToConsole(entry);
  }

  error(component: string, message: string, error?: Error, data?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.ERROR,
      component,
      message,
      error,
      data,
    };
    
    this.addLog(entry);
    this.logToConsole(entry);
  }

  // Performance logging
  time(component: string, label: string): void {
    if (this.isDevelopment) {
      console.time(`[${component}] ${label}`);
    }
  }

  timeEnd(component: string, label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(`[${component}] ${label}`);
    }
  }

  // Get all logs (useful for debug panel)
  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = [];
    this.info('Logger', 'All logs cleared');
  }

  // Export logs as JSON for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Component lifecycle logging helpers
  componentMounted(component: string, props?: any): void {
    this.debug(component, 'Component mounted', props ? { props } : undefined);
  }

  componentUnmounted(component: string): void {
    this.debug(component, 'Component unmounted');
  }

  componentUpdated(component: string, changes?: any): void {
    this.debug(component, 'Component updated', changes ? { changes } : undefined);
  }

  // React Query logging helpers
  queryStarted(component: string, queryKey: string): void {
    this.debug(component, `Query started: ${queryKey}`);
  }

  querySuccess(component: string, queryKey: string, data?: any): void {
    this.info(component, `Query successful: ${queryKey}`, data ? { dataLength: Array.isArray(data) ? data.length : 'object' } : undefined);
  }

  queryError(component: string, queryKey: string, error: Error): void {
    this.error(component, `Query failed: ${queryKey}`, error);
  }

  // User action logging
  userAction(component: string, action: string, data?: any): void {
    this.info(component, `User action: ${action}`, data);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Helper function for component-specific loggers
export function createComponentLogger(componentName: string) {
  return {
    debug: (message: string, data?: any) => logger.debug(componentName, message, data),
    info: (message: string, data?: any) => logger.info(componentName, message, data),
    warn: (message: string, data?: any) => logger.warn(componentName, message, data),
    error: (message: string, error?: Error, data?: any) => logger.error(componentName, message, error, data),
    time: (label: string) => logger.time(componentName, label),
    timeEnd: (label: string) => logger.timeEnd(componentName, label),
    mounted: (props?: any) => logger.componentMounted(componentName, props),
    unmounted: () => logger.componentUnmounted(componentName),
    updated: (changes?: any) => logger.componentUpdated(componentName, changes),
    queryStarted: (queryKey: string) => logger.queryStarted(componentName, queryKey),
    querySuccess: (queryKey: string, data?: any) => logger.querySuccess(componentName, queryKey, data),
    queryError: (queryKey: string, error: Error) => logger.queryError(componentName, queryKey, error),
    userAction: (action: string, data?: any) => logger.userAction(componentName, action, data),
  };
}

// React hook for easy component integration
export function useLogger(componentName: string) {
  return createComponentLogger(componentName);
}