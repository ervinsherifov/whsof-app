import { captureMessage } from './sentry';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private thresholds = {
    'api_response_time': 2000, // 2 seconds
    'component_render_time': 100, // 100ms
    'page_load_time': 3000, // 3 seconds
    'data_fetch_time': 1500, // 1.5 seconds
  };

  measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const start = performance.now();
    
    return fn().then(
      (result) => {
        const duration = performance.now() - start;
        this.recordMetric(name, duration, metadata);
        return result;
      },
      (error) => {
        const duration = performance.now() - start;
        this.recordMetric(name, duration, { ...metadata, error: true });
        throw error;
      }
    );
  }

  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  private recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Check threshold
    const threshold = this.thresholds[name];
    if (threshold && value > threshold) {
      captureMessage(
        `Performance threshold exceeded: ${name} took ${value.toFixed(2)}ms (threshold: ${threshold}ms)`,
        'warning'
      );
    }

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`, metadata);
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getAverageMetric(name: string, timeWindow = 60000): number | null {
    const now = Date.now();
    const relevantMetrics = this.metrics.filter(
      m => m.name === name && (now - m.timestamp) <= timeWindow
    );

    if (relevantMetrics.length === 0) return null;

    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Utility functions for common measurements
export const measureApiCall = <T>(
  apiName: string, 
  apiCall: () => Promise<T>
): Promise<T> => {
  return performanceMonitor.measure(`api_${apiName}`, apiCall);
};

export const measureComponentRender = <T>(
  componentName: string, 
  renderFn: () => T
): T => {
  return performanceMonitor.measureSync(`render_${componentName}`, renderFn);
};

export const measureDataFetch = <T>(
  fetchName: string, 
  fetchFn: () => Promise<T>
): Promise<T> => {
  return performanceMonitor.measure(`fetch_${fetchName}`, fetchFn);
};
