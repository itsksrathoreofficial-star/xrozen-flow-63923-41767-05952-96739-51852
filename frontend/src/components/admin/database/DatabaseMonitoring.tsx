import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Database, Clock, AlertTriangle } from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DatabaseMonitoringProps {
  currentProvider: string;
}

export function DatabaseMonitoring({ currentProvider }: DatabaseMonitoringProps) {
  const [performanceData, setPerformanceData] = useState({
    queryTime: [] as number[],
    connectionPool: [] as number[],
    errorRate: [] as number[],
    timestamps: [] as string[],
  });

  const [recentQueries, setRecentQueries] = useState([
    { query: "SELECT * FROM projects WHERE creator_id = ?", time: "45ms", status: "success", timestamp: "10:23:45" },
    { query: "INSERT INTO messages (sender_id, content) VALUES (?, ?)", time: "23ms", status: "success", timestamp: "10:23:40" },
    { query: "UPDATE profiles SET full_name = ? WHERE id = ?", time: "67ms", status: "success", timestamp: "10:23:35" },
    { query: "SELECT COUNT(*) FROM payments WHERE status = ?", time: "156ms", status: "slow", timestamp: "10:23:30" },
    { query: "DELETE FROM video_versions WHERE project_id = ?", time: "34ms", status: "success", timestamp: "10:23:25" },
  ]);

  useEffect(() => {
    // Simulate real-time data
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString();
      setPerformanceData(prev => ({
        queryTime: [...prev.queryTime.slice(-9), Math.random() * 100 + 20],
        connectionPool: [...prev.connectionPool.slice(-9), Math.random() * 50 + 10],
        errorRate: [...prev.errorRate.slice(-9), Math.random() * 5],
        timestamps: [...prev.timestamps.slice(-9), now],
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const queryTimeChart = {
    labels: performanceData.timestamps,
    datasets: [
      {
        label: "Query Time (ms)",
        data: performanceData.queryTime,
        borderColor: "rgb(99, 102, 241)",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const connectionPoolChart = {
    labels: performanceData.timestamps,
    datasets: [
      {
        label: "Active Connections",
        data: performanceData.connectionPool,
        backgroundColor: "rgba(34, 197, 94, 0.6)",
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
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Avg Query Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {performanceData.queryTime.length > 0 
                ? `${Math.round(performanceData.queryTime[performanceData.queryTime.length - 1])}ms`
                : "0ms"
              }
            </div>
            <Badge variant="outline" className="mt-2">
              Last 5 minutes
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Connection Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {performanceData.connectionPool.length > 0
                ? Math.round(performanceData.connectionPool[performanceData.connectionPool.length - 1])
                : 0
              } / 50
            </div>
            <Badge variant="outline" className="mt-2">
              Active connections
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {performanceData.errorRate.length > 0
                ? `${performanceData.errorRate[performanceData.errorRate.length - 1].toFixed(2)}%`
                : "0%"
              }
            </div>
            <Badge variant="outline" className="mt-2">
              Last hour
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <Tabs defaultValue="queries" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="queries">Query Performance</TabsTrigger>
          <TabsTrigger value="connections">Connection Pool</TabsTrigger>
        </TabsList>

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle>Query Execution Time</CardTitle>
              <CardDescription>Average query execution time over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Line data={queryTimeChart} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <CardTitle>Connection Pool Usage</CardTitle>
              <CardDescription>Active database connections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Bar data={connectionPoolChart} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Queries</CardTitle>
          <CardDescription>Latest database operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentQueries.map((query, index) => (
              <div 
                key={index}
                className="p-3 border rounded-lg flex items-center justify-between hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <code className="text-sm bg-black/5 px-2 py-1 rounded">
                    {query.query}
                  </code>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={query.status === "success" ? "default" : "secondary"}>
                    {query.time}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {query.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
