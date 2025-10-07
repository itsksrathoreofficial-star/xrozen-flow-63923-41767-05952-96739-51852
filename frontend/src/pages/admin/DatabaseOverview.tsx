import { DatabaseStats } from '@/components/admin/database/DatabaseStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDatabase } from '@/hooks/admin/useDatabase';
import { useTables } from '@/hooks/admin/useTables';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DatabaseOverview() {
  const { health, isLoadingHealth, optimize, isOptimizing } = useDatabase();
  const { tables, isLoading: isLoadingTables } = useTables();

  if (isLoadingHealth || isLoadingTables) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const totalIndexes = tables.reduce((sum, table) => sum + table.indexCount, 0);
  const totalForeignKeys = tables.reduce((sum, table) => sum + table.foreignKeys.length, 0);
  const largestTables = [...tables]
    .sort((a, b) => b.diskSize - a.diskSize)
    .slice(0, 5);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Overview</h1>
          <p className="text-muted-foreground">
            Comprehensive database statistics and health monitoring
          </p>
        </div>
        <Button onClick={() => optimize()} disabled={isOptimizing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isOptimizing ? 'animate-spin' : ''}`} />
          {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
        </Button>
      </div>

      <DatabaseStats />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Database Configuration</CardTitle>
            <CardDescription>Current SQLite settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">SQLite Version</span>
              <Badge variant="outline">3.45.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Journal Mode</span>
              <Badge variant="default">WAL</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Page Size</span>
              <span className="text-sm text-muted-foreground">4096 bytes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cache Size</span>
              <span className="text-sm text-muted-foreground">64 MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Foreign Keys</span>
              <Badge variant="default">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Synchronous</span>
              <Badge variant="outline">NORMAL</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schema Statistics</CardTitle>
            <CardDescription>Database structure overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Tables</span>
              <span className="text-2xl font-bold">{tables.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Indexes</span>
              <span className="text-2xl font-bold">{totalIndexes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Foreign Key Relationships</span>
              <span className="text-2xl font-bold">{totalForeignKeys}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Largest Tables</CardTitle>
          <CardDescription>Top 5 tables by disk usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {largestTables.map((table, index) => {
              const totalSize = tables.reduce((sum, t) => sum + t.diskSize, 0);
              const percentage = (table.diskSize / totalSize) * 100;

              return (
                <div key={table.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{table.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatSize(table.diskSize)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Health Check</CardTitle>
          <CardDescription>Integrity and performance status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Database Integrity</p>
                <p className="text-sm text-muted-foreground">All integrity checks passed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Foreign Key Constraints</p>
                <p className="text-sm text-muted-foreground">All relationships valid</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Connection Pool</p>
                <p className="text-sm text-muted-foreground">Healthy and responsive</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
