interface ComponentError {
  componentName: string;
  error: Error;
  timestamp: Date;
  recovered: boolean;
}

class ErrorMonitoringService {
  private errors: ComponentError[] = [];
  private maxErrors = 50; // Keep last 50 errors

  logComponentError(componentName: string, error: Error) {
    const componentError: ComponentError = {
      componentName,
      error,
      timestamp: new Date(),
      recovered: false
    };

    this.errors.unshift(componentError);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console with component context
    console.error(`[ErrorBoundary:${componentName}]`, error.message, {
      stack: error.stack,
      timestamp: componentError.timestamp.toISOString()
    });

    // Save to localStorage for debugging
    try {
      localStorage.setItem('chordbook_error_log', JSON.stringify(this.errors));
    } catch (e) {
      console.warn('Could not save error log to localStorage:', e);
    }
  }

  markComponentRecovered(componentName: string) {
    const recentError = this.errors.find(
      err => err.componentName === componentName && !err.recovered
    );
    
    if (recentError) {
      recentError.recovered = true;
      console.info(`[ErrorBoundary:${componentName}] Component recovered`);
    }
  }

  getRecentErrors(componentName?: string): ComponentError[] {
    if (componentName) {
      return this.errors.filter(err => err.componentName === componentName);
    }
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
    try {
      localStorage.removeItem('chordbook_error_log');
    } catch (e) {
      console.warn('Could not clear error log from localStorage:', e);
    }
  }

  getErrorStats() {
    const stats = this.errors.reduce((acc, error) => {
      const component = error.componentName;
      if (!acc[component]) {
        acc[component] = { total: 0, recovered: 0 };
      }
      acc[component].total++;
      if (error.recovered) {
        acc[component].recovered++;
      }
      return acc;
    }, {} as Record<string, { total: number; recovered: number }>);

    return stats;
  }
}

export const errorMonitor = new ErrorMonitoringService();
export type { ComponentError };
