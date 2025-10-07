/**
 * Authentication Migration Helper
 * Provides utilities to migrate from Supabase auth to API Client auth
 */

import { apiClient } from '@/lib/api-client';

/**
 * Get current authenticated user
 * Replaces: supabase.auth.getUser()
 */
export async function getCurrentUser() {
  try {
    return await apiClient.getCurrentUser();
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Get current session
 * Replaces: supabase.auth.getSession()
 */
export async function getCurrentSession() {
  try {
    const user = await apiClient.getCurrentUser();
    return user ? { user, session: { user } } : null;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Sign out user
 * Replaces: supabase.auth.signOut()
 */
export async function signOut() {
  try {
    await apiClient.logout();
  } catch (error) {
    console.error('Failed to sign out:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const user = await apiClient.getCurrentUser();
    return !!user;
  } catch {
    return false;
  }
}

/**
 * Get user ID safely
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const user = await apiClient.getCurrentUser();
    return user?.id || null;
  } catch {
    return null;
  }
}
