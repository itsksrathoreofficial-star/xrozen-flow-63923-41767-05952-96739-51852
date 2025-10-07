/**
 * Universal Database Types
 * Type definitions for database abstraction layer
 */

export type DatabaseProvider = 'supabase' | 'firebase' | 'mysql' | 'postgresql' | 'mongodb' | 'sqlite';

export type QueryOperation = 'select' | 'insert' | 'update' | 'delete' | 'count';

// ==================== Query Builder Types ====================

export interface WhereClause {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not in' | 'like' | 'ilike' | 'is null' | 'is not null';
  value?: any;
}

export interface OrderClause {
  field: string;
  direction: 'asc' | 'desc';
}

export interface JoinClause {
  collection: string;
  on: { left: string; right: string }[];
  type: 'inner' | 'left' | 'right' | 'full';
}

export interface AggregateClause {
  function: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field: string;
  alias: string;
}

export interface UniversalQuery {
  collection: string;
  operation: QueryOperation;
  
  // Filtering
  where?: WhereClause[];
  or?: WhereClause[][];
  
  // Selection
  select?: string[] | '*';
  
  // Joins
  join?: JoinClause[];
  
  // Ordering
  orderBy?: OrderClause[];
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Data (for insert/update)
  data?: Record<string, any> | Record<string, any>[];
  
  // Aggregation
  aggregate?: AggregateClause[];
}

// ==================== Authentication Types ====================

export interface User {
  id: string;
  email: string;
  email_verified?: boolean;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: User;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error?: Error;
}

export interface SignUpData {
  email: string;
  password: string;
  options?: {
    data?: Record<string, any>;
    emailRedirectTo?: string;
  };
}

export interface ListUsersOptions {
  page?: number;
  perPage?: number;
}

export type AuthChangeCallback = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: Session | null) => void;

export interface Subscription {
  unsubscribe: () => void;
}

// ==================== Permission Types ====================

export interface PermissionRule {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | '*';
  check: (user: User | null, query?: UniversalQuery, data?: any) => Promise<boolean> | boolean;
  modifyQuery?: (user: User, query: UniversalQuery) => UniversalQuery;
}

// ==================== Event Types ====================

export interface DatabaseEvent {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  timing: 'before' | 'after';
  data: any;
  oldData?: any;
  user?: User;
}

export type EventHandler = (event: DatabaseEvent) => Promise<void> | void;

// ==================== Adapter Interface ====================

export interface DatabaseAdapter {
  // Core operations
  query<T = any>(query: UniversalQuery, user?: User | null): Promise<T>;
  
  // Connection management
  testConnection(): Promise<boolean>;
  disconnect(): Promise<void>;
  
  // Migration operations
  backup(): Promise<any>;
  restore(data: any): Promise<void>;
  
  // Provider info
  getProviderName(): DatabaseProvider;
}

// ==================== Database Config ====================

export interface DatabaseConfig {
  provider: DatabaseProvider;
  credentials: any;
  isActive: boolean;
}

// ==================== Migration Types ====================

export interface MigrationData {
  schema: any;
  data: Record<string, any[]>;
  metadata: {
    version: string;
    timestamp: string;
    recordCount: number;
  };
}

export interface MigrationProgress {
  stage: 'preparing' | 'schema' | 'data' | 'verification' | 'complete' | 'failed';
  currentTable?: string;
  recordsTransferred: number;
  totalRecords: number;
  percentage: number;
  errors: string[];
}

// ==================== Repository Types ====================

export interface Repository<T> {
  getAll(filters?: any): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// ==================== Universal Auth Interface ====================

export interface UniversalAuth {
  // User management
  signUp(data: SignUpData): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  
  // Session management
  currentUser(): Promise<User | null>;
  currentSession(): Promise<Session | null>;
  refreshSession(): Promise<Session | null>;
  
  // State management
  onAuthChange(callback: AuthChangeCallback): Subscription;
  
  // Password management
  resetPassword(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  
  // Admin operations
  admin: {
    listUsers(options?: ListUsersOptions): Promise<User[]>;
    deleteUser(userId: string): Promise<void>;
    updateUser(userId: string, data: Partial<User>): Promise<User>;
  };
}
