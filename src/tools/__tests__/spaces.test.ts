/**
 * @file spaces.test.ts
 * @description Tests for ClickUp spaces tool functionality.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AxiosError } from 'axios';
import { mockSpacesResponse, mockSpace1, mockSpace2 } from './mocks.js';
import { handleApiError, formatSpaceMarkdown } from '../../utils.js';

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

describe('Spaces Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Space data structure', () => {
    it('should have spaces array in response', () => {
      expect(mockSpacesResponse.spaces).toBeDefined();
      expect(Array.isArray(mockSpacesResponse.spaces)).toBe(true);
      expect(mockSpacesResponse.spaces).toHaveLength(2);
    });

    it('should validate space has required properties', () => {
      expect(mockSpace1).toHaveProperty('id');
      expect(mockSpace1).toHaveProperty('name');
      expect(mockSpace1).toHaveProperty('private');
      expect(mockSpace1).toHaveProperty('multiple_assignees');
    });

    it('should validate space features structure', () => {
      expect(mockSpace1.features).toBeDefined();
      expect(mockSpace1.features).toHaveProperty('due_dates');
      expect(mockSpace1.features).toHaveProperty('time_tracking');
      expect(mockSpace1.features).toHaveProperty('custom_fields');
    });

    it('should validate statuses array when present', () => {
      expect(mockSpace1.statuses).toBeDefined();
      expect(Array.isArray(mockSpace1.statuses)).toBe(true);
      expect(mockSpace1.statuses![0]).toHaveProperty('status');
      expect(mockSpace1.statuses![0]).toHaveProperty('color');
    });

    it('should handle space without features', () => {
      expect(mockSpace2.features).toBeUndefined();
    });
  });

  describe('formatSpaceMarkdown', () => {
    it('should format public space correctly', () => {
      const markdown = formatSpaceMarkdown(mockSpace1);

      expect(markdown).toContain('Product Development');
      expect(markdown).toContain(mockSpace1.id);
      expect(markdown).toContain('Private**: No');
      expect(markdown).toContain('Multiple Assignees**: Yes');
    });

    it('should format private space correctly', () => {
      const markdown = formatSpaceMarkdown(mockSpace2);

      expect(markdown).toContain('Customer Support');
      expect(markdown).toContain('Private**: Yes');
      expect(markdown).toContain('Multiple Assignees**: No');
    });

    it('should include features when available', () => {
      const markdown = formatSpaceMarkdown(mockSpace1);

      expect(markdown).toContain('Features');
      expect(markdown).toContain('Due Dates');
      expect(markdown).toContain('Time Tracking');
      expect(markdown).toContain('Custom Fields');
    });

    it('should show enabled/disabled status for features', () => {
      const markdown = formatSpaceMarkdown(mockSpace1);

      expect(markdown).toContain('Enabled');
    });

    it('should handle space without features', () => {
      const markdown = formatSpaceMarkdown(mockSpace2);

      // Should not throw and should contain basic info
      expect(markdown).toContain('Customer Support');
    });
  });

  describe('Error handling for spaces', () => {
    it('should handle 404 not found for invalid team_id', () => {
      const error = createAxiosError(404, 'Team not found');
      const message = handleApiError(error);

      expect(message).toContain('Resource not found');
    });

    it('should handle 400 bad request', () => {
      const error = createAxiosError(400, 'Invalid team ID');
      const message = handleApiError(error);

      expect(message).toContain('Bad request');
    });

    it('should handle 500 server error', () => {
      const error = createAxiosError(500, 'Internal server error');
      const message = handleApiError(error);

      expect(message).toContain('ClickUp server error');
    });
  });
});
