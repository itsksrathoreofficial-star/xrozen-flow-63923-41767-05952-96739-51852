import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';

describe('ApiClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it('should login successfully', async () => {
    const mockResponse = {
      accessToken: 'test-token',
      user: { id: '1', email: 'test@test.com' },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await apiClient.login('test@test.com', 'password');
    
    expect(result.accessToken).toBe('test-token');
    expect(localStorage.getItem('auth_token')).toBe('test-token');
  });

  it('should fetch projects', async () => {
    localStorage.setItem('auth_token', 'test-token');
    
    const mockProjects = [{ id: '1', name: 'Test Project' }];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProjects,
    });

    const projects = await apiClient.getProjects();
    expect(projects).toEqual(mockProjects);
  });

  it('should handle logout', async () => {
    localStorage.setItem('auth_token', 'test-token');
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiClient.logout();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
