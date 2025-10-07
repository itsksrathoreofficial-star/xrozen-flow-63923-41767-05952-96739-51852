/**
 * DEPRECATED: Custom Authentication Service
 * 
 * This file is deprecated and should not be used.
 * Use the new authentication system in:
 * - src/lib/auth/auth.service.ts (backend)
 * - src/lib/api-client.ts (frontend)
 * 
 * This file is kept for reference only during migration.
 */

export const DEPRECATED_MESSAGE = 'This authentication service is deprecated. Please use src/lib/api-client.ts instead.';

export class CustomAuthService {
  constructor() {
    console.warn(DEPRECATED_MESSAGE);
  }
}

export const customAuth = new CustomAuthService();
