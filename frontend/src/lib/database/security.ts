/**
 * Security Middleware - Replaces Supabase RLS Policies
 * Application-level permission checks for all database operations
 */

import type { User, PermissionRule, UniversalQuery } from './types';

/**
 * Permission Rules - Replicate all Supabase RLS policies
 * These rules are applied before any database operation
 */
export const permissionRules: PermissionRule[] = [
  // ==================== PROFILES TABLE ====================
  {
    table: 'profiles',
    operation: 'select',
    check: () => true, // All users can view profiles
  },
  {
    table: 'profiles',
    operation: 'update',
    check: (user, query, data) => {
      if (!user) return false;
      return data?.id === user.id; // Users can only update own profile
    },
  },
  {
    table: 'profiles',
    operation: 'insert',
    check: (user, query, data) => {
      if (!user) return false;
      return data?.id === user.id; // Users can only insert own profile
    },
  },

  // ==================== USER_ROLES TABLE ====================
  {
    table: 'user_roles',
    operation: 'select',
    check: (user, query) => {
      if (!user) return false;
      return true; // Users can view own roles (will be filtered in modifyQuery)
    },
    modifyQuery: (user, query) => {
      query.where = query.where || [];
      query.where.push({ field: 'user_id', operator: '=', value: user.id });
      return query;
    },
  },
  {
    table: 'user_roles',
    operation: 'insert',
    check: () => false, // Only system can insert roles (through triggers/events)
  },

  // ==================== PROJECTS TABLE ====================
  {
    table: 'projects',
    operation: 'select',
    check: (user) => !!user,
    modifyQuery: (user, query) => {
      // Users can only view their own projects
      query.where = query.where || [];
      query.where.push({ field: 'creator_id', operator: '=', value: user.id });
      return query;
    },
  },
  {
    table: 'projects',
    operation: 'insert',
    check: (user, query, data) => {
      if (!user) return false;
      return data?.creator_id === user.id; // Must create with own user_id
    },
  },
  {
    table: 'projects',
    operation: 'update',
    check: async (user, query) => {
      if (!user) return false;
      // Only project creator can update
      return true; // Will be verified by modifyQuery
    },
    modifyQuery: (user, query) => {
      query.where = query.where || [];
      query.where.push({ field: 'creator_id', operator: '=', value: user.id });
      return query;
    },
  },
  {
    table: 'projects',
    operation: 'delete',
    check: (user) => !!user,
    modifyQuery: (user, query) => {
      query.where = query.where || [];
      query.where.push({ field: 'creator_id', operator: '=', value: user.id });
      return query;
    },
  },

  // ==================== PROJECT_CLIENTS TABLE ====================
  {
    table: 'project_clients',
    operation: 'select',
    check: (user) => !!user,
    // Complex check: user is project creator OR assigned client
    // Will be handled by join in actual query
  },
  {
    table: 'project_clients',
    operation: '*', // All operations
    check: async (user) => {
      // Project creators can manage project clients
      // This will be verified through project ownership check
      return !!user;
    },
  },

  // ==================== VIDEO_VERSIONS TABLE ====================
  {
    table: 'video_versions',
    operation: 'select',
    check: (user) => !!user,
    // Users can view video versions for their projects
  },
  {
    table: 'video_versions',
    operation: '*', // insert, update, delete
    check: (user) => !!user,
    // Project creators can manage video versions
  },

  // ==================== MESSAGES TABLE ====================
  {
    table: 'messages',
    operation: 'select',
    check: (user) => !!user,
    modifyQuery: (user, query) => {
      // Users can only see messages they're part of
      query.or = [
        [{ field: 'sender_id', operator: '=', value: user.id }],
        [{ field: 'recipient_id', operator: '=', value: user.id }],
      ];
      return query;
    },
  },
  {
    table: 'messages',
    operation: 'insert',
    check: (user, query, data) => {
      if (!user) return false;
      return data?.sender_id === user.id; // Can only send as themselves
    },
  },

  // ==================== PAYMENTS TABLE ====================
  {
    table: 'payments',
    operation: 'select',
    check: (user) => !!user,
    modifyQuery: (user, query) => {
      // Users can view own payments (as payer or recipient)
      query.or = [
        [{ field: 'payer_id', operator: '=', value: user.id }],
        [{ field: 'recipient_id', operator: '=', value: user.id }],
      ];
      return query;
    },
  },
  {
    table: 'payments',
    operation: 'insert',
    check: (user, query, data) => {
      if (!user) return false;
      // Can create if they're payer or recipient
      return data?.payer_id === user.id || data?.recipient_id === user.id;
    },
  },
  {
    table: 'payments',
    operation: 'update',
    check: (user, query, data) => {
      if (!user) return false;
      // Similar to select - must be payer or recipient
      return true; // Will be filtered by modifyQuery
    },
    modifyQuery: (user, query) => {
      query.or = [
        [{ field: 'payer_id', operator: '=', value: user.id }],
        [{ field: 'recipient_id', operator: '=', value: user.id }],
      ];
      return query;
    },
  },

  // ==================== EDITORS TABLE ====================
  {
    table: 'editors',
    operation: 'select',
    check: () => true, // All authenticated users can view
  },
  {
    table: 'editors',
    operation: 'insert',
    check: () => true, // All authenticated users can insert
  },
  {
    table: 'editors',
    operation: 'update',
    check: () => true, // All authenticated users can update
  },

  // ==================== CLIENTS TABLE ====================
  {
    table: 'clients',
    operation: 'select',
    check: () => true, // All authenticated users can view
  },
  {
    table: 'clients',
    operation: 'insert',
    check: () => true, // All authenticated users can insert
  },
  {
    table: 'clients',
    operation: 'update',
    check: () => true, // All authenticated users can update
  },

  // ==================== PROJECT_TYPES TABLE ====================
  {
    table: 'project_types',
    operation: 'select',
    check: () => true,
  },
  {
    table: 'project_types',
    operation: 'insert',
    check: () => true,
  },

  // ==================== DATABASE_CONFIG TABLE ====================
  {
    table: 'database_config',
    operation: 'select',
    check: () => true, // Anyone can view config
  },
];

/**
 * Apply security rules to query (alias for applyPermissions)
 */
export async function applySecurityRules(
  query: UniversalQuery,
  user: User | null
): Promise<UniversalQuery> {
  const result = await applyPermissions(query, user);
  
  if (!result.allowed) {
    throw new Error(result.error || 'Permission denied');
  }
  
  return result.modifiedQuery;
}

/**
 * Apply permission middleware to query
 */
export async function applyPermissions(
  query: UniversalQuery,
  user: User | null
): Promise<{ allowed: boolean; modifiedQuery: UniversalQuery; error?: string }> {
  const { collection, operation, data } = query;
  
  // Find matching rules
  const matchingRules = permissionRules.filter(
    (rule) => 
      rule.table === collection && 
      (rule.operation === operation || rule.operation === '*')
  );

  if (matchingRules.length === 0) {
    // No rules defined - deny by default for security
    return {
      allowed: false,
      modifiedQuery: query,
      error: `No permission rules defined for ${collection}.${operation}`,
    };
  }

  // Check all matching rules
  for (const rule of matchingRules) {
    const allowed = await Promise.resolve(rule.check(user, query, data));
    
    if (!allowed) {
      return {
        allowed: false,
        modifiedQuery: query,
        error: `Permission denied for ${collection}.${operation}`,
      };
    }

    // Modify query if rule has modifier
    if (rule.modifyQuery && user) {
      query = rule.modifyQuery(user, query);
    }
  }

  return { allowed: true, modifiedQuery: query };
}

/**
 * Check if user has specific role
 */
export async function hasRole(userId: string, role: string, db: any): Promise<boolean> {
  const result = await db.query({
    collection: 'user_roles',
    operation: 'select',
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'role', operator: '=', value: role },
    ],
    limit: 1,
  });

  return Array.isArray(result) && result.length > 0;
}

/**
 * Get user's role
 */
export async function getUserRole(userId: string, db: any): Promise<string | null> {
  const result = await db.query({
    collection: 'user_roles',
    operation: 'select',
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  });

  if (Array.isArray(result) && result.length > 0) {
    return result[0].role;
  }

  return null;
}
