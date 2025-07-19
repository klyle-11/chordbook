/**
 * Logging utility with different levels and rate limiting to prevent spam
 */

interface LogEntry {
  timestamp: number;
  count: number;
}

class Logger {
  private logHistory = new Map<string, LogEntry>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_LOGS_PER_WINDOW = 3;

  private shouldLog(key: string): boolean {
    const now = Date.now();
    const entry = this.logHistory.get(key);

    if (!entry) {
      this.logHistory.set(key, { timestamp: now, count: 1 });
      return true;
    }

    // Reset if outside window
    if (now - entry.timestamp > this.RATE_LIMIT_WINDOW) {
      this.logHistory.set(key, { timestamp: now, count: 1 });
      return true;
    }

    // Check if under limit
    if (entry.count < this.MAX_LOGS_PER_WINDOW) {
      entry.count++;
      return true;
    }

    return false;
  }

  info(message: string, ...args: unknown[]): void {
    const key = `info:${message}`;
    if (this.shouldLog(key)) {
      console.log(message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    // Always log errors
    console.error(message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    const key = `debug:${message}`;
    if (this.shouldLog(key) && process.env.NODE_ENV === 'development') {
      console.log(message, ...args);
    }
  }

  // Special method for operations that happen frequently
  infoThrottled(key: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog(`throttled:${key}`)) {
      console.log(message, ...args);
    }
  }
}

export const logger = new Logger();
