// Система мониторинга производительности
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
  metadata?: Record<string, any>;
}

interface PerformanceConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  reportInterval: number;
  maxMetrics: number;
  slowThreshold: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private config: PerformanceConfig = {
    enableLogging: false, // Отключаем логирование для избежания проблем
    enableReporting: false,
    reportInterval: 30000, // 30 секунд
    maxMetrics: 1000,
    slowThreshold: 1000 // 1 секунда
  };
  private reportTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...config };
    this.startReporting();
  }

  // Измерение времени выполнения функции
  async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        value: duration,
        timestamp: Date.now(),
        type: 'timing',
        metadata
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric({
        name: `${name}_error`,
        value: duration,
        timestamp: Date.now(),
        type: 'timing',
        metadata: { ...metadata, error: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  // Измерение времени выполнения синхронной функции
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        value: duration,
        timestamp: Date.now(),
        type: 'timing',
        metadata
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric({
        name: `${name}_error`,
        value: duration,
        timestamp: Date.now(),
        type: 'timing',
        metadata: { ...metadata, error: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  // Запись метрики
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Ограничиваем количество метрик
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    // Логируем медленные операции
    if (this.config.enableLogging && metric.value > this.config.slowThreshold) {
      console.warn(`Slow operation detected: ${metric.name} took ${metric.value.toFixed(2)}ms`, metric.metadata);
    }
  }

  // Измерение времени загрузки страницы
  measurePageLoad(pageName: string): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        this.recordMetric({
          name: `page_load_${pageName}`,
          value: loadTime,
          timestamp: Date.now(),
          type: 'timing',
          metadata: {
            page: pageName,
            userAgent: navigator.userAgent,
            connection: (navigator as any).connection?.effectiveType || 'unknown'
          }
        });
      });
    }
  }

  // Измерение времени ответа API
  measureApiCall(endpoint: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    this.recordMetric({
      name: `api_${endpoint}`,
      value: duration,
      timestamp: Date.now(),
      type: 'timing',
      metadata: {
        endpoint,
        success,
        ...metadata
      }
    });
  }

  // Измерение использования памяти
  measureMemory(): void {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric({
        name: 'memory_used',
        value: memory.usedJSHeapSize,
        timestamp: Date.now(),
        type: 'gauge',
        metadata: {
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        }
      });
    }
  }

  // Измерение FPS
  measureFPS(): void {
    if (typeof window !== 'undefined') {
      let frames = 0;
      let lastTime = performance.now();
      
      const measureFrame = () => {
        frames++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
          const fps = Math.round((frames * 1000) / (currentTime - lastTime));
          this.recordMetric({
            name: 'fps',
            value: fps,
            timestamp: Date.now(),
            type: 'gauge'
          });
          
          frames = 0;
          lastTime = currentTime;
        }
        
        requestAnimationFrame(measureFrame);
      };
      
      requestAnimationFrame(measureFrame);
    }
  }

  // Получение метрик
  getMetrics(filter?: { name?: string; type?: string; since?: number }): PerformanceMetric[] {
    let filtered = this.metrics;
    
    if (filter) {
      if (filter.name) {
        filtered = filtered.filter(m => m.name.includes(filter.name!));
      }
      if (filter.type) {
        filtered = filtered.filter(m => m.type === filter.type);
      }
      if (filter.since) {
        filtered = filtered.filter(m => m.timestamp >= filter.since!);
      }
    }
    
    return filtered;
  }

  // Получение статистики
  getStats(name: string, since?: number): { count: number; avg: number; min: number; max: number; p95: number } {
    const metrics = this.getMetrics({ name, since });
    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    
    if (values.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
    }
    
    const count = values.length;
    const avg = values.reduce((sum, val) => sum + val, 0) / count;
    const min = values[0];
    const max = values[count - 1];
    const p95Index = Math.floor(count * 0.95);
    const p95 = values[p95Index];
    
    return { count, avg, min, max, p95 };
  }

  // Очистка метрик
  clearMetrics(): void {
    this.metrics = [];
  }

  // Настройка конфигурации
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.enableReporting !== undefined) {
      if (config.enableReporting) {
        this.startReporting();
      } else {
        this.stopReporting();
      }
    }
  }

  // Запуск автоматической отчетности
  private startReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
    
    if (this.config.enableReporting) {
      this.reportTimer = setInterval(() => {
        this.generateReport();
      }, this.config.reportInterval);
    }
  }

  // Остановка автоматической отчетности
  private stopReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }

  // Генерация отчета
  private generateReport(): void {
    const report = {
      timestamp: Date.now(),
      metrics: this.metrics.slice(-100), // Последние 100 метрик
      stats: {
        api_calls: this.getStats('api_'),
        page_loads: this.getStats('page_load_'),
        fps: this.getStats('fps'),
        memory: this.getStats('memory_used')
      }
    };
    
    if (this.config.enableLogging) {
      console.log('Performance Report:', report);
    }
    
    // Здесь можно отправить отчет на сервер
    // this.sendReport(report);
  }

  // Отправка отчета на сервер
  private async sendReport(report: any): Promise<void> {
    try {
      await fetch('/api/performance/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.warn('Failed to send performance report:', error);
    }
  }
}

// Создаем глобальный экземпляр монитора
export const performanceMonitor = new PerformanceMonitor({
  enableLogging: process.env.NODE_ENV === 'development',
  enableReporting: process.env.NODE_ENV === 'production',
  reportInterval: 60000, // 1 минута в продакшене
  slowThreshold: 1000
});

// Утилиты для удобного использования
export const measureAsync = <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>) => 
  performanceMonitor.measureAsync(name, fn, metadata);

export const measure = <T>(name: string, fn: () => T, metadata?: Record<string, any>) => 
  performanceMonitor.measure(name, fn, metadata);

export const measurePageLoad = (pageName: string) => 
  performanceMonitor.measurePageLoad(pageName);

export const measureApiCall = (endpoint: string, duration: number, success: boolean, metadata?: Record<string, any>) => 
  performanceMonitor.measureApiCall(endpoint, duration, success, metadata);

// Инициализация мониторинга
export const initPerformanceMonitoring = () => {
  if (typeof window !== 'undefined') {
    // Измеряем FPS
    performanceMonitor.measureFPS();
    
    // Отключаем измерение памяти - оно вызывает проблемы
    // setInterval(() => {
    //   performanceMonitor.measureMemory();
    // }, 30000);
    
    // Измеряем загрузку главной страницы
    performanceMonitor.measurePageLoad('home');
  }
};
