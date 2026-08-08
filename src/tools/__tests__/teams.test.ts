/**
 * @file teams.test.ts
 * @description Tests for ClickUp teams/workspaces tool functionality.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AxiosError } from 'axios';
import { mockTeamsResponse, mockTeam1, mockTeam2 } from './mocks.js';
import { handleApiError, formatDate } from '../../utils.js';

// Set test environment
process.env.CLICKUP_API_TOKEN = 'pk_test_token_for_testing';

/**
 * Creates a mock AxiosError for testing error handling.
 */
function createAxiosError(status: number, message: string): AxiosError {
  const error = new AxiosError(
    message,
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      data: { err: message },
      statusText: 'Error',
      headers: {},
      config: {} as any
    } as any
  );
  return error;
}

describe('Teams Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Team data structure', () => {
    it('should have teams array in response', () => {
      expect(mockTeamsResponse.teams).toBeDefined();
      expect(Array.isArray(mockTeamsResponse.teams)).toBe(true);
      expect(mockTeamsResponse.teams).toHaveLength(2);
    });

    it('should validate team has required properties', () => {
      expect(mockTeam1).toHaveProperty('id');
      expect(mockTeam1).toHaveProperty('name');
      expect(typeof mockTeam1.id).toBe('string');
      expect(typeof mockTeam1.name).toBe('string');
    });

    it('should validate team with optional properties', () => {
      expect(mockTeam1).toHaveProperty('color');
      expect(mockTeam1).toHaveProperty('members');
      expect(Array.isArray(mockTeam1.members)).toBe(true);
    });

    it('should validate team without optional properties', () => {
      expect(mockTeam2.members).toBeUndefined();
      expect(mockTeam2).toHaveProperty('id');
      expect(mockTeam2).toHaveProperty('name');
    });

    it('should have correct team names', () => {
      expect(mockTeam1.name).toBe('Engineering Team');
      expect(mockTeam2.name).toBe('Marketing Team');
    });

    it('should have members with correct structure', () => {
      const member = mockTeam1.members![0];
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('username');
      expect(typeof member.id).toBe('number');
    });
  });

  describe('Error handling for teams', () => {
    it('should handle 401 unauthorized error', () => {
      const error = createAxiosError(401, 'Invalid API token');
      const message = handleApiError(error);

      expect(message).toContain('Invalid or missing API token');
    });

    it('should handle 403 forbidden error', () => {
      const error = createAxiosError(403, 'Permission denied');
      const message = handleApiError(error);

      expect(message).toContain('Permission denied');
    });

    it('should handle 404 not found error', () => {
      const error = createAxiosError(404, 'Team not found');
      const message = handleApiError(error);

      expect(message).toContain('Resource not found');
    });

    it('should handle 429 rate limit error', () => {
      const error = createAxiosError(429, 'Rate limit exceeded');
      const message = handleApiError(error);

      expect(message).toContain('Rate limit exceeded');
    });

    it('should handle 500 server error', () => {
      const error = createAxiosError(500, 'Server error');
      const message = handleApiError(error);

      expect(message).toContain('ClickUp server error');
    });

    it('should handle network errors', () => {
      const error = new Error('Network error') as any;
      error.code = 'ENOTFOUND';
      error.isAxiosError = false; // Not an AxiosError, just a regular error with code
      const message = handleApiError(error);

      expect(message).toContain('Unexpected error');
    });

    it('should handle timeout errors', () => {
      const error = new AxiosError('Timeout', 'ECONNABORTED');
      const message = handleApiError(error);

      expect(message).toContain('timed out');
    });
  });

  describe('API token handling', () => {
    it('should require API token', () => {
      expect(process.env.CLICKUP_API_TOKEN).toBeDefined();
      expect(process.env.CLICKUP_API_TOKEN).toBe('pk_test_token_for_testing');
    });
  });
});
