/**
 * @file utils.test.ts
 * @description Tests for utility functions in ClickUp MCP server.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AxiosError } from 'axios';
import { mockTask1, generateMockTasks } from './mocks.js';

// Set test environment
process.env.CLICKUP_API_TOKEN = 'pk_test_token_for_testing';

// Import after setting env
import {
  getApiToken,
  handleApiError,
  formatDate,
  formatPriority,
  truncateResponse,
  formatTruncationInfo,
  escapeCSV,
  normalizePhoneToE164,
  taskToCSVRow
} from '../../utils.js';
import { CHARACTER_LIMIT } from '../../constants.js';

/**
 * Creates a mock AxiosError for testing error handling.
 */
function createAxiosError(status: number, message: string, code?: string): AxiosError {
  const error = new AxiosError(
    message,
    code || 'ERR_BAD_REQUEST',
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

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApiToken', () => {
    it('should return API token from environment', () => {
      const token = getApiToken();
      expect(token).toBe('pk_test_token_for_testing');
    });

    it('should throw error if token not set', () => {
      const originalToken = process.env.CLICKUP_API_TOKEN;
      delete process.env.CLICKUP_API_TOKEN;

      expect(() => getApiToken()).toThrow('CLICKUP_API_TOKEN');

      process.env.CLICKUP_API_TOKEN = originalToken;
    });
  });

  describe('formatDate', () => {
    it('should format timestamp correctly', () => {
      const timestamp = '1609459200000'; // 2021-01-01 00:00:00 UTC
      const formatted = formatDate(timestamp);

      expect(formatted).toContain('2021-01-01');
      expect(formatted).toContain('UTC');
    });

    it('should handle number timestamp', () => {
      const timestamp = 1609459200000;
      const formatted = formatDate(timestamp);

      expect(formatted).toContain('2021-01-01');
    });

    it('should return "Not set" for undefined', () => {
      expect(formatDate(undefined)).toBe('Not set');
    });

    it('should return "Not set" for empty string', () => {
      expect(formatDate('')).toBe('Not set');
    });

    it('should return "Not set" for 0', () => {
      expect(formatDate(0)).toBe('Not set');
    });

    it('should format recent date correctly', () => {
      const timestamp = '1703980800000'; // 2023-12-31
      const formatted = formatDate(timestamp);

      expect(formatted).toContain('2023-12-31');
    });
  });

  describe('formatPriority', () => {
    it('should format priority object', () => {
      const priority = { priority: 'high', color: '#f9d900' };
      expect(formatPriority(priority)).toBe('high');
    });

    it('should return "None" for undefined', () => {
      expect(formatPriority(undefined)).toBe('None');
    });

    it('should format various priorities', () => {
      expect(formatPriority({ priority: 'urgent', color: '#f00' })).toBe('urgent');
      expect(formatPriority({ priority: 'normal', color: '#00f' })).toBe('normal');
      expect(formatPriority({ priority: 'low', color: '#0f0' })).toBe('low');
    });
  });

  describe('truncateResponse', () => {
    it('should not truncate short content', () => {
      const content = 'Short content';
      const result = truncateResponse(content, 1, 'items');

      expect(result.truncation).toBeNull();
      expect(result.content).toBe(content);
    });

    it('should return content unchanged when under limit', () => {
      const content = 'A'.repeat(1000);
      const result = truncateResponse(content, 10, 'items');

      expect(result.truncation).toBeNull();
      expect(result.content).toBe(content);
    });

    it('should truncate content over limit', () => {
      const items = Array(1000).fill({ name: 'Item', description: 'A'.repeat(200) });
      const content = JSON.stringify({ tasks: items }, null, 2);
      
      if (content.length > CHARACTER_LIMIT) {
        const result = truncateResponse(content, items.length, 'tasks');
        expect(result.content.length).toBeLessThanOrEqual(CHARACTER_LIMIT);
      }
    });
  });

  describe('formatTruncationInfo', () => {
    it('should return empty string for null', () => {
      expect(formatTruncationInfo(null)).toBe('');
    });

    it('should format truncation message', () => {
      const truncation = {
        truncated: true,
        original_count: 100,
        returned_count: 42,
        truncation_message: 'Response truncated from 100 to 42 tasks'
      };
      const result = formatTruncationInfo(truncation);

      expect(result).toContain('⚠️');
      expect(result).toContain('truncated');
    });
  });

  describe('escapeCSV', () => {
    it('should return empty string for null', () => {
      expect(escapeCSV(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(escapeCSV(undefined)).toBe('');
    });

    it('should handle simple strings', () => {
      expect(escapeCSV('Hello')).toBe('Hello');
    });

    it('should wrap strings with commas in quotes', () => {
      expect(escapeCSV('Hello, World')).toBe('"Hello, World"');
    });

    it('should escape quotes', () => {
      expect(escapeCSV('Say "Hello"')).toBe('"Say ""Hello"""');
    });

    it('should handle newlines', () => {
      expect(escapeCSV('Line1\nLine2')).toBe('"Line1\nLine2"');
    });

    it('should handle numbers', () => {
      expect(escapeCSV(42)).toBe('42');
      expect(escapeCSV(3.14)).toBe('3.14');
    });

    it('should handle booleans', () => {
      expect(escapeCSV(true)).toBe('true');
      expect(escapeCSV(false)).toBe('false');
    });

    it('should handle mixed special characters', () => {
      expect(escapeCSV('Test, with "quotes" and\nnewlines')).toBe('"Test, with ""quotes"" and\nnewlines"');
    });
  });

  describe('normalizePhoneToE164', () => {
    it('should normalize phone with spaces', () => {
      expect(normalizePhoneToE164('+1 412 481 2210')).toBe('+14124812210');
    });

    it('should normalize phone with dots', () => {
      expect(normalizePhoneToE164('817.527.9708')).toBe('+18175279708');
    });

    it('should normalize phone with parentheses and dashes', () => {
      expect(normalizePhoneToE164('(623) 258-3673')).toBe('+16232583673');
    });

    it('should remove extensions with x', () => {
      expect(normalizePhoneToE164('518-434-8128 x206')).toBe('+15184348128');
    });

    it('should remove extensions with ext', () => {
      expect(normalizePhoneToE164('4124812210 ext 123')).toBe('+14124812210');
    });

    it('should remove extensions with extension', () => {
      expect(normalizePhoneToE164('3025306667 extension 456')).toBe('+13025306667');
    });

    it('should add country code for 10-digit numbers', () => {
      expect(normalizePhoneToE164('4124812210')).toBe('+14124812210');
    });

    it('should preserve existing country code with +', () => {
      expect(normalizePhoneToE164('+14124812210')).toBe('+14124812210');
    });

    it('should handle country code without +', () => {
      expect(normalizePhoneToE164('14124812210')).toBe('+14124812210');
    });

    it('should handle international UK numbers', () => {
      expect(normalizePhoneToE164('+44.1922.722723')).toBe('+441922722723');
    });

    it('should return empty for null', () => {
      expect(normalizePhoneToE164(null)).toBe('');
    });

    it('should return empty for undefined', () => {
      expect(normalizePhoneToE164(undefined)).toBe('');
    });

    it('should return empty for empty string', () => {
      expect(normalizePhoneToE164('')).toBe('');
    });

    it('should return empty for too short numbers', () => {
      expect(normalizePhoneToE164('123')).toBe('');
    });

    it('should return empty for numbers starting with 0', () => {
      expect(normalizePhoneToE164('0123456789')).toBe('');
    });

    it('should return empty for too long numbers', () => {
      expect(normalizePhoneToE164('12345678901234567')).toBe('');
    });
  });

  describe('taskToCSVRow', () => {
    it('should extract Task ID', () => {
      const row = taskToCSVRow(mockTask1, ['Task ID']);
      expect(row[0]).toBe('task_001');
    });

    it('should extract Name', () => {
      const row = taskToCSVRow(mockTask1, ['Name']);
      expect(row[0]).toBe('Implement user authentication');
    });

    it('should extract Status', () => {
      const row = taskToCSVRow(mockTask1, ['Status']);
      expect(row[0]).toBe('in progress');
    });

    it('should extract multiple fields', () => {
      const row = taskToCSVRow(mockTask1, ['Task ID', 'Name', 'Status']);
      expect(row).toHaveLength(3);
      expect(row[0]).toBe('task_001');
      expect(row[1]).toBe('Implement user authentication');
      expect(row[2]).toBe('in progress');
    });

    it('should extract custom fields', () => {
      const row = taskToCSVRow(mockTask1, ['Email', 'Story Points']);
      expect(row[0]).toBe('test@example.com');
      expect(row[1]).toBe('5');
    });

    it('should handle missing fields', () => {
      const row = taskToCSVRow(mockTask1, ['NonExistent']);
      expect(row[0]).toBe('');
    });

    it('should format assignees', () => {
      const row = taskToCSVRow(mockTask1, ['Assignees']);
      expect(row[0]).toContain('john_doe');
      expect(row[0]).toContain('jane_smith');
    });

    it('should escape special characters', () => {
      const taskWithComma = { ...mockTask1, name: 'Task with, comma' };
      const row = taskToCSVRow(taskWithComma, ['Name']);
      expect(row[0]).toBe('"Task with, comma"');
    });
  });

  describe('handleApiError', () => {
    it('should handle 400 Bad Request', () => {
      const error = createAxiosError(400, 'Invalid parameters');
      expect(handleApiError(error)).toContain('Bad request');
    });

    it('should handle 401 Unauthorized', () => {
      const error = createAxiosError(401, 'Invalid token');
      expect(handleApiError(error)).toContain('Invalid or missing API token');
    });

    it('should handle 403 Forbidden', () => {
      const error = createAxiosError(403, 'Access denied');
      expect(handleApiError(error)).toContain('Permission denied');
    });

    it('should handle 404 Not Found', () => {
      const error = createAxiosError(404, 'Resource not found');
      expect(handleApiError(error)).toContain('Resource not found');
    });

    it('should handle 429 Rate Limit', () => {
      const error = createAxiosError(429, 'Too many requests');
      expect(handleApiError(error)).toContain('Rate limit exceeded');
    });

    it('should handle 500 Server Error', () => {
      const error = createAxiosError(500, 'Server error');
      expect(handleApiError(error)).toContain('ClickUp server error');
    });

    it('should handle 502 Bad Gateway', () => {
      const error = createAxiosError(502, 'Bad gateway');
      expect(handleApiError(error)).toContain('ClickUp server error');
    });

    it('should handle 503 Service Unavailable', () => {
      const error = createAxiosError(503, 'Service unavailable');
      expect(handleApiError(error)).toContain('ClickUp server error');
    });

    it('should handle timeout errors', () => {
      const error = new AxiosError('Timeout', 'ECONNABORTED');
      expect(handleApiError(error)).toContain('timed out');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      expect(handleApiError(error)).toContain('Unexpected error');
    });

    it('should handle non-Error objects', () => {
      expect(handleApiError('String error')).toContain('Unexpected error');
    });
  });

  describe('generateMockTasks helper', () => {
    it('should generate specified number of tasks', () => {
      const tasks = generateMockTasks(5);
      expect(tasks).toHaveLength(5);
    });

    it('should generate unique task IDs', () => {
      const tasks = generateMockTasks(3);
      const ids = tasks.map(t => t.id);
      expect(new Set(ids).size).toBe(3);
    });

    it('should start from specified index', () => {
      const tasks = generateMockTasks(3, 10);
      expect(tasks[0].id).toBe('task_11');
      expect(tasks[1].id).toBe('task_12');
      expect(tasks[2].id).toBe('task_13');
    });

    it('should use unique names', () => {
      const tasks = generateMockTasks(3);
      expect(tasks[0].name).toBe('Task 1');
      expect(tasks[1].name).toBe('Task 2');
      expect(tasks[2].name).toBe('Task 3');
    });
  });
});
