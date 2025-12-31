/**
 * @file comments.test.ts
 * @description Tests for ClickUp comments tool functionality.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AxiosError } from 'axios';
import { mockCommentsResponse, mockComment1, mockComment2 } from './mocks.js';
import { handleApiError, formatCommentMarkdown } from '../../utils.js';

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

describe('Comments Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Comment data structure', () => {
    it('should have comments array in response', () => {
      expect(mockCommentsResponse.comments).toBeDefined();
      expect(Array.isArray(mockCommentsResponse.comments)).toBe(true);
      expect(mockCommentsResponse.comments).toHaveLength(2);
    });

    it('should validate comment has required properties', () => {
      expect(mockComment1).toHaveProperty('id');
      expect(mockComment1).toHaveProperty('comment_text');
      expect(mockComment1).toHaveProperty('user');
      expect(mockComment1).toHaveProperty('date');
    });

    it('should validate user structure', () => {
      expect(mockComment1.user).toHaveProperty('id');
      expect(mockComment1.user).toHaveProperty('username');
    });

    it('should validate resolved is boolean', () => {
      expect(typeof mockComment1.resolved).toBe('boolean');
      expect(mockComment1.resolved).toBe(false);
      expect(mockComment2.resolved).toBe(true);
    });

    it('should validate comment array structure', () => {
      expect(Array.isArray(mockComment1.comment)).toBe(true);
      expect(mockComment1.comment[0]).toHaveProperty('text');
    });
  });

  describe('formatCommentMarkdown', () => {
    it('should format comment with author and date', () => {
      const markdown = formatCommentMarkdown(mockComment1);

      expect(markdown).toContain('@john_doe');
      expect(markdown).toContain('Great progress on this task!');
    });

    it('should show resolved status', () => {
      const markdown = formatCommentMarkdown(mockComment2);

      expect(markdown).toContain('(Resolved)');
    });

    it('should not show resolved for unresolved comments', () => {
      const markdown = formatCommentMarkdown(mockComment1);

      expect(markdown).not.toContain('(Resolved)');
    });

    it('should format date correctly', () => {
      const markdown = formatCommentMarkdown(mockComment1);

      // Date should be formatted
      expect(markdown).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should include comment text', () => {
      const markdown = formatCommentMarkdown(mockComment2);

      expect(markdown).toContain('Need more details on the implementation');
    });
  });

  describe('Error handling for comments', () => {
    it('should handle 404 for invalid task_id', () => {
      const error = createAxiosError(404, 'Task not found');
      const message = handleApiError(error);

      expect(message).toContain('Resource not found');
    });

    it('should handle 403 for permission denied', () => {
      const error = createAxiosError(403, 'Cannot add comment');
      const message = handleApiError(error);

      expect(message).toContain('Permission denied');
    });

    it('should handle 400 bad request', () => {
      const error = createAxiosError(400, 'Invalid comment');
      const message = handleApiError(error);

      expect(message).toContain('Bad request');
    });
  });

  describe('Comment edge cases', () => {
    it('should handle empty comment text', () => {
      const emptyComment = { ...mockComment1, comment_text: '' };
      const markdown = formatCommentMarkdown(emptyComment);

      expect(markdown).toContain('@john_doe');
    });

    it('should handle comment with special characters', () => {
      const specialComment = {
        ...mockComment1,
        comment_text: 'Comment with "quotes" and <html> & special chars'
      };
      const markdown = formatCommentMarkdown(specialComment);

      expect(markdown).toContain('Comment with "quotes"');
    });

    it('should handle comment with markdown', () => {
      const mdComment = {
        ...mockComment1,
        comment_text: '**Bold** and *italic* text with `code`'
      };
      const markdown = formatCommentMarkdown(mdComment);

      expect(markdown).toContain('**Bold**');
      expect(markdown).toContain('*italic*');
    });

    it('should handle multiline comments', () => {
      const multilineComment = {
        ...mockComment1,
        comment_text: 'Line 1\nLine 2\nLine 3'
      };
      const markdown = formatCommentMarkdown(multilineComment);

      expect(markdown).toContain('Line 1');
      expect(markdown).toContain('Line 2');
    });

    it('should preserve user info for various users', () => {
      const comment = { ...mockComment2, user: { id: 999, username: 'different_user' } };
      const markdown = formatCommentMarkdown(comment);

      expect(markdown).toContain('@different_user');
    });
  });
});
