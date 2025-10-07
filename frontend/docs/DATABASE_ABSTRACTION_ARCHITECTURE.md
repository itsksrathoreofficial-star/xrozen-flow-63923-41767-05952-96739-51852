# Universal Database Abstraction Layer - Architecture Design

## Overview

This document defines the complete architecture for the Universal Database Abstraction Layer that enables Xrozen Workflow to seamlessly switch between any supported database provider without code changes.

---

## Design Philosophy

### Core Principles

1. **Single Source of Truth**: One file controls all database access
2. **Zero Direct Imports**: No component ever imports database client directly
3. **Provider Agnostic**: Same API works with any database
4. **Type Safe**: Full TypeScript support with compile-time checking
5. **Security First**: Built-in permission checks replacing RLS
6. **Event Driven**: Application events replace database triggers
7. **Migration Ready**: Live migration with zero downtime

---

## Architecture Layers

### Layer 1: Application Layer (No Changes Required)

```typescript
// React components use simple, consistent API
import { db, auth } from "@/lib/database";

// All operations look the same regardless of database
const projects = await db.projects.getAll();
const user = await auth.currentUser();
```

**Key Benefits:**
- Components never know which database is active
- Same code works with Supabase, Firebase, MySQL, etc.
- Easy to test with mock database

### Layer 2: Universal Database Interface

**File**: `src/lib/database/index.ts` (Enhanced from current `database-config.ts`)

**Responsibilities:**
- Single export point for all database operations
- Route operations to active adapter
- Apply security middleware
- Emit events for triggers
- Handle errors uniformly
- Manage transactions

**API Structure:**
```typescript
export const db = {
  // Table-specific helpers
  projects: ProjectsRepository,
  profiles: ProfilesRepository,
  messages: MessagesRepository,
  payments: PaymentsRepository,
  // ... other tables
  
  // Generic operations
  query: <T>(query: UniversalQuery) => Promise<T>,
  transaction: <T>(fn: TransactionCallback) => Promise<T>,
  
  // Event system
  on: (event: string, handler: Function) => void,
  emit: (event: string, data: any) => Promise<void>,
  
  // Migration helpers
  backup: () => Promise<BackupData>,
  restore: (data: BackupData) => Promise<void>
};

export const auth = {
  signUp: (email, password, metadata) => Promise<User>,
  signIn: (email, password) => Promise<Session>,
  signOut: () => Promise<void>,
  currentUser: () => Promise<User | null>,
  currentSession: () => Promise<Session | null>,
  onAuthChange: (callback) => Subscription
};
```

### Layer 3: Provider Adapters

**File Structure:**
```
src/lib/database/
├── index.ts                 # Main export (Universal Interface)
├── types.ts                 # TypeScript interfaces
├── security.ts              # Permission middleware
├── events.ts                # Event system
├── adapters/
│   ├── base.ts              # Abstract BaseAdapter
│   ├── supabase.ts          # SupabaseAdapter
│   ├── firebase.ts          # FirebaseAdapter
│   ├── mysql.ts             # MySQLAdapter
│   ├── postgresql.ts        # PostgreSQLAdapter
│   ├── mongodb.ts           # MongoDBAdapter
│   └── sqlite.ts            # SQLiteAdapter
└── repositories/
    ├── projects.ts          # ProjectsRepository
    ├── profiles.ts          # ProfilesRepository
    ├── messages.ts          # MessagesRepository
    └── ...                  # Other table repositories
```

---

## Universal Query Language

### Query Builder Interface

```typescript
interface UniversalQuery {
  collection: string;              // Table/collection name
  operation: 'select' | 'insert' | 'update' | 'delete' | 'count';
  
  // Filtering
  where?: WhereClause[];           // [{ field, operator, value }]
  or?: WhereClause[][];            // OR conditions
  
  // Selection
  select?: string[] | '*';         // Fields to return
  
  // Joins
  join?: JoinClause[];             // Related tables
  
  // Ordering
  orderBy?: OrderClause[];         // [{ field, direction }]
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Data (for insert/update)
  data?: Record<string, any> | Record<string, any>[];
  
  // Aggregation
  aggregate?: AggregateClause[];   // [{ function, field, alias }]
}
```

### Example Usage

```typescript
// Simple select
const projects = await db.query({
  collection: 'projects',
  operation: 'select',
  where: [{ field: 'status', operator: '=', value: 'active' }],
  orderBy: [{ field: 'created_at', direction: 'desc' }],
  limit: 10
});

// Join query
const projectsWithClients = await db.query({
  collection: 'projects',
  operation: 'select',
  join: [
    {
      collection: 'profiles',
      on: [{ left: 'projects.client_id', right: 'profiles.id' }],
      type: 'left'
    }
  ],
  select: ['projects.*', 'profiles.full_name as client_name']
});

// Aggregation
const stats = await db.query({
  collection: 'projects',
  operation: 'select',
  aggregate: [
    { function: 'count', field: '*', alias: 'total_projects' },
    { function: 'sum', field: 'fee', alias: 'total_revenue' }
  ],
  where: [{ field: 'status', operator: '=', value: 'completed' }]
});
```

---

## Authentication Abstraction

### Universal Auth Interface

```typescript
interface UniversalAuth {
  // User management
  signUp(data: SignUpData): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  
  // Session management
  currentUser(): Promise<User | null>;
  currentSession(): Promise<Session | null>;
  refreshSession(): Promise<Session>;
  
  // State management
  onAuthChange(callback: AuthChangeCallback): Subscription;
  
  // Password management
  resetPassword(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  
  // Admin operations (adapter-specific)
  admin: {
    listUsers(options?: ListUsersOptions): Promise<User[]>;
    deleteUser(userId: string): Promise<void>;
    updateUser(userId: string, data: UserData): Promise<User>;
  };
}
```

### Provider Auth Mapping

| Feature | Supabase | Firebase | Custom (MySQL/PostgreSQL/MongoDB/SQLite) |
|---------|----------|----------|-------------------------------------------|
| **Sign Up** | `supabase.auth.signUp()` | `firebase.auth().createUser()` | JWT + bcrypt password hash |
| **Sign In** | `supabase.auth.signInWithPassword()` | `firebase.auth().signInWithEmail()` | JWT token generation |
| **Session** | JWT in localStorage | Firebase ID token | Custom JWT storage |
| **Logout** | `supabase.auth.signOut()` | `firebase.auth().signOut()` | Clear JWT token |
| **User Info** | `supabase.auth.getUser()` | `firebase.auth().currentUser` | Decode JWT + DB lookup |

---

## Security Middleware (Replacing RLS)

### Permission System

```typescript
interface PermissionRule {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  check: (user: User, data?: any) => Promise<boolean>;
}

// Example rules (replaces Supabase RLS)
const rules: PermissionRule[] = [
  // Projects: Users can only access their own projects
  {
    table: 'projects',
    operation: 'select',
    check: async (user, query) => {
      // Add creator_id filter to query
      query.where = query.where || [];
      query.where.push({ field: 'creator_id', operator: '=', value: user.id });
      return true;
    }
  },
  
  // Profiles: Users can update only their own profile
  {
    table: 'profiles',
    operation: 'update',
    check: async (user, data) => {
      return data.id === user.id;
    }
  },
  
  // Messages: Users can only see messages they're part of
  {
    table: 'messages',
    operation: 'select',
    check: async (user, query) => {
      query.or = [
        [{ field: 'sender_id', operator: '=', value: user.id }],
        [{ field: 'recipient_id', operator: '=', value: user.id }]
      ];
      return true;
    }
  },
  
  // Admin-only access
  {
    table: 'user_roles',
    operation: 'insert',
    check: async (user) => {
      const roles = await getUserRoles(user.id);
      return roles.includes('admin');
    }
  }
];
```

### Middleware Execution Flow

```
User Request
    ↓
auth.currentUser() → Get user context
    ↓
db.query(query) → Intercept operation
    ↓
Security Middleware → Find matching rule
    ↓
Permission Check → Apply rule.check()
    ↓
    ├─ Allowed → Modify query (add filters)
    │               ↓
    │           Execute on Database
    │               ↓
    │           Return Results
    │
    └─ Denied → Throw PermissionError
                    ↓
                Return Error to User
```

---

## Event System (Replacing Triggers)

### Event Emitter Architecture

```typescript
interface DatabaseEvent {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  before?: boolean;  // Before or after operation
  handler: (data: EventData) => Promise<void>;
}

// Event registration (replaces database triggers)
db.on('profiles.insert.after', async (event) => {
  const { data } = event;
  
  // Create default user role
  await db.query({
    collection: 'user_roles',
    operation: 'insert',
    data: {
      user_id: data.id,
      role: data.user_category
    }
  });
  
  // Send welcome email
  await sendEmail({
    to: data.email,
    template: 'welcome',
    data: { name: data.full_name }
  });
});

// Replaces update_updated_at_column trigger
db.on('*.update.before', async (event) => {
  event.data.updated_at = new Date().toISOString();
});

// Replaces sync_user_role trigger
db.on('profiles.update.after', async (event) => {
  const { data, oldData } = event;
  
  if (data.user_category !== oldData.user_category) {
    // Delete old role
    await db.query({
      collection: 'user_roles',
      operation: 'delete',
      where: [{ field: 'user_id', operator: '=', value: data.id }]
    });
    
    // Insert new role
    await db.query({
      collection: 'user_roles',
      operation: 'insert',
      data: { user_id: data.id, role: data.user_category }
    });
  }
});
```

### Event Priority

1. **Before Events** - Modify data before database write
2. **Validation Events** - Check constraints and business rules
3. **Database Operation** - Execute the actual write
4. **After Events** - Trigger side effects (emails, notifications)
5. **Async Events** - Background jobs (queue-based)

---

## Repository Pattern

### Table-Specific Repositories

```typescript
// src/lib/database/repositories/projects.ts
export class ProjectsRepository {
  constructor(private db: DatabaseManager) {}
  
  async getAll(filters?: ProjectFilters): Promise<Project[]> {
    const query: UniversalQuery = {
      collection: 'projects',
      operation: 'select',
      where: this.buildFilters(filters),
      orderBy: [{ field: 'created_at', direction: 'desc' }]
    };
    
    return this.db.query<Project[]>(query);
  }
  
  async getById(id: string): Promise<Project | null> {
    const results = await this.db.query<Project[]>({
      collection: 'projects',
      operation: 'select',
      where: [{ field: 'id', operator: '=', value: id }],
      limit: 1
    });
    
    return results[0] || null;
  }
  
  async create(data: CreateProjectData): Promise<Project> {
    const user = await this.db.auth.currentUser();
    
    const result = await this.db.query<Project>({
      collection: 'projects',
      operation: 'insert',
      data: {
        ...data,
        creator_id: user.id,
        created_at: new Date().toISOString()
      }
    });
    
    // Emit event for triggers
    await this.db.emit('projects.insert.after', { data: result });
    
    return result;
  }
  
  async update(id: string, data: UpdateProjectData): Promise<Project> {
    const oldData = await this.getById(id);
    
    // Emit before event
    await this.db.emit('projects.update.before', { data, oldData });
    
    const result = await this.db.query<Project>({
      collection: 'projects',
      operation: 'update',
      where: [{ field: 'id', operator: '=', value: id }],
      data
    });
    
    // Emit after event
    await this.db.emit('projects.update.after', { data: result, oldData });
    
    return result;
  }
  
  async delete(id: string): Promise<void> {
    await this.db.query({
      collection: 'projects',
      operation: 'delete',
      where: [{ field: 'id', operator: '=', value: id }]
    });
    
    await this.db.emit('projects.delete.after', { id });
  }
  
  // Complex queries
  async getWithClients(projectId: string): Promise<ProjectWithClients> {
    return this.db.query({
      collection: 'projects',
      operation: 'select',
      where: [{ field: 'id', operator: '=', value: projectId }],
      join: [
        {
          collection: 'project_clients',
          on: [{ left: 'projects.id', right: 'project_clients.project_id' }]
        },
        {
          collection: 'profiles',
          on: [{ left: 'project_clients.client_id', right: 'profiles.id' }]
        }
      ]
    });
  }
}

// Usage in components
import { db } from "@/lib/database";

const projects = await db.projects.getAll({ status: 'active' });
const project = await db.projects.getById('uuid');
await db.projects.update('uuid', { status: 'completed' });
```

---

## Database Adapter Interface

### Abstract Base Adapter

```typescript
// src/lib/database/adapters/base.ts
export abstract class BaseAdapter {
  abstract name: DatabaseProvider;
  abstract isConnected: boolean;
  
  // Connection management
  abstract connect(config: ConnectionConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<boolean>;
  
  // Core operations
  abstract query<T>(query: UniversalQuery): Promise<T>;
  abstract transaction<T>(callback: TransactionCallback): Promise<T>;
  
  // Schema management
  abstract getSchema(): Promise<SchemaInfo>;
  abstract createTable(definition: TableDefinition): Promise<void>;
  abstract dropTable(tableName: string): Promise<void>;
  
  // Migration support
  abstract exportData(tables?: string[]): Promise<ExportData>;
  abstract importData(data: ExportData): Promise<ImportResult>;
  
  // Provider-specific features
  abstract supportsRealtime: boolean;
  abstract supportsFullTextSearch: boolean;
  abstract supportsJSONQueries: boolean;
}
```

### Supabase Adapter (Enhanced)

```typescript
// src/lib/database/adapters/supabase.ts
export class SupabaseAdapter extends BaseAdapter {
  name = 'supabase' as const;
  private client: SupabaseClient;
  isConnected = false;
  
  supportsRealtime = true;
  supportsFullTextSearch = true;
  supportsJSONQueries = true;
  
  async connect(config: SupabaseConfig): Promise<void> {
    const { createClient } = await import('@supabase/supabase-js');
    this.client = createClient(config.url, config.anonKey);
    this.isConnected = await this.testConnection();
  }
  
  async query<T>(query: UniversalQuery): Promise<T> {
    const { collection, operation, where, orderBy, limit, select, data } = query;
    
    switch (operation) {
      case 'select':
        let q = this.client.from(collection).select(select || '*');
        
        // Apply where clauses
        if (where) {
          where.forEach(({ field, operator, value }) => {
            switch (operator) {
              case '=': q = q.eq(field, value); break;
              case '!=': q = q.neq(field, value); break;
              case '>': q = q.gt(field, value); break;
              case '<': q = q.lt(field, value); break;
              case '>=': q = q.gte(field, value); break;
              case '<=': q = q.lte(field, value); break;
              case 'in': q = q.in(field, value); break;
              case 'like': q = q.like(field, value); break;
            }
          });
        }
        
        // Apply ordering
        if (orderBy) {
          orderBy.forEach(({ field, direction }) => {
            q = q.order(field, { ascending: direction === 'asc' });
          });
        }
        
        // Apply limit
        if (limit) q = q.limit(limit);
        
        const { data: result, error } = await q;
        if (error) throw new DatabaseError(error.message);
        return result as T;
      
      case 'insert':
        const { data: insertResult, error: insertError } = await this.client
          .from(collection)
          .insert(data)
          .select()
          .single();
        if (insertError) throw new DatabaseError(insertError.message);
        return insertResult as T;
      
      case 'update':
        let updateQuery = this.client.from(collection).update(data);
        where?.forEach(({ field, value }) => {
          updateQuery = updateQuery.eq(field, value);
        });
        const { data: updateResult, error: updateError } = await updateQuery.select().single();
        if (updateError) throw new DatabaseError(updateError.message);
        return updateResult as T;
      
      case 'delete':
        let deleteQuery = this.client.from(collection).delete();
        where?.forEach(({ field, value }) => {
          deleteQuery = deleteQuery.eq(field, value);
        });
        const { error: deleteError } = await deleteQuery;
        if (deleteError) throw new DatabaseError(deleteError.message);
        return null as T;
      
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }
  
  async exportData(tables?: string[]): Promise<ExportData> {
    const schema = await this.getSchema();
    const data: ExportData = { tables: {} };
    
    const tablesToExport = tables || schema.tables.map(t => t.name);
    
    for (const table of tablesToExport) {
      const { data: tableData, error } = await this.client
        .from(table)
        .select('*');
      
      if (!error) {
        data.tables[table] = tableData;
      }
    }
    
    return data;
  }
}
```

---

## Migration System Architecture

### Migration Manager

```typescript
// src/lib/database/migration.ts
export class MigrationManager {
  constructor(
    private sourceAdapter: BaseAdapter,
    private targetAdapter: BaseAdapter
  ) {}
  
  async migrate(options: MigrationOptions): Promise<MigrationResult> {
    const steps: MigrationStep[] = [];
    
    try {
      // Step 1: Backup source database
      steps.push({ name: 'backup', status: 'running', progress: 0 });
      const backup = await this.createBackup();
      steps[steps.length - 1].status = 'completed';
      
      // Step 2: Test target connection
      steps.push({ name: 'test_connection', status: 'running', progress: 0 });
      const connected = await this.targetAdapter.testConnection();
      if (!connected) throw new Error('Cannot connect to target database');
      steps[steps.length - 1].status = 'completed';
      
      // Step 3: Create schema on target
      steps.push({ name: 'create_schema', status: 'running', progress: 0 });
      await this.createSchema();
      steps[steps.length - 1].status = 'completed';
      
      // Step 4: Migrate data
      steps.push({ name: 'migrate_data', status: 'running', progress: 0 });
      await this.migrateData((progress) => {
        steps[steps.length - 1].progress = progress;
      });
      steps[steps.length - 1].status = 'completed';
      
      // Step 5: Verify data
      steps.push({ name: 'verify_data', status: 'running', progress: 0 });
      const verification = await this.verifyData();
      steps[steps.length - 1].status = 'completed';
      
      // Step 6: Switch active adapter
      if (options.autoSwitch) {
        steps.push({ name: 'switch_database', status: 'running', progress: 0 });
        await this.switchAdapter();
        steps[steps.length - 1].status = 'completed';
      }
      
      return {
        success: true,
        steps,
        backup,
        verification
      };
      
    } catch (error) {
      // Rollback on error
      await this.rollback(backup);
      throw error;
    }
  }
}
```

---

## Admin Panel Integration

### Database Management UI

**Location**: `src/pages/admin/DatabaseManagement.tsx`

**Features:**
1. **Current Database Status**
   - Provider name, connection status, performance metrics
   - Storage usage, record counts, query response times

2. **Provider Configuration**
   - Visual cards for each supported database
   - Dynamic configuration forms
   - Connection testing
   - Encrypted credential storage

3. **Migration Wizard**
   - Step-by-step progress visualization
   - Real-time logs
   - Pause/resume capability
   - Rollback option

4. **Data Backup & Restore**
   - One-click backup creation
   - Download backup as JSON/SQL
   - Upload and restore from backup

---

## Conclusion

This architecture provides complete database abstraction enabling zero-downtime, zero-code-change migrations between any supported database provider while maintaining security, performance, and functionality.

**Next Phase**: Implement all adapters and update application code to use universal interface.
