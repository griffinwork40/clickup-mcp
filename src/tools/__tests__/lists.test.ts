/**
 * @file lists.test.ts
 * @description Tests for ClickUp lists tool functionality.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AxiosError } from 'axios';
import { mockListsResponse, mockList1, mockList2, mockStatuses } from './mocks.js';
import { handleApiError, formatListMarkdown } from '../../utils.js';

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

describe('Lists Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('List data structure', () => {
    it('should have lists array in response', () => {
      expect(mockListsResponse.lists).toBeDefined();
      expect(Array.isArray(mockListsResponse.lists)).toBe(true);
      expect(mockListsResponse.lists).toHaveLength(2);
    });

    it('should validate list has required properties', () => {
      expect(mockList1).toHaveProperty('id');
      expect(mockList1).toHaveProperty('name');
      expect(mockList1).toHaveProperty('task_count');
      expect(mockList1).toHaveProperty('archived');
    });

    it('should validate task_count is a number', () => {
      expect(typeof mockList1.task_count).toBe('number');
      expect(mockList1.task_count).toBe(42);
    });

    it('should validate statuses structure', () => {
      expect(mockList1.statuses).toBeDefined();
      expect(Array.isArray(mockList1.statuses)).toBe(true);
      expect(mockList1.statuses![0]).toHaveProperty('status');
      expect(mockList1.statuses![0]).toHaveProperty('color');
      expect(mockList1.statuses![0]).toHaveProperty('type');
    });

    it('should validate status types', () => {
      const types = mockStatuses.map(s => s.type);
      expect(types).toContain('open');
      expect(types).toContain('custom');
      expect(types).toContain('closed');
    });

    it('should have folder reference', () => {
      expect(mockList1.folder).toBeDefined();
      expect(mockList1.folder!.id).toBe('folder_001');
      expect(mockList1.folder!.name).toBe('Sprint 1');
    });

    it('should have space reference', () => {
      expect(mockList1.space).toBeDefined();
      expect(mockList1.space!.id).toBe('space_001');
    });
  });

  describe('formatListMarkdown', () => {
    it('should format list with basic info', () => {
      const markdown = formatListMarkdown(mockList1);

      expect(markdown).toContain('Backlog');
      expect(markdown).toContain(mockList1.id);
      expect(markdown).toContain('Tasks**: 42');
    });

    it('should include folder info when available', () => {
      const markdown = formatListMarkdown(mockList1);

      expect(markdown).toContain('Folder**: Sprint 1');
    });

    it('should include space info when available', () => {
      const markdown = formatListMarkdown(mockList1);

      expect(markdown).toContain('Space**: Product Development');
    });

    it('should include statuses when available', () => {
      const markdown = formatListMarkdown(mockList1);

      expect(markdown).toContain('Statuses');
      expect(markdown).toContain('to do');
      expect(markdown).toContain('in progress');
      expect(markdown).toContain('complete');
    });

    it('should handle list without folder', () => {
      const listNoFolder = { ...mockList1, folder: undefined };
      const markdown = formatListMarkdown(listNoFolder);

      expect(markdown).toContain('Backlog');
      expect(markdown).not.toContain('Folder**:');
    });

    it('should handle list without statuses', () => {
      const listNoStatuses = { ...mockList1, statuses: undefined };
      const markdown = formatListMarkdown(listNoStatuses);

      expect(markdown).toContain('Backlog');
      expect(markdown).not.toContain('## Statuses');
    });
  });

  describe('Error handling for lists', () => {
    it('should handle 404 not found for invalid folder_id', () => {
      const error = createAxiosError(404, 'Folder not found');
      const message = handleApiError(error);

      expect(message).toContain('Resource not found');
    });

    it('should handle 404 not found for invalid list_id', () => {
      const error = createAxiosError(404, 'List not found');
      const message = handleApiError(error);

      expect(message).toContain('Resource not found');
    });

    it('should handle 400 bad request', () => {
      const error = createAxiosError(400, 'Invalid request');
      const message = handleApiError(error);

      expect(message).toContain('Bad request');
    });
  });

  describe('List parameter validation', () => {
    it('should require either folder_id or space_id', () => {
      // This test validates the logic that at least one ID is needed
      const hasValidParams = (folderId?: string, spaceId?: string) => {
        return !!(folderId || spaceId) && !(folderId && spaceId);
      };

      expect(hasValidParams('folder_001', undefined)).toBe(true);
      expect(hasValidParams(undefined, 'space_001')).toBe(true);
      expect(hasValidParams(undefined, undefined)).toBe(false);
      expect(hasValidParams('folder_001', 'space_001')).toBe(false);
    });
  });
});
