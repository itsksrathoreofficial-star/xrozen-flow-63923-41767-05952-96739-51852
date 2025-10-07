/**
 * Database Performance Monitoring & Alerting System
 * Phase 4: Production monitoring and optimization
 */

export interface PerformanceMetric {
  timestamp: number;
  operation: string;
  duration: number;
  collection: string;
  success: boolean;
  error?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: 'query_time' | 'error_rate' | 'connection_failure';
  threshold: number;
  enabled: boolean;
  notificationChannels: ('email' | 'webhook' | 'console')[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  avgQueryTime: number;
  errorRate: number;
  connectionPoolUtilization: number;
  lastChecked: number;
}

class DatabaseMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private alerts: AlertRule[] = [];
  private healthStatus: SystemHealth = {
    status: 'healthy',
    uptime: 0,
    avgQueryTime: 0,
    errorRate: 0,
    connectionPoolUtilization: 0,
    lastChecked: Date.now(),
  };
  private startTime = Date.now();
  private maxMetricsSize = 1000; // Keep last 1000 metrics

  /**
   * Record a database operation metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    // Check alert rules
    this.checkAlerts(fullMetric);

    // Update health status
    this.updateHealthStatus();
  }

  /**
   * Get metrics for a specific time window
   */
  getMetrics(timeWindowMs: number = 3600000): PerformanceMetric[] {
    const cutoffTime = Date.now() - timeWindowMs;
    return this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Get aggregated statistics
   */
  getStatistics(timeWindowMs: number = 3600000): {
    totalOperations: number;
    avgQueryTime: number;
    successRate: number;
    errorRate: number;
    slowQueries: PerformanceMetric[];
    errorsByType: Record<string, number>;
  } {
    const recentMetrics = this.getMetrics(timeWindowMs);
    
    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        avgQueryTime: 0,
        successRate: 100,
        errorRate: 0,
        slowQueries: [],
        errorsByType: {},
      };
    }

    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const successCount = recentMetrics.filter(m => m.success).length;
    const slowThreshold = 1000; // 1 second
    const slowQueries = recentMetrics.filter(m => m.duration > slowThreshold);

    const errorsByType: Record<string, number> = {};
    recentMetrics.forEach(m => {
      if (!m.success && m.error) {
        errorsByType[m.error] = (errorsByType[m.error] || 0) + 1;
      }
    });

    return {
      totalOperations: recentMetrics.length,
      avgQueryTime: totalDuration / recentMetrics.length,
      successRate: (successCount / recentMetrics.length) * 100,
      errorRate: ((recentMetrics.length - successCount) / recentMetrics.length) * 100,
      slowQueries,
      errorsByType,
    };
  }

  /**
   * Get current system health
   */
  getHealthStatus(): SystemHealth {
    return { ...this.healthStatus };
  }

  /**
   * Update health status based on current metrics
   */
  private updateHealthStatus(): void {
    const stats = this.getStatistics(300000); // Last 5 minutes

    this.healthStatus = {
      status: this.determineHealthStatus(stats),
      uptime: Date.now() - this.startTime,
      avgQueryTime: stats.avgQueryTime,
      errorRate: stats.errorRate,
      connectionPoolUtilization: this.calculatePoolUtilization(),
      lastChecked: Date.now(),
    };
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(stats: ReturnType<typeof this.getStatistics>): 'healthy' | 'degraded' | 'critical' {
    if (stats.errorRate > 10 || stats.avgQueryTime > 5000) {
      return 'critical';
    }
    if (stats.errorRate > 5 || stats.avgQueryTime > 2000) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Calculate connection pool utilization (placeholder)
   */
  private calculatePoolUtilization(): number {
    // In real implementation, this would track actual connection pool
    return Math.min(this.metrics.length / 10, 100);
  }

  /**
   * Add an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alerts.push(rule);
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alerts = this.alerts.filter(a => a.id !== ruleId);
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alerts];
  }

  /**
   * Check if any alert rules are triggered
   */
  private checkAlerts(metric: PerformanceMetric): void {
    const stats = this.getStatistics(300000); // Last 5 minutes

    for (const alert of this.alerts) {
      if (!alert.enabled) continue;

      let triggered = false;

      switch (alert.condition) {
        case 'query_time':
          triggered = metric.duration > alert.threshold;
          break;
        case 'error_rate':
          triggered = stats.errorRate > alert.threshold;
          break;
        case 'connection_failure':
          triggered = !metric.success;
          break;
      }

      if (triggered) {
        this.triggerAlert(alert, metric, stats);
      }
    }
  }

  /**
   * Trigger an alert notification
   */
  private triggerAlert(
    alert: AlertRule, 
    metric: PerformanceMetric, 
    stats: ReturnType<typeof this.getStatistics>
  ): void {
    const alertMessage = this.formatAlertMessage(alert, metric, stats);

    for (const channel of alert.notificationChannels) {
      switch (channel) {
        case 'console':
          console.warn(`[DATABASE ALERT] ${alertMessage}`);
          break;
        case 'email':
          // In production, integrate with email service
          console.log(`[EMAIL ALERT] ${alertMessage}`);
          break;
        case 'webhook':
          // In production, send to webhook endpoint
          console.log(`[WEBHOOK ALERT] ${alertMessage}`);
          break;
      }
    }
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(
    alert: AlertRule, 
    metric: PerformanceMetric, 
    stats: ReturnType<typeof this.getStatistics>
  ): string {
    switch (alert.condition) {
      case 'query_time':
        return `Slow query detected: ${metric.operation} on ${metric.collection} took ${metric.duration}ms (threshold: ${alert.threshold}ms)`;
      case 'error_rate':
        return `High error rate: ${stats.errorRate.toFixed(2)}% (threshold: ${alert.threshold}%)`;
      case 'connection_failure':
        return `Connection failure: ${metric.operation} on ${metric.collection} failed - ${metric.error}`;
      default:
        return `Alert triggered: ${alert.name}`;
    }
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'Timestamp,Operation,Collection,Duration,Success,Error\n';
      const rows = this.metrics.map(m => 
        `${m.timestamp},${m.operation},${m.collection},${m.duration},${m.success},${m.error || ''}`
      ).join('\n');
      return headers + rows;
    }
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear old metrics
   */
  clearMetrics(olderThanMs?: number): void {
    if (olderThanMs) {
      const cutoffTime = Date.now() - olderThanMs;
      this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    } else {
      this.metrics = [];
    }
  }
}

// Export singleton instance
export const monitoringService = new DatabaseMonitoringService();

// Default alert rules
monitoringService.addAlertRule({
  id: 'slow-queries',
  name: 'Slow Query Detection',
  condition: 'query_time',
  threshold: 3000, // 3 seconds
  enabled: true,
  notificationChannels: ['console'],
});

monitoringService.addAlertRule({
  id: 'high-error-rate',
  name: 'High Error Rate',
  condition: 'error_rate',
  threshold: 5, // 5%
  enabled: true,
  notificationChannels: ['console'],
});

monitoringService.addAlertRule({
  id: 'connection-failures',
  name: 'Connection Failures',
  condition: 'connection_failure',
  threshold: 0,
  enabled: true,
  notificationChannels: ['console'],
});
