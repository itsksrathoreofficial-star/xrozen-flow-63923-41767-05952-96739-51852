import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api/admin.api';
import { toast } from '@/hooks/use-toast';

export const useDatabase = () => {
  const queryClient = useQueryClient();

  const stats = useQuery({
    queryKey: ['database', 'stats'],
    queryFn: adminApi.getDatabaseStats,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const health = useQuery({
    queryKey: ['database', 'health'],
    queryFn: adminApi.getDatabaseHealth,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const optimize = useMutation({
    mutationFn: adminApi.optimizeDatabase,
    onSuccess: () => {
      toast({
        title: 'Database optimized',
        description: 'VACUUM and ANALYZE completed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['database'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Optimization failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    stats: stats.data,
    health: health.data,
    isLoadingStats: stats.isLoading,
    isLoadingHealth: health.isLoading,
    optimize: optimize.mutate,
    isOptimizing: optimize.isPending,
  };
};
