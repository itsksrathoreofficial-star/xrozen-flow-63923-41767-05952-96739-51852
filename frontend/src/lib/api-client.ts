/**
 * Universal API Client
 * Replaces all Supabase calls with REST API calls to Express backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;
  private authToken: string | null = null;
  private tokenExpiredCallbacks: Array<() => void> = [];
  private isClearing = false;
  private authState: 'checking' | 'authenticated' | 'unauthenticated' = 'checking';

    constructor() {
    this.baseURL = API_BASE_URL;
    this.initializeAuth();
  }

  private initializeAuth() {
    // First, try to get token from localStorage
    const storedToken = localStorage.getItem('auth_token');
    
    if (storedToken) {
      console.log('🔧 ApiClient: Found stored token, checking validity');
      
      // Check if token is expired
      if (this.isTokenExpired(storedToken)) {
        console.log('🔧 ApiClient: Stored token is expired, clearing it');
        localStorage.removeItem('auth_token');
        this.authToken = null;
        this.authState = 'unauthenticated';
      } else {
        console.log('🔧 ApiClient: Stored token is valid, setting it');
        this.authToken = storedToken;
        this.authState = 'authenticated';
      }
    } else {
      console.log('🔧 ApiClient: No stored token found');
      this.authState = 'unauthenticated';
    }
  }

  private clearAuth() {
    if (this.isClearing) {
      console.log('🔧 ApiClient: Already clearing auth, skipping');
      return;
    }
    
    this.isClearing = true;
    this.authToken = null;
    this.authState = 'unauthenticated';
    localStorage.removeItem('auth_token');
    
    // Debounce callbacks to prevent multiple simultaneous calls
    setTimeout(() => {
      this.tokenExpiredCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('🔧 ApiClient: Error in token expired callback:', error);
        }
      });
      this.isClearing = false;
    }, 100);
  }

  public onTokenExpired(callback: () => void) {
    this.tokenExpiredCallbacks.push(callback);
  }

  public removeTokenExpiredCallback(callback: () => void) {
    this.tokenExpiredCallbacks = this.tokenExpiredCallbacks.filter(cb => cb !== callback);
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Check if token is expired before making request
    if (this.authToken && this.isTokenExpired()) {
      console.log('🔧 ApiClient: Token expired during request, clearing');
      this.clearAuth();
    }

    // Add Authorization header if token exists and is valid
    if (this.authToken && !this.isTokenExpired()) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      console.log('🔧 ApiClient: Adding auth header for request to', endpoint);
    } else {
      console.log('🔧 ApiClient: No valid token for request to', endpoint);
    }

    // Merge custom headers
    if (options.headers) {
      const customHeaders = options.headers as Record<string, string>;
      Object.assign(headers, customHeaders);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Check if this is a general auth failure or endpoint-specific issue
        const isGeneralAuthFailure = endpoint === '/profiles/me' || endpoint.includes('/auth/');
        
        if (isGeneralAuthFailure && !this.isClearing && !endpoint.includes('/auth/')) {
          console.log('🔧 ApiClient: General auth failure, clearing auth');
          this.clearAuth();
          
          // Dispatch auth expired event only for general auth failures
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('auth-expired'));
          }, 50);
        } else if (!isGeneralAuthFailure) {
          console.log('🔧 ApiClient: Endpoint-specific auth failure for', endpoint, '- not clearing global auth');
        } else if (endpoint.includes('/auth/')) {
          console.log('🔧 ApiClient: 401 on auth endpoint, not clearing token');
        }
        
        throw new Error('Unauthorized - please login again');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Authentication Methods
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    console.log('🔧 ApiClient: Starting login request');
    
    const response = await this.request<ApiResponse<{ user: any; token: string }>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    console.log('🔧 ApiClient: Login response received:', { 
      success: response.success, 
      hasData: !!response.data, 
      hasToken: !!(response.data?.token) 
    });

    // Ensure we have the correct response structure
    if (response.success && response.data && response.data.token) {
      this.authToken = response.data.token;
      localStorage.setItem('auth_token', response.data.token);
      console.log('🔧 ApiClient: Login successful, token stored');
      return response.data;
    } else {
      console.error('🔧 ApiClient: Invalid login response structure:', response);
      throw new Error('Invalid response structure from server');
    }
  }

  async signup(email: string, password: string, metadata: any = {}): Promise<{ user: any; token: string }> {
    const response = await this.request<ApiResponse<{ user: any; token: string }>>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...metadata }),
    });

    // Ensure we have the correct response structure
    if (response.success && response.data && response.data.token) {
      this.authToken = response.data.token;
      localStorage.setItem('auth_token', response.data.token);
      return response.data;
    } else {
      throw new Error('Invalid response structure from server');
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.authToken = null;
      localStorage.removeItem('auth_token');
    }
  }

  async getCurrentUser(): Promise<any> {
    console.log('🔧 ApiClient: Getting current user, auth status:', this.isAuthenticated());
    const response = await this.request<ApiResponse<any>>('/profiles/me');
    console.log('🔧 ApiClient: Current user response:', { success: response.success, hasData: !!response.data });
    return response.data;
  }

  async resetPassword(email: string): Promise<void> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async updatePassword(newPassword: string): Promise<void> {
    return this.request('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  // Profile Operations
  async getProfile(userId?: string): Promise<any> {
    const endpoint = userId ? `/profiles/${userId}` : '/profiles/me';
    const response = await this.request<ApiResponse<any>>(endpoint);
    return response.data;
  }

  async updateProfile(data: any): Promise<any> {
    return this.request('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Project Operations
  async getProjects(filters?: any): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const endpoint = queryParams.toString() 
      ? `/projects?${queryParams.toString()}`
      : '/projects';
    
    const response = await this.request<ApiResponse<any[]>>(endpoint);
    return response.data || [];
  }

  async getProject(id: string): Promise<any> {
    const response = await this.request<ApiResponse<any>>(`/projects/${id}`);
    return response.data;
  }

  async createProject(data: any): Promise<any> {
    const response = await this.request<ApiResponse<any>>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateProject(id: string, data: any): Promise<any> {
    const response = await this.request<ApiResponse<any>>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Editor Operations
  async getEditors(): Promise<any[]> {
    const response = await this.request<ApiResponse<any[]>>('/editors');
    return response.data || [];
  }

  async getEditor(id: string): Promise<any> {
    const response = await this.request<ApiResponse<any>>(`/editors/${id}`);
    return response.data;
  }

  async createEditor(data: any): Promise<any> {
    const response = await this.request<ApiResponse<any>>('/editors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateEditor(id: string, data: any): Promise<any> {
    const response = await this.request<ApiResponse<any>>(`/editors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  // Client Operations
  async getClients(): Promise<any[]> {
    const response = await this.request<ApiResponse<any[]>>('/clients');
    return response.data || [];
  }

  async getClient(id: string): Promise<any> {
    const response = await this.request<ApiResponse<any>>(`/clients/${id}`);
    return response.data;
  }

  async createClient(data: any): Promise<any> {
    const response = await this.request<ApiResponse<any>>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateClient(id: string, data: any): Promise<any> {
    const response = await this.request<ApiResponse<any>>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  // Message Operations
  async getMessages(projectId?: string): Promise<any[]> {
    const endpoint = projectId ? `/messages?projectId=${projectId}` : '/messages';
    const response = await this.request<ApiResponse<any[]>>(endpoint);
    return response.data || [];
  }

  async createMessage(data: any): Promise<any> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    return this.request(`/messages/${messageId}/read`, {
      method: 'PUT',
    });
  }

  // Payment Operations
  async getPayments(filters?: any): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const endpoint = queryParams.toString() 
      ? `/payments?${queryParams.toString()}`
      : '/payments';
    
    const response = await this.request<ApiResponse<any[]>>(endpoint);
    return response.data || [];
  }

  async getPayment(id: string): Promise<any> {
    return this.request(`/payments/${id}`);
  }

  async createPayment(data: any): Promise<any> {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayment(id: string, data: any): Promise<any> {
    return this.request(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Video Version Operations
  async getVideoVersions(projectId: string): Promise<any[]> {
    return this.request(`/projects/${projectId}/versions`);
  }

  async createVideoVersion(projectId: string, data: any): Promise<any> {
    return this.request(`/projects/${projectId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVideoVersion(projectId: string, versionId: string, data: any): Promise<any> {
    return this.request(`/projects/${projectId}/versions/${versionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Notification Operations
  async getNotifications(): Promise<any[]> {
    const response = await this.request<ApiResponse<any[]>>('/notifications');
    return response.data || [];
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // Admin Operations
  async getUsers(): Promise<any[]> {
    return this.request('/admin/users');
  }

  async deleteUser(userId: string): Promise<void> {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getTables(): Promise<any[]> {
    return this.request('/admin/tables');
  }

  async getTableData(tableName: string): Promise<any[]> {
    return this.request(`/admin/tables/${tableName}`);
  }

  // Database Operations
  async getDatabaseStats(): Promise<any> {
    return this.request('/admin/database/stats');
  }

  async getDatabaseHealth(): Promise<any> {
    return this.request('/admin/database/health');
  }

  // Migration Operations
  async runMigrations(): Promise<any> {
    return this.request('/admin/migrations/run', {
      method: 'POST',
    });
  }

  async rollbackMigration(): Promise<any> {
    return this.request('/admin/migrations/rollback', {
      method: 'POST',
    });
  }

  // Backup Operations
  async createBackup(): Promise<any> {
    return this.request('/admin/backups/create', {
      method: 'POST',
    });
  }

  async restoreBackup(backupId: string): Promise<any> {
    return this.request(`/admin/backups/${backupId}/restore`, {
      method: 'POST',
    });
  }

  async getBackups(): Promise<any[]> {
    return this.request('/admin/backups');
  }

  // Performance Operations
  async getPerformanceMetrics(): Promise<any> {
    return this.request('/admin/performance/metrics');
  }

  async getSlowQueries(): Promise<any[]> {
    return this.request('/admin/performance/slow-queries');
  }

  // Query Operations
  async executeQuery(query: string): Promise<any> {
    return this.request('/admin/query/execute', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  async getQueryHistory(): Promise<any[]> {
    return this.request('/admin/query/history');
  }

  // AI Operations
  async sendAIMessage(message: string, conversationId?: string): Promise<any> {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    });
  }

  async chatWithAI(message: string, conversationId?: string): Promise<any> {
    return this.sendAIMessage(message, conversationId);
  }

  async getAIConversations(): Promise<any[]> {
    const response = await this.request<ApiResponse<any[]>>('/ai/conversations');
    return response.data || [];
  }

  // WebSocket Connection
  connectWebSocket(): void {
    // WebSocket connection is handled by the WebSocketClient
    // This method is here for compatibility
  }

  // Utility Methods
  async verifyToken(): Promise<boolean> {
    try {
      if (!this.authToken || this.isTokenExpired()) {
        return false;
      }
      
      // Test the token with a simple API call
      await this.getCurrentUser();
      return true;
    } catch (error) {
      console.log('🔧 ApiClient: Token verification failed');
      return false;
    }
  }

  isAuthenticated(): boolean {
    return this.authState === 'authenticated' && !!this.authToken && !this.isTokenExpired();
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  setAuthToken(token: string): void {
    this.isClearing = false; // Reset clearing flag
    this.authToken = token;
    this.authState = 'authenticated';
    localStorage.setItem('auth_token', token);
    console.log('🔧 ApiClient: Auth token set and state updated to authenticated');
  }

  clearAuthToken(): void {
    this.clearAuth();
    console.log('🔧 ApiClient: Auth token cleared manually');
  }

  getAuthState(): 'checking' | 'authenticated' | 'unauthenticated' {
    return this.authState;
  }

  isTokenExpired(token?: string): boolean {
    const tokenToCheck = token || this.authToken;
    if (!tokenToCheck) return true;
    
    try {
      const payload = JSON.parse(atob(tokenToCheck.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const isExpired = payload.exp < currentTime;
      
      if (isExpired) {
        console.log('🔧 ApiClient: Token is expired');
      }
      
      return isExpired;
    } catch (error) {
      console.log('🔧 ApiClient: Error parsing token, considering it expired');
      return true;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      console.log('🔧 ApiClient: Attempting to refresh token');
      
      // For now, we'll just re-validate the current token
      // In a full implementation, you'd call a refresh endpoint
      if (this.authToken && !this.isTokenExpired()) {
        console.log('🔧 ApiClient: Token is still valid, no refresh needed');
        return true;
      }
      
      // Token is expired or missing
      console.log('🔧 ApiClient: Token is expired or missing, user needs to login again');
      this.clearAuth();
      return false;
    } catch (error) {
      console.error('🔧 ApiClient: Token refresh failed:', error);
      this.clearAuth();
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export { ApiClient };