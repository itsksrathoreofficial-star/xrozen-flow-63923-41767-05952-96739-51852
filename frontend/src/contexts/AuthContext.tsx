import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  full_name: string;
  user_category: 'editor' | 'client' | 'agency';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ user: any; token: string }>;
  signup: (email: string, password: string, metadata?: any) => Promise<{ user: any; token: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAuthenticated = !!user && !!authToken && apiClient.isAuthenticated();

  const login = async (email: string, password: string) => {
    try {
      console.log('🔧 AuthContext: Starting login process');
      const result = await apiClient.login(email, password);
      
      console.log('🔧 AuthContext: Login successful, setting user and token');
      setUser(result.user);
      setAuthTokenState(result.token);
      
      // Ensure API client has the token
      apiClient.setAuthToken(result.token);
      
      return result;
    } catch (error) {
      console.error('🔧 AuthContext: Login failed:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, metadata?: any) => {
    try {
      console.log('🔧 AuthContext: Starting signup process');
      const result = await apiClient.signup(email, password, metadata);
      
      console.log('🔧 AuthContext: Signup successful, setting user and token');
      setUser(result.user);
      setAuthTokenState(result.token);
      
      // Ensure API client has the token
      apiClient.setAuthToken(result.token);
      
      return result;
    } catch (error) {
      console.error('🔧 AuthContext: Signup failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔧 AuthContext: Starting logout process');
      await apiClient.logout();
    } catch (error) {
      console.error('🔧 AuthContext: Logout API call failed:', error);
    } finally {
      console.log('🔧 AuthContext: Clearing local auth state');
      setUser(null);
      setAuthTokenState(null);
      apiClient.clearAuthToken();
    }
  };

  const refreshUser = async () => {
    if (isRefreshing) {
      console.log('🔧 AuthContext: Already refreshing user, skipping');
      return;
    }
    
    setIsRefreshing(true);
    
    try {
      console.log('🔧 AuthContext: Refreshing user data');
      
      if (apiClient.isAuthenticated()) {
        const userData = await apiClient.getCurrentUser();
        console.log('🔧 AuthContext: User data refreshed successfully');
        setUser(userData);
        setAuthTokenState(apiClient.getAuthToken());
      } else {
        console.log('🔧 AuthContext: No valid authentication, clearing user');
        setUser(null);
        setAuthTokenState(null);
      }
    } catch (error) {
      console.error('🔧 AuthContext: Failed to refresh user:', error);
      setUser(null);
      setAuthTokenState(null);
      
      // If it's an auth error, clear the token
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        apiClient.clearAuthToken();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      console.log('🔧 AuthContext: Initializing authentication');
      setIsLoading(true);
      
      try {
        // Wait a bit for API client to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if API client already has a valid token
        if (apiClient.isAuthenticated()) {
          console.log('🔧 AuthContext: API client already authenticated, verifying...');
          const storedToken = apiClient.getAuthToken();
          setAuthTokenState(storedToken);
          
          // Verify token is actually working
          const isValid = await apiClient.verifyToken();
          if (isValid && mounted) {
            console.log('🔧 AuthContext: Token verified, refreshing user data');
            await refreshUser();
          } else if (mounted) {
            console.log('🔧 AuthContext: Token verification failed, clearing auth');
            setUser(null);
            setAuthTokenState(null);
            apiClient.clearAuthToken();
          }
        } else {
          console.log('🔧 AuthContext: No valid authentication found');
          if (mounted) {
            setUser(null);
            setAuthTokenState(null);
          }
        }
      } catch (error) {
        console.error('🔧 AuthContext: Auth initialization failed:', error);
        if (mounted) {
          setUser(null);
          setAuthTokenState(null);
          apiClient.clearAuthToken();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth expiration events with debouncing
    let authExpiredTimeout: NodeJS.Timeout;
    const handleAuthExpired = () => {
      console.log('🔧 AuthContext: Auth expired event received');
      
      // Only clear auth if we're not already authenticated with a valid token
      if (!apiClient.isAuthenticated()) {
        // Debounce multiple auth expired events
        clearTimeout(authExpiredTimeout);
        authExpiredTimeout = setTimeout(() => {
          if (mounted) {
            console.log('🔧 AuthContext: Clearing auth state due to expiration');
            setUser(null);
            setAuthTokenState(null);
          }
        }, 100);
      } else {
        console.log('🔧 AuthContext: Auth expired event received but token is still valid, ignoring');
      }
    };

    // Register callback with API client for token expiration
    apiClient.onTokenExpired(handleAuthExpired);
    window.addEventListener('auth-expired', handleAuthExpired);

    return () => {
      mounted = false;
      clearTimeout(authExpiredTimeout);
      apiClient.removeTokenExpiredCallback(handleAuthExpired);
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
