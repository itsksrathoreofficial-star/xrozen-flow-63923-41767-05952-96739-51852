import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTables } from '@/hooks/admin/useTables';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  Edit, 
  Download 
} from 'lucide-react';
import { getTableDataRoute } from '@/lib/constants/admin-routes';

export default function TableExplorer() {
  const navigate = useNavigate();
  const { tables, isLoading } = useTables();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Table Explorer</h1>
          <p className="text-muted-foreground">Browse and manage database tables</p>
        </div>
        <Button onClick={() => navigate('/admin/schema')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Table
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          {filteredTables.length} {filteredTables.length === 1 ? 'table' : 'tables'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTables.map((table) => (
          <Card key={table.name} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{table.name}</CardTitle>
                </div>
              </div>
              <CardDescription>
                {table.rowCount.toLocaleString()} rows · {formatSize(table.diskSize)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Primary Key:</span>
                  <Badge variant="secondary">{table.primaryKey.join(', ') || 'None'}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Indexes:</span>
                  <span className="font-medium">{table.indexCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Foreign Keys:</span>
                  <span className="font-medium">{table.foreignKeys.length}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(getTableDataRoute(table.name))}
                  >
                    <Eye className="mr-2 h-3 w-3" />
                    View Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/schema?table=${table.name}`)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Table className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No tables found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? `No tables match "${searchQuery}"`
                : 'Create your first table to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/admin/schema')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Table
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
