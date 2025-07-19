import { SecurityError, ValidationError, safeJSONParse, safeJSONStringify } from './secureJson';

export class StorageError extends Error {
  public readonly cause?: Error;
  
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

export class StorageQuotaError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'StorageQuotaError';
  }
}

interface StorageOptions {
  maxSize?: number;
  compression?: boolean;
  encryption?: boolean;
  validator?: (data: unknown) => boolean;
}

/**
 * Secure wrapper for localStorage with error handling and validation
 */
export class SecureStorage {
  private readonly maxItemSize: number;
  private readonly maxTotalSize: number;

  constructor(
    maxSize: number = 5 * 1024 * 1024, // 5MB default
    maxItems: number = 1000
  ) {
    this.maxItemSize = maxSize * 0.1; // 10% of total for single item
    this.maxTotalSize = maxSize;
    // Note: maxItems parameter is available for future use
    console.debug(`SecureStorage initialized with max ${maxItems} items`);
  }

  /**
   * Check if localStorage is available
   */
  private checkAvailability(): void {
    try {
      const testKey = '__secureStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (error) {
      throw new StorageError('localStorage is not available', error as Error);
    }
  }

  /**
   * Get current storage usage
   */
  getStorageUsage(): { used: number; available: number; percentage: number } {
    let used = 0;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to calculate storage usage:', error);
    }

    const available = this.maxTotalSize - used;
    const percentage = (used / this.maxTotalSize) * 100;

    return { used, available, percentage };
  }

  /**
   * Clean up old or less important items when quota is exceeded
   */
  private cleanupStorage(): void {
    const itemsToRemove: Array<{ key: string; lastAccess: number }> = [];

    try {
      // Find old items that can be safely removed
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('chordbook-backup-') || key.startsWith('chordbook-temp-'))) {
          const lastAccessKey = `${key}_lastAccess`;
          const lastAccessStr = localStorage.getItem(lastAccessKey);
          const lastAccess = lastAccessStr ? parseInt(lastAccessStr, 10) : 0;
          
          itemsToRemove.push({ key, lastAccess });
        }
      }

      // Sort by last access time and remove oldest items
      itemsToRemove
        .sort((a, b) => a.lastAccess - b.lastAccess)
        .slice(0, Math.max(1, Math.floor(itemsToRemove.length * 0.2))) // Remove up to 20%
        .forEach(item => {
          try {
            localStorage.removeItem(item.key);
            localStorage.removeItem(`${item.key}_lastAccess`);
          } catch (error) {
            console.warn(`Failed to remove item ${item.key}:`, error);
          }
        });

    } catch (error) {
      console.warn('Storage cleanup failed:', error);
    }
  }

  /**
   * Securely store data with validation
   */
  setItem<T>(key: string, value: T, options: StorageOptions = {}): void {
    this.checkAvailability();

    if (!key || typeof key !== 'string') {
      throw new ValidationError('Storage key must be a non-empty string');
    }

    if (key.length > 200) {
      throw new ValidationError('Storage key too long (max 200 characters)');
    }

    try {
      // Validate data if validator provided
      if (options.validator && !options.validator(value)) {
        throw new ValidationError('Data failed validation');
      }

      // Serialize data safely
      const serialized = safeJSONStringify(value, { maxSize: this.maxItemSize });

      // Check if item would exceed individual size limit
      const totalSize = key.length + serialized.length;
      if (totalSize > this.maxItemSize) {
        throw new StorageQuotaError(
          `Item too large: ${totalSize} bytes (max: ${this.maxItemSize})`
        );
      }

      // Try to store the item
      try {
        localStorage.setItem(key, serialized);
        localStorage.setItem(`${key}_lastAccess`, Date.now().toString());
      } catch (error) {
        // Handle quota exceeded error
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          // Try cleanup and retry once
          this.cleanupStorage();
          
          try {
            localStorage.setItem(key, serialized);
            localStorage.setItem(`${key}_lastAccess`, Date.now().toString());
          } catch (retryError) {
            throw new StorageQuotaError(
              'Storage quota exceeded even after cleanup',
              retryError as Error
            );
          }
        } else {
          throw new StorageError('Failed to store item', error as Error);
        }
      }

    } catch (error) {
      if (error instanceof SecurityError || 
          error instanceof ValidationError || 
          error instanceof StorageQuotaError) {
        throw error;
      }
      
      throw new StorageError('Storage operation failed', error as Error);
    }
  }

  /**
   * Securely retrieve data with validation
   */
  getItem<T>(key: string, options: StorageOptions = {}): T | null {
    this.checkAvailability();

    if (!key || typeof key !== 'string') {
      throw new ValidationError('Storage key must be a non-empty string');
    }

    try {
      const serialized = localStorage.getItem(key);
      
      if (serialized === null) {
        return null;
      }

      // Update last access time
      localStorage.setItem(`${key}_lastAccess`, Date.now().toString());

      // Parse and validate data
      const parsed = safeJSONParse<T>(serialized, {
        maxSize: this.maxItemSize
        // Note: validator type mismatch, using custom validation if needed
      });

      // Run custom validation if provided
      if (options.validator && parsed !== null && !options.validator(parsed)) {
        console.warn(`Data validation failed for key: ${key}`);
        return null;
      }

      return parsed;
    } catch (error) {
      if (error instanceof SecurityError || error instanceof ValidationError) {
        console.error(`Failed to retrieve ${key}:`, error.message);
        return null;
      }
      
      throw new StorageError(`Failed to retrieve item: ${key}`, error as Error);
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string): void {
    this.checkAvailability();

    if (!key || typeof key !== 'string') {
      throw new ValidationError('Storage key must be a non-empty string');
    }

    try {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_lastAccess`);
    } catch (error) {
      throw new StorageError(`Failed to remove item: ${key}`, error as Error);
    }
  }

  /**
   * Check if item exists
   */
  hasItem(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Clear all storage (with confirmation)
   */
  clear(confirm = false): void {
    if (!confirm) {
      throw new StorageError('Storage clear requires explicit confirmation');
    }

    try {
      localStorage.clear();
    } catch (error) {
      throw new StorageError('Failed to clear storage', error as Error);
    }
  }

  /**
   * Get all keys matching a pattern
   */
  getKeys(pattern?: RegExp): string[] {
    const keys: string[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (!pattern || pattern.test(key))) {
          // Skip internal keys
          if (!key.endsWith('_lastAccess')) {
            keys.push(key);
          }
        }
      }
    } catch (error) {
      throw new StorageError('Failed to enumerate keys', error as Error);
    }

    return keys;
  }

  /**
   * Export all data for backup
   */
  exportData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    try {
      const keys = this.getKeys();
      for (const key of keys) {
        try {
          const value = this.getItem(key);
          if (value !== null) {
            data[key] = value;
          }
        } catch (error) {
          console.warn(`Failed to export ${key}:`, error);
        }
      }
    } catch (error) {
      throw new StorageError('Failed to export data', error as Error);
    }

    return data;
  }
}

// Create a global instance
export const secureStorage = new SecureStorage();
