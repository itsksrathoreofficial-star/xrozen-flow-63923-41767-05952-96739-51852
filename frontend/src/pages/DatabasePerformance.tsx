/**
 * Database Performance Dashboard
 * Phase 4: Real-time monitoring and analytics
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Download,
  RefreshCw,
  Zap,
  Database
} from "lucide-react";
import { monitoringService, type SystemHealth } from "@/lib/database/monitoring";
import { db } from "@/lib/database/index";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DatabasePerformance() {
  const [health, setHealth] = useState<SystemHealth>(monitoringService.getHealthStatus());
  const [statistics, setStatistics] = useState(monitoringService.getStatistics());
  const [metricsHistory, setMetricsHistory] = useState<{
    labels: string[];
    queryTimes: number[];
    errorRates: number[];
  }>({ labels: [], queryTimes: [], errorRates: [] });

  useEffect(() => {
    const interval = setInterval(() => {
      const newHealth = monitoringService.getHealthStatus();
      const newStats = monitoringService.getStatistics();
      
      setHealth(newHealth);
      setStatistics(newStats);

      // Update metrics history for charts
      const metrics = monitoringService.getMetrics(3600000); // Last hour
      const grouped: Record<string, { totalDuration: number; count: number; errors: number }> = {};
      
      metrics.forEach(m => {
        const minute = new Date(m.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        if (!grouped[minute]) {
          grouped[minute] = { totalDuration: 0, count: 0, errors: 0 };
        }
        grouped[minute].totalDuration += m.duration;
        grouped[minute].count += 1;
        if (!m.success) grouped[minute].errors += 1;
      });

      const labels = Object.keys(grouped).slice(-30); // Last 30 data points
      const queryTimes = labels.map(l => grouped[l].totalDuration / grouped[l].count);
      const errorRates = labels.map(l => (grouped[l].errors / grouped[l].count) * 100);

      setMetricsHistory({ labels, queryTimes, errorRates });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getHealthBadge = (status: SystemHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>;
      case 'degraded':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Degraded</Badge>;
      case 'critical':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Critical</Badge>;
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const handleExportMetrics = () => {
    const csv = monitoringService.exportMetrics('csv');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database-metrics-${Date.now()}.csv`;
    a.click();
  };

  const queryTimeChartData = {
    labels: metricsHistory.labels,
    datasets: [
      {
        label: 'Avg Query Time (ms)',
        data: metricsHistory.queryTimes,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const errorRateChartData = {
    labels: metricsHistory.labels,
    datasets: [
      {
        label: 'Error Rate (%)',
        data: metricsHistory.errorRates,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Database Performance</h1>
          <p className="text-muted-foreground">Real-time monitoring and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportMetrics}>
            <Download className="h-4 w-4 mr-2" />
            Export Metrics
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{getHealthBadge(health.status)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Provider: {db.getCurrentProvider()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(health.uptime)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Since last restart
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Query Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(health.avgQueryTime)}ms</div>
            <Progress value={Math.min((health.avgQueryTime / 1000) * 100, 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.errorRate.toFixed(2)}%</div>
            <Progress 
              value={health.errorRate} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queries">Query Performance</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="operations">Recent Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Query Performance Trend</CardTitle>
                <CardDescription>Average query execution time over last hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: '300px' }}>
                  <Line data={queryTimeChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate Trend</CardTitle>
                <CardDescription>Error percentage over last hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: '300px' }}>
                  <Line data={errorRateChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Statistics Summary</CardTitle>
              <CardDescription>Last 60 minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Operations</p>
                  <p className="text-2xl font-bold">{statistics.totalOperations}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{statistics.successRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Slow Queries</p>
                  <p className="text-2xl font-bold">{statistics.slowQueries.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Error Types</p>
                  <p className="text-2xl font-bold">{Object.keys(statistics.errorsByType).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle>Slow Query Analysis</CardTitle>
              <CardDescription>Queries taking longer than 1 second</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {statistics.slowQueries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No slow queries detected
                  </p>
                ) : (
                  <div className="space-y-2">
                    {statistics.slowQueries.map((query, idx) => (
                      <div key={idx} className="border rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{query.operation} → {query.collection}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(query.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="destructive">{query.duration}ms</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Distribution</CardTitle>
              <CardDescription>Errors grouped by type</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {Object.keys(statistics.errorsByType).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No errors detected
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(statistics.errorsByType).map(([error, count]) => (
                      <div key={error} className="border rounded p-3">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{error}</p>
                          <Badge>{count} occurrences</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <Card>
            <CardHeader>
              <CardTitle>Recent Operations</CardTitle>
              <CardDescription>Last 50 database operations</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {monitoringService.getMetrics(3600000).slice(-50).reverse().map((metric, idx) => (
                    <div key={idx} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{metric.operation} → {metric.collection}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(metric.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge variant={metric.success ? "default" : "destructive"}>
                            {metric.duration}ms
                          </Badge>
                          {metric.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      {metric.error && (
                        <p className="text-sm text-destructive mt-2">{metric.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
