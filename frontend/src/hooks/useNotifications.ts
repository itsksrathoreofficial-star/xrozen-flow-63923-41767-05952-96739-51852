import { useState, useEffect } from 'react';
import { websocketClient } from '@/lib/websocket-client';
import { Notification, notificationService } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadNotifications = async () => {
    // Only load notifications if authenticated
    if (!apiClient.isAuthenticated()) {
      console.log('🔧 useNotifications: Not authenticated, skipping notification load');
      setLoading(false);
      return;
    }
    
    try {
      const { data } = await notificationService.getNotifications(50, 0);
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    } catch (error) {
      console.error('🔧 useNotifications: Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUnreadCount = async () => {
    if (!apiClient.isAuthenticated()) return;
    
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('🔧 useNotifications: Failed to update unread count:', error);
    }
  };

  useEffect(() => {
    // Add a delay to ensure auth is initialized
    const timeoutId = setTimeout(() => {
      loadNotifications();

      // Connect WebSocket only if authenticated
      if (apiClient.isAuthenticated()) {
        console.log('🔧 useNotifications: Connecting WebSocket for notifications');
        websocketClient.connect();
      } else {
        console.log('🔧 useNotifications: Not authenticated, skipping WebSocket connection');
      }
    }, 200);

    // Listen for new notifications via WebSocket
    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast for important/critical notifications
      if (notification.priority !== 'info') {
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.priority === 'critical' ? 'destructive' : 'default',
        });
      }
    };

    const handleNotificationUpdate = (notification: Notification) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? notification : n))
      );
      updateUnreadCount();
    };

    const handleNotificationDelete = (data: { id: string }) => {
      setNotifications((prev) => prev.filter((n) => n.id !== data.id));
      updateUnreadCount();
    };

    websocketClient.on('notification:new', handleNewNotification);
    websocketClient.on('notification:update', handleNotificationUpdate);
    websocketClient.on('notification:delete', handleNotificationDelete);

    return () => {
      clearTimeout(timeoutId);
      websocketClient.off('notification:new', handleNewNotification);
      websocketClient.off('notification:update', handleNotificationUpdate);
      websocketClient.off('notification:delete', handleNotificationDelete);
    };
  }, [toast]);

  const markAsRead = async (notificationId: string) => {
    const success = await notificationService.markAsRead(notificationId);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const success = await notificationService.markAllAsRead();
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const success = await notificationService.delete(notificationId);
    if (success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      updateUnreadCount();
    }
  };

  const deleteAll = async () => {
    const success = await notificationService.deleteAll();
    if (success) {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
    refresh: loadNotifications,
  };
}