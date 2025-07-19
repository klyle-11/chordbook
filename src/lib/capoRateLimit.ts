// Rate limiter for capo operations to prevent V8 crashes
class CapoRateLimiter {
  private lastSaveTime = 0;
  private pendingTimeout: NodeJS.Timeout | null = null;
  private readonly MIN_INTERVAL = 2000; // Minimum 2 seconds between saves
  private readonly MAX_QUEUE_SIZE = 3;
  private saveQueue: Array<() => void> = [];

  // Debounced save to prevent rapid fire operations
  debouncedSave(saveOperation: () => void): void {
    console.log('🚦 Capo rate limiter: queueing save operation');
    
    // Clear any pending save
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
    }

    // Limit queue size to prevent memory issues
    if (this.saveQueue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('🚦 Capo save queue full, dropping oldest operation');
      this.saveQueue.shift();
    }

    // Add to queue
    this.saveQueue.push(saveOperation);

    // Schedule execution
    this.pendingTimeout = setTimeout(() => {
      this.executePendingSaves();
    }, this.MIN_INTERVAL);
  }

  // Execute pending saves with delay
  private executePendingSaves(): void {
    const now = Date.now();
    const timeSinceLastSave = now - this.lastSaveTime;

    if (timeSinceLastSave < this.MIN_INTERVAL) {
      // Too soon, reschedule
      const delay = this.MIN_INTERVAL - timeSinceLastSave;
      console.log(`🚦 Capo rate limiter: delaying save by ${delay}ms`);
      
      this.pendingTimeout = setTimeout(() => {
        this.executePendingSaves();
      }, delay);
      return;
    }

    // Execute the most recent save operation
    if (this.saveQueue.length > 0) {
      const saveOperation = this.saveQueue.pop()!; // Take the most recent
      this.saveQueue = []; // Clear queue
      
      console.log('🚦 Capo rate limiter: executing save operation');
      
      try {
        saveOperation();
        this.lastSaveTime = now;
      } catch (error) {
        console.error('🚦 Capo save operation failed:', error);
        throw error;
      }
    }

    this.pendingTimeout = null;
  }

  // Force immediate execution (for critical saves)
  forceExecute(saveOperation: () => void): void {
    console.log('🚦 Capo rate limiter: force executing save operation');
    
    // Clear any pending operations
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    
    this.saveQueue = [];
    
    try {
      saveOperation();
      this.lastSaveTime = Date.now();
    } catch (error) {
      console.error('🚦 Capo force save failed:', error);
      throw error;
    }
  }

  // Clear all pending operations
  clear(): void {
    console.log('🚦 Capo rate limiter: clearing queue');
    
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    
    this.saveQueue = [];
  }

  // Get current queue status
  getStatus(): { queueLength: number; hasPending: boolean } {
    return {
      queueLength: this.saveQueue.length,
      hasPending: this.pendingTimeout !== null
    };
  }
}

// Global instance
export const capoRateLimiter = new CapoRateLimiter();

// Safe capo change function with error handling
export function safeCapoChange<T>(
  operation: () => T,
  onError?: (error: Error) => void,
  useRateLimit = true
): T | null {
  try {
    if (useRateLimit && typeof operation === 'function') {
      // For save operations, use rate limiting
      capoRateLimiter.debouncedSave(operation);
      return null; // Async operation, no immediate return
    } else {
      // For non-save operations, execute immediately
      return operation();
    }
  } catch (error) {
    console.error('🚨 Safe capo change failed:', error);
    onError?.(error as Error);
    return null;
  }
}

export default CapoRateLimiter;
