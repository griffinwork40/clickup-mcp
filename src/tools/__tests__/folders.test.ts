/**
 * @file folders.test.ts
 * @description Tests for ClickUp folders tool functionality.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AxiosError } from 'axios';
import { mockFoldersResponse, mockFolder1, mockFolder2 } from './mocks.js';
import { handleApiError, formatFolderMarkdown } from '../../utils.js';

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

describe('Folders Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Folder data structure', () => {
    it('should have folders array in response', () => {
      expect(mockFoldersResponse.folders).toBeDefined();
      expect(Array.isArray(mockFoldersResponse.folders)).toBe(true);
      expect(mockFoldersResponse.folders).toHaveLength(2);
    });

    it('should validate folder has required properties', () => {
      expect(mockFolder1).toHaveProperty('id');
      expect(mockFolder1).toHaveProperty('name');
      expect(mockFolder1).toHaveProperty('orderindex');
      expect(mockFolder1).toHaveProperty('hidden');
      expect(mockFolder1).toHaveProperty('task_count');
    });

    it('should validate folder space reference', () => {
      expect(mockFolder1.space).toHaveProperty('id');
      expect(mockFolder1.space).toHaveProperty('name');
    });

    it('should validate override_statuses property', () => {
      expect(typeof mockFolder1.override_statuses).toBe('boolean');
      expect(mockFolder1.override_statuses).toBe(false);
      expect(mockFolder2.override_statuses).toBe(true);
    });

    it('should have correct folder names', () => {
      expect(mockFolder1.name).toBe('Sprint 1');
      expect(mockFolder2.name).toBe('Sprint 2');
    });
  });

  describe('formatFolderMarkdown', () => {
    it('should format folder with basic info', () => {
      const markdown = formatFolderMarkdown(mockFolder1);

      expect(markdown).toContain('Sprint 1');
      expect(markdown).toContain(mockFolder1.id);
      expect(markdown).toContain('Tasks**: 25');
    });

    it('should show hidden status correctly', () => {
      const markdown = formatFolderMarkdown(mockFolder1);
      expect(markdown).toContain('Hidden**: No');

      const hiddenFolder = { ...mockFolder1, hidden: true };
      const hiddenMarkdown = formatFolderMarkdown(hiddenFolder);
      expect(hiddenMarkdown).toContain('Hidden**: Yes');
    });

    it('should include space information', () => {
      const markdown = formatFolderMarkdown(mockFolder1);

      expect(markdown).toContain('Space**: Product Development');
    });

    it('should include lists when available', () => {
      const folderWithLists = {
        ...mockFolder1,
        lists: [
          { id: 'list_001', name: 'Backlog', task_count: 10, orderindex: 0, archived: false },
          { id: 'list_002', name: 'In Progress', task_count: 5, orderindex: 1, archived: false }
        ]
      };
      const markdown = formatFolderMarkdown(folderWithLists as any);

      expect(markdown).toContain('Lists');
      expect(markdown).toContain('Backlog');
      expect(markdown).toContain('In Progress');
    });

    it('should handle folder without lists', () => {
      const folderNoLists = { ...mockFolder1, lists: undefined };
      const markdown = formatFolderMarkdown(folderNoLists);

      expect(markdown).toContain('Sprint 1');
      expect(markdown).not.toContain('## Lists');
    });
  });

  describe('Error handling for folders', () => {
    it('should handle 404 not found for invalid space_id', () => {
      const error = createAxiosError(404, 'Space not found');
      const message = handleApiError(error);

      expect(message).toContain('Resource not found');
    });

    it('should handle 400 bad request', () => {
      const error = createAxiosError(400, 'Invalid space ID format');
      const message = handleApiError(error);

      expect(message).toContain('Bad request');
    });

    it('should handle 403 permission denied', () => {
      const error = createAxiosError(403, 'Access denied');
      const message = handleApiError(error);

      expect(message).toContain('Permission denied');
    });
  });
});
