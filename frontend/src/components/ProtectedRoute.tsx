import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback = <div>Loading...</div> 
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to load, then check authentication
    if (!isLoading) {
      if (!isAuthenticated || !apiClient.isAuthenticated()) {
        console.log('🔧 ProtectedRoute: Not authenticated, redirecting to auth');
        navigate('/auth', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading while auth is being determined
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Show content only if authenticated
  if (isAuthenticated && apiClient.isAuthenticated()) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
};

// Higher-order component version
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => (
    <ProtectedRoute>
      <Component {...props} />
    </ProtectedRoute>
  );
};