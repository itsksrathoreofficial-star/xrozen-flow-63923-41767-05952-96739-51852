import { DatabaseStats } from '@/components/admin/database/DatabaseStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDatabase } from '@/hooks/admin/useDatabase';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ROUTES } from '@/lib/constants/admin-routes';
import { 
  Database, 
  FileText, 
  HardDrive, 
  Play, 
  RefreshCw, 
  Settings 
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { optimize, isOptimizing } = useDatabase();

  const quickActions = [
    {
      title: 'Run SQL Query',
      description: 'Execute custom SQL queries',
      icon: Play,
      onClick: () => navigate(ADMIN_ROUTES.QUERY_CONSOLE),
    },
    {
      title: 'View Tables',
      description: 'Browse all database tables',
      icon: Database,
      onClick: () => navigate(ADMIN_ROUTES.TABLE_EXPLORER),
    },
    {
      title: 'Create Backup',
      description: 'Backup database manually',
      icon: HardDrive,
      onClick: () => navigate(ADMIN_ROUTES.BACKUP_RESTORE),
    },
    {
      title: 'Manage Migrations',
      description: 'Apply or rollback migrations',
      icon: FileText,
      onClick: () => navigate(ADMIN_ROUTES.MIGRATION_MANAGER),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your database, tables, and system configuration
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(ADMIN_ROUTES.SETTINGS)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button
            onClick={() => optimize()}
            disabled={isOptimizing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isOptimizing ? 'animate-spin' : ''}`} />
            {isOptimizing ? 'Optimizing...' : 'Optimize Database'}
          </Button>
        </div>
      </div>

      <DatabaseStats />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.title}
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={action.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Database status and performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">WAL Mode</span>
              <span className="text-sm text-green-600">✓ Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cache Size</span>
              <span className="text-sm text-muted-foreground">64 MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Foreign Keys</span>
              <span className="text-sm text-green-600">✓ Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Auto Backup</span>
              <span className="text-sm text-green-600">✓ Active</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
