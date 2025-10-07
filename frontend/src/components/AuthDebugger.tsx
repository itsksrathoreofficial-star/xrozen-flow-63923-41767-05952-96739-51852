import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const AuthDebugger: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  const testAuthFlow = async () => {
    console.log('🔧 AuthDebugger: Testing auth flow');
    console.log('🔧 AuthDebugger: Current user:', user);
    console.log('🔧 AuthDebugger: Is authenticated:', isAuthenticated);
    console.log('🔧 AuthDebugger: API client auth token:', apiClient.getAuthToken());
    console.log('🔧 AuthDebugger: API client is authenticated:', apiClient.isAuthenticated());
    console.log('🔧 AuthDebugger: LocalStorage token:', localStorage.getItem('auth_token'));

    if (apiClient.isAuthenticated()) {
      try {
        const userData = await apiClient.getCurrentUser();
        console.log('🔧 AuthDebugger: API call successful:', userData);
      } catch (error) {
        console.error('🔧 AuthDebugger: API call failed:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Auth Debugger</CardTitle>
          <CardDescription>Loading authentication state...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Auth Debugger</CardTitle>
        <CardDescription>Current authentication state</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <div><strong>User:</strong> {user ? `${user.email} (${user.id})` : 'None'}</div>
          <div><strong>Is Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</div>
          <div><strong>Is Loading:</strong> {isLoading ? '⏳ Yes' : '✅ No'}</div>
          <div><strong>API Client Token:</strong> {apiClient.getAuthToken() ? '✅ Present' : '❌ Missing'}</div>
          <div><strong>Token Valid:</strong> {apiClient.isAuthenticated() ? '✅ Yes' : '❌ No'}</div>
          <div><strong>LocalStorage Token:</strong> {localStorage.getItem('auth_token') ? '✅ Present' : '❌ Missing'}</div>
        </div>
        
        <Button onClick={testAuthFlow} className="w-full">
          Test Auth Flow (Check Console)
        </Button>
      </CardContent>
    </Card>
  );
};