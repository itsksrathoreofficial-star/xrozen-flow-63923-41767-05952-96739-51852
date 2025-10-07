/**
 * Universal Authentication Abstraction Layer
 * Provides database-agnostic authentication interface
 */

import { supabase } from '@/integrations/supabase/client';
import type { User, Session, AuthResult } from './types';

export interface AuthProvider {
  signUp(email: string, password: string, metadata?: any): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<{ error: Error | null }>;
  resetPassword(email: string): Promise<{ error: Error | null }>;
  updatePassword(newPassword: string): Promise<{ error: Error | null }>;
  getSession(): Promise<Session | null>;
  getUser(): Promise<User | null>;
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}

/**
 * Supabase Authentication Provider
 */
class SupabaseAuthProvider implements AuthProvider {
  async signUp(email: string, password: string, metadata?: any): Promise<AuthResult> {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });

    if (error) {
      return { user: null, session: null, error };
    }

    return {
      user: data.user as any,
      session: data.session as any,
      error: null
    };
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { user: null, session: null, error };
    }

    return {
      user: data.user as any,
      session: data.session as any,
      error: null
    };
  }

  async signOut(): Promise<{ error: Error | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    return { error };
  }

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    return { error };
  }

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session as any;
  }

  async getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user as any;
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        callback(session as any);
      }
    );

    return () => subscription.unsubscribe();
  }
}

/**
 * Firebase Authentication Provider (Placeholder)
 */
class FirebaseAuthProvider implements AuthProvider {
  async signUp(email: string, password: string, metadata?: any): Promise<AuthResult> {
    throw new Error('Firebase authentication not yet implemented');
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    throw new Error('Firebase authentication not yet implemented');
  }

  async signOut(): Promise<{ error: Error | null }> {
    throw new Error('Firebase authentication not yet implemented');
  }

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    throw new Error('Firebase authentication not yet implemented');
  }

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    throw new Error('Firebase authentication not yet implemented');
  }

  async getSession(): Promise<Session | null> {
    throw new Error('Firebase authentication not yet implemented');
  }

  async getUser(): Promise<User | null> {
    throw new Error('Firebase authentication not yet implemented');
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    throw new Error('Firebase authentication not yet implemented');
  }
}

/**
 * Authentication Manager
 * Routes authentication operations through the appropriate provider
 */
class AuthManager {
  private currentProvider: AuthProvider;
  private providerType: 'supabase' | 'firebase' = 'supabase';

  constructor() {
    this.currentProvider = new SupabaseAuthProvider();
  }

  /**
   * Get current authentication provider
   */
  getCurrentProvider(): 'supabase' | 'firebase' {
    return this.providerType;
  }

  /**
   * Switch authentication provider
   */
  switchProvider(provider: 'supabase' | 'firebase'): void {
    switch (provider) {
      case 'supabase':
        this.currentProvider = new SupabaseAuthProvider();
        break;
      case 'firebase':
        this.currentProvider = new FirebaseAuthProvider();
        break;
      default:
        throw new Error(`Unsupported auth provider: ${provider}`);
    }
    this.providerType = provider;
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, metadata?: any): Promise<AuthResult> {
    return this.currentProvider.signUp(email, password, metadata);
  }

  /**
   * Sign in existing user
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    return this.currentProvider.signIn(email, password);
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error: Error | null }> {
    return this.currentProvider.signOut();
  }

  /**
   * Request password reset
   */
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    return this.currentProvider.resetPassword(email);
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    return this.currentProvider.updatePassword(newPassword);
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    return this.currentProvider.getSession();
  }

  /**
   * Get current user
   */
  async getUser(): Promise<User | null> {
    return this.currentProvider.getUser();
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    return this.currentProvider.onAuthStateChange(callback);
  }
}

// Export singleton instance
export const auth = new AuthManager();
