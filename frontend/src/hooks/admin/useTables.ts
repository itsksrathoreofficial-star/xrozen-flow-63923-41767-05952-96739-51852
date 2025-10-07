import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api/admin.api';
import { toast } from '@/hooks/use-toast';

export const useTables = () => {
  const queryClient = useQueryClient();

  const tables = useQuery({
    queryKey: ['tables'],
    queryFn: adminApi.getTables,
  });

  const dropTable = useMutation({
    mutationFn: adminApi.dropTable,
    onSuccess: (_, tableName) => {
      toast({
        title: 'Table dropped',
        description: `Table "${tableName}" has been deleted`,
      });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to drop table',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createTable = useMutation({
    mutationFn: adminApi.createTable,
    onSuccess: () => {
      toast({
        title: 'Table created',
        description: 'New table has been created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create table',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    tables: tables.data || [],
    isLoading: tables.isLoading,
    dropTable: dropTable.mutate,
    createTable: createTable.mutate,
    isDroppingTable: dropTable.isPending,
    isCreatingTable: createTable.isPending,
  };
};

export const useTableSchema = (tableName: string) => {
  return useQuery({
    queryKey: ['table', tableName, 'schema'],
    queryFn: () => adminApi.getTableSchema(tableName),
    enabled: !!tableName,
  });
};

export const useTableData = (tableName: string, page = 1, pageSize = 50) => {
  return useQuery({
    queryKey: ['table', tableName, 'data', page, pageSize],
    queryFn: () => adminApi.getTableData(tableName, page, pageSize),
    enabled: !!tableName,
  });
};
