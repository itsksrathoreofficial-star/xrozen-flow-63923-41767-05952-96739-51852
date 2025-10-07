# Universal Database Abstraction Layer - Complete Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Getting Started](#getting-started)
3. [Migration Guide](#migration-guide)
4. [API Reference](#api-reference)
5. [Performance Monitoring](#performance-monitoring)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Design
The Universal Database Abstraction Layer provides complete database independence through:

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (React Components, Services, Business Logic)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Database Abstraction Layer                      │
│  - Universal Query Interface                                 │
│  - Security Layer (RLS, Permissions)                         │
│  - Event System (Hooks, Triggers)                            │
│  - Performance Monitoring                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                  ▼
┌──────────────┐                  ┌──────────────┐
│   Adapters   │                  │  Monitoring  │
│              │                  │   Service    │
├──────────────┤                  ├──────────────┤
│ - Supabase   │                  │ - Metrics    │
│ - Firebase   │                  │ - Alerts     │
│ - MySQL      │                  │ - Health     │
│ - PostgreSQL │                  │ - Analytics  │
│ - MongoDB    │                  └──────────────┘
│ - SQLite     │
└──────────────┘
```

### Key Components

1. **Database Manager** (`src/lib/database/index.ts`)
   - Orchestrates all database operations
   - Manages provider switching
   - Handles security and events

2. **Adapters** (`src/lib/database/adapters/*.ts`)
   - Provider-specific implementations
   - Query translation
   - Connection management

3. **Monitoring Service** (`src/lib/database/monitoring.ts`)
   - Performance tracking
   - Alert management
   - Health monitoring

4. **Admin Interface** (`src/pages/AdminDatabase.tsx`)
   - Visual database management
   - Migration wizard
   - Configuration panels

---

## Getting Started

### Basic Usage

```typescript
import { db } from '@/lib/database/index';

// Simple query
const users = await db.query({
  collection: 'profiles',
  operation: 'select',
  where: [{ field: 'active', operator: '=', value: true }],
  orderBy: [{ field: 'created_at', direction: 'desc' }],
  limit: 10
});

// Insert data
const newUser = await db.query({
  collection: 'profiles',
  operation: 'insert',
  data: {
    email: 'user@example.com',
    full_name: 'John Doe'
  }
});

// Update data
await db.query({
  collection: 'profiles',
  operation: 'update',
  where: [{ field: 'id', operator: '=', value: userId }],
  data: { full_name: 'Jane Doe' }
});

// Delete data
await db.query({
  collection: 'profiles',
  operation: 'delete',
  where: [{ field: 'id', operator: '=', value: userId }]
});
```

### Using Helper Functions

```typescript
import { dbHelpers } from '@/lib/database/index';

// Get user profile
const profile = await dbHelpers.getProfiles(userId);

// Get all projects
const projects = await dbHelpers.getProjects();

// Create new project
const project = await dbHelpers.createProject({
  name: 'New Project',
  description: 'Project description'
});
```

---

## Migration Guide

### Pre-Migration Checklist

✅ **Backup Current Database**
```typescript
const backupData = await db.backup();
// Save backupData to secure location
```

✅ **Test Target Database Connection**
```typescript
const connected = await targetAdapter.testConnection();
if (!connected) throw new Error('Connection failed');
```

✅ **Verify Data Compatibility**
- Check data types supported by target database
- Identify features that need alternative implementations
- Plan for schema transformations

### Step-by-Step Migration Process

#### Step 1: Configure Target Database
1. Navigate to Admin Panel → Database Management
2. Select target database provider from cards
3. Enter credentials in configuration form
4. Click "Test Connection" to verify
5. Click "Save Configuration"

#### Step 2: Initiate Migration Wizard
1. Click "Start Migration" button
2. Select migration strategy:
   - **Full Migration:** Complete switch (recommended for smaller databases)
   - **Dual-Write:** Gradual transition (zero downtime)
   - **Table-by-Table:** Incremental migration

#### Step 3: Pre-Migration Validation
- Automatic backup creation
- Schema compatibility check
- Data volume estimation
- Migration time calculation

#### Step 4: Execute Migration
- Real-time progress tracking
- Table-by-table data transfer
- Batch processing (100-500 records)
- Error handling and logging

#### Step 5: Verification
- Record count comparison
- Checksum validation
- Sample data verification
- Functional testing

#### Step 6: Cutover
- Switch active database connection
- Monitor for issues
- Keep backup available for rollback

### Migration Strategies Explained

#### Full Migration (Recommended for < 10GB databases)
```typescript
await db.migrate('mysql', {
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'password',
  database: 'xrozen_workflow'
});
```

**Pros:**
- Simple, single-step process
- Complete within hours
- No dual-write complexity

**Cons:**
- Requires maintenance window
- Potential downtime (minimal if planned)

#### Dual-Write Migration (Zero Downtime)
```typescript
// Step 1: Start writing to both databases
await db.enableDualWrite('mysql', credentials);

// Step 2: Backfill historical data
await db.backfillData('mysql');

// Step 3: Switch reads to new database
await db.switchReadsTo('mysql');

// Step 4: Stop writing to old database
await db.completeMigration('mysql');
```

**Pros:**
- Zero downtime
- Safe rollback at any stage
- Gradual transition

**Cons:**
- More complex
- Temporary increased costs (two databases)

#### Table-by-Table Migration
```typescript
const tables = ['profiles', 'projects', 'messages', 'payments'];

for (const table of tables) {
  await db.migrateTable(table, 'mysql', credentials);
  // Verify before moving to next table
  await verifyTableMigration(table);
}
```

**Pros:**
- Incremental progress
- Easy to pause and resume
- Lower risk

**Cons:**
- Longest overall duration
- Complex application routing

### Rollback Procedure

If migration fails or issues arise:

```typescript
// Immediate rollback
await db.rollback();

// Or restore from backup
await db.restore(backupData);
```

From Admin Panel:
1. Click "Rollback Migration" button
2. Confirm action
3. System automatically switches back to previous database
4. Verify application functionality

---

## API Reference

### Core Methods

#### `db.query<T>(query: UniversalQuery): Promise<T>`
Execute universal database query.

```typescript
interface UniversalQuery {
  collection: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'count';
  data?: any;
  where?: WhereCondition[];
  or?: WhereCondition[][];
  orderBy?: OrderBy[];
  limit?: number;
  offset?: number;
  select?: string[];
  join?: Join[];
  aggregate?: Aggregate;
}
```

#### `db.switchProvider(provider, credentials): Promise<void>`
Switch to different database provider.

```typescript
await db.switchProvider('firebase', {
  apiKey: 'your-api-key',
  authDomain: 'your-app.firebaseapp.com',
  projectId: 'your-project'
});
```

#### `db.backup(): Promise<BackupData>`
Create full database backup.

```typescript
const backup = await db.backup();
// Returns: { schema: {}, data: {}, metadata: {} }
```

#### `db.restore(backupData): Promise<void>`
Restore database from backup.

```typescript
await db.restore(backupData);
```

### Helper Functions

#### `dbHelpers.getProfiles(userId?): Promise<Profile[]>`
Get user profiles.

#### `dbHelpers.getProjects(editorId?): Promise<Project[]>`
Get projects.

#### `dbHelpers.createProject(data): Promise<Project>`
Create new project.

#### `dbHelpers.getMessages(projectId?): Promise<Message[]>`
Get messages.

#### `dbHelpers.getUserRole(userId): Promise<string>`
Get user role.

---

## Performance Monitoring

### Accessing Performance Dashboard

Navigate to: **Admin Panel → Performance Monitoring**

### Key Metrics

1. **System Status**
   - Healthy / Degraded / Critical
   - Current database provider
   - Real-time health indicator

2. **Query Performance**
   - Average query execution time
   - Slow query detection (>1s)
   - Query trends over time

3. **Error Tracking**
   - Error rate percentage
   - Error distribution by type
   - Failed operation details

4. **Uptime & Availability**
   - System uptime duration
   - Connection pool utilization
   - Recent operations log

### Setting Up Alerts

```typescript
import { monitoringService } from '@/lib/database/monitoring';

// Add custom alert rule
monitoringService.addAlertRule({
  id: 'custom-alert',
  name: 'Very Slow Queries',
  condition: 'query_time',
  threshold: 5000, // 5 seconds
  enabled: true,
  notificationChannels: ['email', 'webhook']
});
```

### Exporting Metrics

From Performance Dashboard:
1. Click "Export Metrics" button
2. Choose format (CSV/JSON)
3. Download file for external analysis

Or programmatically:
```typescript
const csvData = monitoringService.exportMetrics('csv');
// Save to file or send to analytics service
```

---

## Security Best Practices

### 1. Credential Management

**Never hardcode credentials:**
```typescript
// ❌ Bad
const db = new MySQLAdapter({
  password: 'my-password-123'
});

// ✅ Good - Use environment variables
const db = new MySQLAdapter({
  password: process.env.DB_PASSWORD
});
```

**Store encrypted credentials:**
- Admin panel automatically encrypts stored credentials
- Use secure secret management services in production

### 2. Row-Level Security (RLS)

RLS is implemented at application level:

```typescript
// Security rules applied automatically
const projects = await db.query({
  collection: 'projects',
  operation: 'select',
  // Only returns projects user has access to
});
```

Customize security rules in `src/lib/database/security.ts`.

### 3. Input Validation

Always validate user input:
```typescript
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().max(100),
  description: z.string().max(1000).optional()
});

const validated = projectSchema.parse(userInput);
await db.query({
  collection: 'projects',
  operation: 'insert',
  data: validated
});
```

### 4. Audit Logging

All database operations are automatically logged:
```typescript
// View audit logs in Admin Panel → Database → Logs
// Or access programmatically:
const recentOps = monitoringService.getMetrics(3600000);
```

---

## Troubleshooting

### Common Issues

#### 1. Migration Fails Midway

**Symptoms:** Migration stops with error

**Solutions:**
```typescript
// Check migration logs
const logs = await db.getMigrationLogs();

// Rollback and retry
await db.rollback();
await db.migrate(targetProvider, credentials);

// Or resume from checkpoint
await db.resumeMigration();
```

#### 2. Slow Query Performance

**Symptoms:** High query execution times

**Solutions:**
- Check Performance Dashboard → Slow Queries
- Add database indexes
- Optimize query structure
- Enable query caching

```typescript
// Add index (example for Supabase)
await supabase.rpc('create_index', {
  table_name: 'projects',
  column_name: 'created_at'
});
```

#### 3. Connection Pool Exhaustion

**Symptoms:** "Too many connections" errors

**Solutions:**
- Increase connection pool size in adapter configuration
- Check for connection leaks
- Implement connection timeouts

#### 4. Data Type Mismatch After Migration

**Symptoms:** Queries fail with type errors

**Solutions:**
- Review data type mapping in adapter
- Apply schema transformations
- Update application code for new types

### Getting Help

1. **Check Documentation:** This file and code comments
2. **View Logs:** Admin Panel → Logs section
3. **Monitor Performance:** Performance Dashboard for insights
4. **Backup First:** Always create backup before major changes

### Emergency Procedures

**If production database goes down:**

1. Check health status:
```typescript
const health = monitoringService.getHealthStatus();
console.log(health);
```

2. Switch to backup provider:
```typescript
await db.switchProvider('backup-provider', credentials);
```

3. Restore from recent backup:
```typescript
await db.restore(lastKnownGoodBackup);
```

4. Monitor recovery:
- Watch Performance Dashboard
- Check error rates
- Verify critical operations

---

## Advanced Topics

### Adding New Database Provider

1. Create adapter in `src/lib/database/adapters/`:`
```typescript
export class NewDBAdapter extends BaseAdapter {
  async query<T>(query: UniversalQuery): Promise<T> {
    // Implement query translation
  }
  
  async testConnection(): Promise<boolean> {
    // Implement connection test
  }
  
  // ... other required methods
}
```

2. Register in Database Manager:
```typescript
// In src/lib/database/index.ts
case 'newdb':
  return new NewDBAdapter();
```

3. Add configuration UI in `DatabaseProviderConfig.tsx`

### Custom Event Handlers

```typescript
import { eventEmitter } from '@/lib/database/index';

// Listen to database events
eventEmitter.on('before:insert:projects', async (data) => {
  console.log('About to insert project:', data);
  // Add custom logic
});

eventEmitter.on('after:update:projects', async (result) => {
  console.log('Project updated:', result);
  // Trigger notifications, etc.
});
```

### Performance Optimization Tips

1. **Use Batch Operations:**
```typescript
// Instead of individual inserts
for (const item of items) {
  await db.query({ operation: 'insert', data: item });
}

// Use batch insert
await db.query({
  operation: 'insert',
  data: items // Array of items
});
```

2. **Implement Caching:**
```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache({ max: 100 });

const getCachedProjects = async () => {
  const cached = cache.get('projects');
  if (cached) return cached;
  
  const projects = await db.query({
    collection: 'projects',
    operation: 'select'
  });
  
  cache.set('projects', projects);
  return projects;
};
```

3. **Use Pagination:**
```typescript
const getPagedResults = async (page: number, pageSize: number) => {
  return db.query({
    collection: 'projects',
    operation: 'select',
    limit: pageSize,
    offset: page * pageSize
  });
};
```

---

## Conclusion

This Universal Database Abstraction Layer provides:

✅ **Complete Database Independence** - Switch providers anytime  
✅ **Zero Data Loss** - Verified migration processes  
✅ **Production-Ready Monitoring** - Real-time performance tracking  
✅ **Enterprise Security** - RLS, encryption, audit logs  
✅ **Easy Management** - Visual admin interfaces  
✅ **Comprehensive Documentation** - This guide and inline comments  

For questions or issues, refer to troubleshooting section or contact your development team.

**Last Updated:** Phase 4 Complete
**Version:** 1.0.0
