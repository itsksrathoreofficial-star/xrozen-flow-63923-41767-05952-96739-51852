/**
 * Event System - Replaces Database Triggers
 * Application-level event handlers for database operations
 */

import type { DatabaseEvent, EventHandler, User } from './types';

class EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Register event handler
   */
  on(event: string, handler: EventHandler): void {
    const existing = this.handlers.get(event) || [];
    this.handlers.set(event, [...existing, handler]);
  }

  /**
   * Remove event handler
   */
  off(event: string, handler: EventHandler): void {
    const existing = this.handlers.get(event) || [];
    this.handlers.set(
      event,
      existing.filter((h) => h !== handler)
    );
  }

  /**
   * Emit event to all handlers
   */
  async emit(event: string, data: DatabaseEvent): Promise<void> {
    const handlers = this.handlers.get(event) || [];
    
    // Execute handlers in sequence
    for (const handler of handlers) {
      try {
        await Promise.resolve(handler(data));
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
        // Continue executing other handlers even if one fails
      }
    }

    // Also emit wildcard handlers
    const wildcardHandlers = this.handlers.get('*') || [];
    for (const handler of wildcardHandlers) {
      try {
        await Promise.resolve(handler(data));
      } catch (error) {
        console.error(`Error in wildcard event handler:`, error);
      }
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}

export const dbEvents = new EventEmitter();
export const eventEmitter = dbEvents; // Alias for compatibility

/**
 * Emit before event
 */
export async function emitBeforeEvent(
  collection: string,
  operation: string,
  data: any,
  user: User | null
): Promise<void> {
  const eventName = `${collection}.${operation}.before`;
  await dbEvents.emit(eventName, { operation: operation as any, data, user } as any);
}

/**
 * Emit after event
 */
export async function emitAfterEvent(
  collection: string,
  operation: string,
  result: any,
  user: User | null
): Promise<void> {
  const eventName = `${collection}.${operation}.after`;
  await dbEvents.emit(eventName, { operation: operation as any, data: result, user } as any);
}

/**
 * Register default event handlers that replicate Supabase triggers
 */
export function registerDefaultEventHandlers(db: any): void {
  
  // ==================== PROFILES TABLE EVENTS ====================
  
  /**
   * Replaces: handle_new_user() trigger
   * When a new profile is inserted, create default user role
   */
  dbEvents.on('profiles.insert.after', async (event) => {
    const { data } = event;
    
    try {
      // Create default user role based on user_category
      await db.query({
        collection: 'user_roles',
        operation: 'insert',
        data: {
          user_id: data.id,
          role: data.user_category || 'editor',
          created_at: new Date().toISOString(),
        },
      });
      
      console.log(`Created user role for user ${data.id}`);
    } catch (error) {
      console.error('Failed to create user role:', error);
      // Don't throw - allow profile creation to succeed
    }
  });

  /**
   * Replaces: sync_user_role() trigger
   * When user_category changes, update user_roles
   */
  dbEvents.on('profiles.update.after', async (event) => {
    const { data, oldData } = event;
    
    if (data.user_category !== oldData?.user_category) {
      try {
        // Delete old role
        await db.query({
          collection: 'user_roles',
          operation: 'delete',
          where: [{ field: 'user_id', operator: '=', value: data.id }],
        });

        // Insert new role
        await db.query({
          collection: 'user_roles',
          operation: 'insert',
          data: {
            user_id: data.id,
            role: data.user_category,
            created_at: new Date().toISOString(),
          },
        });

        console.log(`Synced user role for user ${data.id} to ${data.user_category}`);
      } catch (error) {
        console.error('Failed to sync user role:', error);
      }
    }
  });

  // ==================== UPDATE TIMESTAMPS ====================
  
  /**
   * Replaces: update_updated_at_column() trigger
   * Auto-update updated_at timestamp on any update
   */
  const tablesWithTimestamps = [
    'profiles',
    'projects',
    'video_versions',
    'payments',
    'editors',
    'clients',
    'database_config',
  ];

  for (const table of tablesWithTimestamps) {
    dbEvents.on(`${table}.update.before`, async (event) => {
      event.data.updated_at = new Date().toISOString();
    });
  }

  // ==================== BUSINESS LOGIC EVENTS ====================
  
  /**
   * When a project is created, emit notification
   */
  dbEvents.on('projects.insert.after', async (event) => {
    const { data, user } = event;
    console.log(`New project created: ${data.name} by user ${user?.id}`);
    // Could send notification, log activity, etc.
  });

  /**
   * When a message is sent, mark as unread
   */
  dbEvents.on('messages.insert.before', async (event) => {
    event.data.is_read = false;
    event.data.created_at = new Date().toISOString();
  });

  /**
   * When payment status changes, log it
   */
  dbEvents.on('payments.update.after', async (event) => {
    const { data, oldData } = event;
    if (data.status !== oldData?.status) {
      console.log(`Payment ${data.id} status changed: ${oldData?.status} → ${data.status}`);
      // Could trigger email notification, update analytics, etc.
    }
  });

  /**
   * When video version is approved, update project status
   */
  dbEvents.on('video_versions.update.after', async (event) => {
    const { data, oldData } = event;
    
    if (data.is_approved && !oldData?.is_approved) {
      try {
        // Update project status to completed
        await db.query({
          collection: 'projects',
          operation: 'update',
          where: [{ field: 'id', operator: '=', value: data.project_id }],
          data: { status: 'approved' },
        });
        
        console.log(`Project ${data.project_id} marked as approved`);
      } catch (error) {
        console.error('Failed to update project status:', error);
      }
    }
  });
}

/**
 * Helper to construct event name
 */
export function makeEventName(table: string, operation: string, timing: 'before' | 'after'): string {
  return `${table}.${operation}.${timing}`;
}
