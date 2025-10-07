// This file is deprecated - use apiClient instead
// Keeping this file temporarily for backward compatibility during migration

// Mock Supabase client to prevent errors during migration
export const supabase = {
  auth: {
    signUp: () => Promise.resolve({ data: null, error: { message: 'Use apiClient instead' } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Use apiClient instead' } }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: [], error: null }),
    update: () => ({ data: [], error: null }),
    delete: () => ({ data: [], error: null })
  }),
  channel: () => ({
    on: () => ({ subscribe: () => {} })
  })
};

// Import the new API client instead:
// import { apiClient } from "@/lib/api-client";