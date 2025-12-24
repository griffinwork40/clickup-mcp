/**
 * Comprehensive tests for utility functions in utils.ts
 * 
 * Tests cover:
 * - API token retrieval
 * - Error handling
 * - Formatting functions
 * - Pagination logic
 * - Task filtering
 * - CSV export utilities
 * - Phone number normalization
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  getApiToken,
  handleApiError,
  formatDate,
  formatPriority,
  formatTaskMarkdown,
  formatTaskCompact,
  formatListMarkdown,
  formatSpaceMarkdown,
  formatFolderMarkdown,
  formatCommentMarkdown,
  formatTimeEntryMarkdown,
  getPagination,
  generateTaskSummary,
  truncateResponse,
  formatTruncationInfo,
  filterTasksByStatus,
  escapeCSV,
  normalizePhoneToE164,
  extractCustomFieldValue,
  getCustomField,
  taskToCSVRow
} from '../utils.js';
import type {
  ClickUpTask,
  ClickUpList,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpComment,
  ClickUpTimeEntry,
  ClickUpCustomField,
  TruncationInfo
} from '../types.js';

// Store original env
const originalEnv = process.env;

describe('Utils Module', () => {
  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ==========================================================================
  // API Token Tests
  // ==========================================================================
  describe('getApiToken', () => {
    it('should return token when CLICKUP_API_TOKEN is set', () => {
      process.env.CLICKUP_API_TOKEN = 'pk_test_token_123';
      expect(getApiToken()).toBe('pk_test_token_123');
    });

    it('should throw error when CLICKUP_API_TOKEN is not set', () => {
      delete process.env.CLICKUP_API_TOKEN;
      expect(() => getApiToken()).toThrow('CLICKUP_API_TOKEN environment variable is required');
    });

    it('should throw error when CLICKUP_API_TOKEN is empty string', () => {
      process.env.CLICKUP_API_TOKEN = '';
      expect(() => getApiToken()).toThrow('CLICKUP_API_TOKEN environment variable is required');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================
  describe('handleApiError', () => {
    it('should handle 400 Bad Request', () => {
      const error = createAxiosError(400, { err: 'Invalid status' });
      const result = handleApiError(error);
      expect(result).toContain('Bad request');
      expect(result).toContain('Invalid status');
    });

    it('should handle 401 Unauthorized', () => {
      const error = createAxiosError(401);
      const result = handleApiError(error);
      expect(result).toContain('Invalid or missing API token');
    });

    it('should handle 403 Forbidden', () => {
      const error = createAxiosError(403);
      const result = handleApiError(error);
      expect(result).toContain('Permission denied');
    });

    it('should handle 404 Not Found', () => {
      const error = createAxiosError(404, { err: 'Task not found' });
      const result = handleApiError(error);
      expect(result).toContain('Resource not found');
      expect(result).toContain('Task not found');
    });

    it('should handle 429 Rate Limit', () => {
      const error = createAxiosError(429);
      const result = handleApiError(error);
      expect(result).toContain('Rate limit exceeded');
    });

    it('should handle 500 Server Error', () => {
      const error = createAxiosError(500);
      const result = handleApiError(error);
      expect(result).toContain('ClickUp server error');
    });

    it('should handle 502 Bad Gateway', () => {
      const error = createAxiosError(502);
      const result = handleApiError(error);
      expect(result).toContain('ClickUp server error');
    });

    it('should handle 503 Service Unavailable', () => {
      const error = createAxiosError(503);
      const result = handleApiError(error);
      expect(result).toContain('ClickUp server error');
    });

    it('should handle timeout error', () => {
      const config = { headers: new AxiosHeaders() };
      const error = new AxiosError('timeout', 'ECONNABORTED', config as any);
      const result = handleApiError(error);
      expect(result).toContain('Request timed out');
    });

    it('should handle connection refused error', () => {
      const config = { headers: new AxiosHeaders() };
      const error = new AxiosError('connection refused', 'ECONNREFUSED', config as any);
      const result = handleApiError(error);
      expect(result).toContain('Cannot connect to ClickUp API');
    });

    it('should handle DNS resolution error', () => {
      const config = { headers: new AxiosHeaders() };
      const error = new AxiosError('DNS error', 'ENOTFOUND', config as any);
      const result = handleApiError(error);
      expect(result).toContain('Cannot connect to ClickUp API');
    });

    it('should handle unknown error status', () => {
      const error = createAxiosError(418, { err: "I'm a teapot" });
      const result = handleApiError(error);
      expect(result).toContain('API request failed with status 418');
    });

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');
      const result = handleApiError(error);
      expect(result).toContain('Unexpected error');
      expect(result).toContain('Something went wrong');
    });

    it('should handle non-Error objects', () => {
      const result = handleApiError('string error');
      expect(result).toContain('Unexpected error');
      expect(result).toContain('string error');
    });

    it('should handle null/undefined', () => {
      const result = handleApiError(null);
      expect(result).toContain('Unexpected error');
    });
  });

  // ==========================================================================
  // Formatting Functions Tests
  // ==========================================================================
  describe('formatDate', () => {
    it('should format timestamp as date string', () => {
      const timestamp = '1703318400000'; // Dec 23, 2023 12:00:00 UTC
      const result = formatDate(timestamp);
      expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/);
    });

    it('should handle numeric timestamp', () => {
      const timestamp = 1703318400000;
      const result = formatDate(timestamp);
      expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/);
    });

    it('should return "Not set" for undefined', () => {
      expect(formatDate(undefined)).toBe('Not set');
    });

    it('should return "Not set" for empty string', () => {
      expect(formatDate('')).toBe('Not set');
    });
  });

  describe('formatPriority', () => {
    it('should format priority object', () => {
      const priority = { priority: 'high', color: '#ff0000' };
      expect(formatPriority(priority)).toBe('high');
    });

    it('should return "None" for undefined priority', () => {
      expect(formatPriority(undefined)).toBe('None');
    });
  });

  describe('formatTaskMarkdown', () => {
    it('should format task with all fields', () => {
      const task = createMockTask({
        id: 'task123',
        name: 'Test Task',
        status: { status: 'in progress', color: '#00ff00', orderindex: 1, type: 'custom' },
        priority: { id: '2', priority: 'high', color: '#ff0000', orderindex: '2' },
        assignees: [{ id: 1, username: 'john' }],
        tags: [{ name: 'bug' }],
        description: 'Task description here',
        due_date: '1703318400000',
        url: 'https://app.clickup.com/t/task123'
      });

      const result = formatTaskMarkdown(task);

      expect(result).toContain('# Test Task (task123)');
      expect(result).toContain('**Status**: in progress');
      expect(result).toContain('**Priority**: high');
      expect(result).toContain('**Assignees**: @john (1)');
      expect(result).toContain('**Tags**: bug');
      expect(result).toContain('## Description');
      expect(result).toContain('Task description here');
      expect(result).toContain('**URL**: https://app.clickup.com/t/task123');
    });

    it('should handle task with minimal fields', () => {
      const task = createMockTask({
        id: 'task456',
        name: 'Minimal Task',
        status: { status: 'open', color: '#ccc', orderindex: 0, type: 'open' }
      });

      const result = formatTaskMarkdown(task);

      expect(result).toContain('# Minimal Task (task456)');
      expect(result).toContain('**Status**: open');
      expect(result).toContain('**Priority**: None');
    });

    it('should format multiple assignees', () => {
      const task = createMockTask({
        assignees: [
          { id: 1, username: 'john' },
          { id: 2, username: 'jane' }
        ]
      });

      const result = formatTaskMarkdown(task);
      expect(result).toContain('@john (1), @jane (2)');
    });

    it('should format multiple tags', () => {
      const task = createMockTask({
        tags: [{ name: 'bug' }, { name: 'urgent' }, { name: 'frontend' }]
      });

      const result = formatTaskMarkdown(task);
      expect(result).toContain('bug, urgent, frontend');
    });
  });

  describe('formatTaskCompact', () => {
    it('should format task in compact format', () => {
      const task = createMockTask({
        id: 'task123',
        name: 'Compact Task',
        status: { status: 'done', color: '#00ff00', orderindex: 2, type: 'closed' },
        assignees: [{ id: 1, username: 'john' }],
        url: 'https://app.clickup.com/t/task123'
      });

      const result = formatTaskCompact(task);

      expect(result).toContain('**Compact Task**');
      expect(result).toContain('task123');
      expect(result).toContain('Status: done');
      expect(result).toContain('Assignees: john');
      expect(result).toContain('URL:');
    });

    it('should show Unassigned for tasks without assignees', () => {
      const task = createMockTask({ assignees: [] });
      const result = formatTaskCompact(task);
      expect(result).toContain('Unassigned');
    });
  });

  describe('formatListMarkdown', () => {
    it('should format list with all fields', () => {
      const list: ClickUpList = {
        id: 'list123',
        name: 'Test List',
        orderindex: 0,
        task_count: 42,
        archived: false,
        folder: { id: 'folder1', name: 'My Folder', hidden: false, access: true },
        space: { id: 'space1', name: 'My Space', access: true },
        statuses: [
          { status: 'to do', orderindex: 0, color: '#ccc', type: 'open' },
          { status: 'done', orderindex: 1, color: '#00ff00', type: 'closed' }
        ]
      };

      const result = formatListMarkdown(list);

      expect(result).toContain('# Test List (list123)');
      expect(result).toContain('**Tasks**: 42');
      expect(result).toContain('**Folder**: My Folder');
      expect(result).toContain('**Space**: My Space');
      expect(result).toContain('## Statuses');
      expect(result).toContain('- to do (open)');
      expect(result).toContain('- done (closed)');
    });

    it('should handle list without folder and space', () => {
      const list: ClickUpList = {
        id: 'list456',
        name: 'Simple List',
        orderindex: 0,
        task_count: 10,
        archived: false
      };

      const result = formatListMarkdown(list);
      expect(result).toContain('# Simple List (list456)');
      expect(result).not.toContain('**Folder**');
      expect(result).not.toContain('**Space**');
    });
  });

  describe('formatSpaceMarkdown', () => {
    it('should format space with all features', () => {
      const space: ClickUpSpace = {
        id: 'space123',
        name: 'Test Space',
        private: true,
        multiple_assignees: true,
        features: {
          due_dates: { enabled: true },
          time_tracking: { enabled: true },
          tags: { enabled: true },
          time_estimates: { enabled: false },
          checklists: { enabled: true },
          custom_fields: { enabled: true },
          remap_dependencies: { enabled: false },
          dependency_warning: { enabled: false },
          portfolios: { enabled: false }
        }
      };

      const result = formatSpaceMarkdown(space);

      expect(result).toContain('# Test Space (space123)');
      expect(result).toContain('**Private**: Yes');
      expect(result).toContain('**Multiple Assignees**: Yes');
      expect(result).toContain('## Features');
      expect(result).toContain('Due Dates: Enabled');
      expect(result).toContain('Time Tracking: Enabled');
    });

    it('should handle space without features', () => {
      const space: ClickUpSpace = {
        id: 'space456',
        name: 'Simple Space',
        private: false,
        multiple_assignees: false
      };

      const result = formatSpaceMarkdown(space);
      expect(result).toContain('# Simple Space (space456)');
      expect(result).not.toContain('## Features');
    });
  });

  describe('formatFolderMarkdown', () => {
    it('should format folder with lists', () => {
      const folder: ClickUpFolder = {
        id: 'folder123',
        name: 'Test Folder',
        orderindex: 0,
        override_statuses: false,
        hidden: false,
        space: { id: 'space1', name: 'My Space' },
        task_count: '25',
        lists: [
          { id: 'list1', name: 'List 1', task_count: 10, orderindex: 0, archived: false },
          { id: 'list2', name: 'List 2', task_count: 15, orderindex: 1, archived: false }
        ]
      };

      const result = formatFolderMarkdown(folder);

      expect(result).toContain('# Test Folder (folder123)');
      expect(result).toContain('**Tasks**: 25');
      expect(result).toContain('**Hidden**: No');
      expect(result).toContain('**Space**: My Space');
      expect(result).toContain('## Lists');
      expect(result).toContain('- List 1 (list1) - 10 tasks');
      expect(result).toContain('- List 2 (list2) - 15 tasks');
    });

    it('should handle hidden folder without lists', () => {
      const folder: ClickUpFolder = {
        id: 'folder456',
        name: 'Hidden Folder',
        orderindex: 0,
        override_statuses: false,
        hidden: true,
        space: { id: 'space1', name: 'My Space' },
        task_count: '0'
      };

      const result = formatFolderMarkdown(folder);
      expect(result).toContain('**Hidden**: Yes');
      expect(result).not.toContain('## Lists');
    });
  });

  describe('formatCommentMarkdown', () => {
    it('should format comment', () => {
      const comment: ClickUpComment = {
        id: 'comment123',
        comment: [{ text: 'Great work!' }],
        comment_text: 'Great work!',
        user: { id: 1, username: 'john' },
        date: '1703318400000'
      };

      const result = formatCommentMarkdown(comment);

      expect(result).toContain('**@john**');
      expect(result).toContain('Great work!');
    });

    it('should show resolved status', () => {
      const comment: ClickUpComment = {
        id: 'comment456',
        comment: [{ text: 'Fixed' }],
        comment_text: 'Fixed',
        user: { id: 1, username: 'jane' },
        date: '1703318400000',
        resolved: true
      };

      const result = formatCommentMarkdown(comment);
      expect(result).toContain('*(Resolved)*');
    });
  });

  describe('formatTimeEntryMarkdown', () => {
    it('should format time entry', () => {
      const entry: ClickUpTimeEntry = {
        id: 'entry123',
        user: { id: 1, username: 'john' },
        billable: true,
        start: '1703318400000',
        end: '1703322000000',
        duration: '3600000', // 1 hour
        task: { id: 'task1', name: 'My Task' },
        description: 'Working on feature'
      };

      const result = formatTimeEntryMarkdown(entry);

      expect(result).toContain('**@john**');
      expect(result).toContain('1h 0m');
      expect(result).toContain('Task: My Task');
      expect(result).toContain('Description: Working on feature');
      expect(result).toContain('Billable: Yes');
    });

    it('should show running entry', () => {
      const entry: ClickUpTimeEntry = {
        id: 'entry456',
        user: { id: 1, username: 'jane' },
        billable: false,
        start: '1703318400000',
        duration: '1800000' // 30 minutes
      };

      const result = formatTimeEntryMarkdown(entry);
      expect(result).toContain('*(Still running)*');
      expect(result).toContain('Billable: No');
    });
  });

  // ==========================================================================
  // Pagination Tests
  // ==========================================================================
  describe('getPagination', () => {
    it('should calculate pagination with known total', () => {
      const result = getPagination(100, 20, 0, 20);

      expect(result).toEqual({
        total: 100,
        count: 20,
        offset: 0,
        has_more: true,
        next_offset: 20
      });
    });

    it('should detect no more results', () => {
      const result = getPagination(50, 10, 40, 20);

      expect(result.has_more).toBe(false);
      expect(result.next_offset).toBeUndefined();
    });

    it('should handle unknown total', () => {
      const result = getPagination(undefined, 20, 0, 20);

      expect(result.total).toBeUndefined();
      expect(result.has_more).toBe(true);
      expect(result.next_offset).toBe(20);
    });

    it('should detect last page when count less than limit', () => {
      const result = getPagination(undefined, 15, 20, 20);

      expect(result.has_more).toBe(false);
      expect(result.next_offset).toBeUndefined();
    });
  });

  // ==========================================================================
  // Task Summary Tests
  // ==========================================================================
  describe('generateTaskSummary', () => {
    it('should generate summary with status breakdown', () => {
      const tasks = [
        createMockTask({ status: { status: 'to do', color: '#ccc', orderindex: 0, type: 'open' } }),
        createMockTask({ status: { status: 'to do', color: '#ccc', orderindex: 0, type: 'open' } }),
        createMockTask({ status: { status: 'done', color: '#00ff00', orderindex: 1, type: 'closed' } })
      ];

      const result = generateTaskSummary(tasks);

      expect(result).toContain('# Task Summary');
      expect(result).toContain('**Total Tasks**: 3');
      expect(result).toContain('## By Status');
      expect(result).toContain('to do: 2');
      expect(result).toContain('done: 1');
    });

    it('should generate summary with assignee breakdown', () => {
      const tasks = [
        createMockTask({ assignees: [{ id: 1, username: 'john' }] }),
        createMockTask({ assignees: [{ id: 1, username: 'john' }] }),
        createMockTask({ assignees: [] })
      ];

      const result = generateTaskSummary(tasks);

      expect(result).toContain('## By Assignee');
      expect(result).toContain('john: 2');
      expect(result).toContain('Unassigned: 1');
    });

    it('should generate summary with priority breakdown', () => {
      const tasks = [
        createMockTask({ priority: { id: '1', priority: 'urgent', color: '#f00', orderindex: '1' } }),
        createMockTask({ priority: { id: '2', priority: 'high', color: '#ff0', orderindex: '2' } }),
        createMockTask({ priority: undefined })
      ];

      const result = generateTaskSummary(tasks);

      expect(result).toContain('## By Priority');
      expect(result).toContain('urgent: 1');
      expect(result).toContain('high: 1');
      expect(result).toContain('None: 1');
    });

    it('should handle empty task list', () => {
      const result = generateTaskSummary([]);

      expect(result).toContain('**Total Tasks**: 0');
    });
  });

  // ==========================================================================
  // Truncation Tests
  // ==========================================================================
  describe('truncateResponse', () => {
    it('should not truncate content under limit', () => {
      const content = 'Short content';
      const { content: result, truncation } = truncateResponse(content, 1, 'items');

      expect(result).toBe(content);
      expect(truncation).toBeNull();
    });

    it('should truncate markdown content over limit', () => {
      const longContent = 'a'.repeat(150000);
      const { content: result, truncation } = truncateResponse(longContent, 10, 'items');

      expect(result.length).toBeLessThanOrEqual(100000);
      expect(truncation).not.toBeNull();
      expect(truncation?.truncated).toBe(true);
    });

    it('should truncate JSON content by removing items', () => {
      // Create content that definitely exceeds 100k characters
      const items = Array(300).fill(null).map((_, i) => ({
        id: `task_${i}`,
        name: `Task with a somewhat longer name number ${i}`,
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20) + 'a'.repeat(200)
      }));
      const jsonContent = JSON.stringify({ tasks: items }, null, 2);
      
      // Verify we've created content over the limit
      expect(jsonContent.length).toBeGreaterThan(100000);
      
      // The truncateResponse function handles both JSON and markdown
      // For JSON, it will try to reduce items to fit under limit
      const { content: result, truncation } = truncateResponse(jsonContent, 300, 'tasks');
      
      // Result should always be under or equal to limit
      expect(result.length).toBeLessThanOrEqual(100000);
      
      // If truncation occurred, verify the structure
      if (truncation) {
        expect(truncation.truncated).toBe(true);
      }
    });
  });

  describe('formatTruncationInfo', () => {
    it('should return empty string for null', () => {
      expect(formatTruncationInfo(null)).toBe('');
    });

    it('should format truncation message', () => {
      const truncation: TruncationInfo = {
        truncated: true,
        original_count: 100,
        returned_count: 50,
        truncation_message: 'Response truncated from 100 to 50 items'
      };

      const result = formatTruncationInfo(truncation);

      expect(result).toContain('---');
      expect(result).toContain('⚠️');
      expect(result).toContain('truncated');
    });
  });

  // ==========================================================================
  // Task Filtering Tests
  // ==========================================================================
  describe('filterTasksByStatus', () => {
    const tasks = [
      createMockTask({ status: { status: 'to do', color: '#ccc', orderindex: 0, type: 'open' } }),
      createMockTask({ status: { status: 'in progress', color: '#0ff', orderindex: 1, type: 'custom' } }),
      createMockTask({ status: { status: 'done', color: '#0f0', orderindex: 2, type: 'closed' } })
    ];

    it('should filter by single status', () => {
      const result = filterTasksByStatus(tasks, ['to do']);
      expect(result).toHaveLength(1);
      expect(result[0].status.status).toBe('to do');
    });

    it('should filter by multiple statuses', () => {
      const result = filterTasksByStatus(tasks, ['to do', 'done']);
      expect(result).toHaveLength(2);
    });

    it('should return all tasks for empty status array', () => {
      const result = filterTasksByStatus(tasks, []);
      expect(result).toHaveLength(3);
    });

    it('should return all tasks for undefined statuses', () => {
      const result = filterTasksByStatus(tasks, undefined as any);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no matches', () => {
      const result = filterTasksByStatus(tasks, ['nonexistent']);
      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // CSV Utilities Tests
  // ==========================================================================
  describe('escapeCSV', () => {
    it('should return value without escaping for simple strings', () => {
      expect(escapeCSV('simple')).toBe('simple');
    });

    it('should wrap value with commas in quotes', () => {
      expect(escapeCSV('hello, world')).toBe('"hello, world"');
    });

    it('should escape quotes by doubling them', () => {
      expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
    });

    it('should wrap value with newlines in quotes', () => {
      expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should handle null and undefined', () => {
      expect(escapeCSV(null)).toBe('');
      expect(escapeCSV(undefined)).toBe('');
    });

    it('should convert numbers to strings', () => {
      expect(escapeCSV(123)).toBe('123');
    });
  });

  describe('normalizePhoneToE164', () => {
    it('should normalize US phone with spaces', () => {
      expect(normalizePhoneToE164('+1 412 481 2210')).toBe('+14124812210');
    });

    it('should normalize phone with dots', () => {
      expect(normalizePhoneToE164('817.527.9708')).toBe('+18175279708');
    });

    it('should normalize phone with parentheses and dashes', () => {
      expect(normalizePhoneToE164('(623) 258-3673')).toBe('+16232583673');
    });

    it('should remove extensions', () => {
      expect(normalizePhoneToE164('518-434-8128 x206')).toBe('+15184348128');
      expect(normalizePhoneToE164('4124812210 ext 123')).toBe('+14124812210');
    });

    it('should add country code for 10-digit numbers', () => {
      expect(normalizePhoneToE164('4124812210')).toBe('+14124812210');
    });

    it('should preserve existing country code', () => {
      expect(normalizePhoneToE164('+14124812210')).toBe('+14124812210');
      expect(normalizePhoneToE164('14124812210')).toBe('+14124812210');
    });

    it('should handle international numbers', () => {
      expect(normalizePhoneToE164('+44.1922.722723')).toBe('+441922722723');
    });

    it('should return empty for invalid input', () => {
      expect(normalizePhoneToE164('')).toBe('');
      expect(normalizePhoneToE164(null)).toBe('');
      expect(normalizePhoneToE164(undefined)).toBe('');
      expect(normalizePhoneToE164('123')).toBe(''); // Too short
      expect(normalizePhoneToE164('0123456789')).toBe(''); // Starts with 0
    });
  });

  describe('extractCustomFieldValue', () => {
    it('should extract text field value', () => {
      const field: ClickUpCustomField = {
        id: '1',
        name: 'Company',
        type: 'text',
        value: 'Acme Corp'
      };
      expect(extractCustomFieldValue(field)).toBe('Acme Corp');
    });

    it('should extract email field value', () => {
      const field: ClickUpCustomField = {
        id: '2',
        name: 'Email',
        type: 'email',
        value: 'test@example.com'
      };
      expect(extractCustomFieldValue(field)).toBe('test@example.com');
    });

    it('should extract and normalize phone field', () => {
      const field: ClickUpCustomField = {
        id: '3',
        name: 'Phone',
        type: 'phone',
        value: '+1 412 481 2210'
      };
      expect(extractCustomFieldValue(field)).toBe('+14124812210');
    });

    it('should extract number field value', () => {
      const field: ClickUpCustomField = {
        id: '4',
        name: 'Count',
        type: 'number',
        value: 42
      };
      expect(extractCustomFieldValue(field)).toBe('42');
    });

    it('should extract date field value', () => {
      const field: ClickUpCustomField = {
        id: '5',
        name: 'Due',
        type: 'date',
        value: '1703318400000'
      };
      expect(extractCustomFieldValue(field)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract dropdown field value', () => {
      const field: ClickUpCustomField = {
        id: '6',
        name: 'Status',
        type: 'dropdown',
        value: { label: 'Active' }
      };
      expect(extractCustomFieldValue(field)).toBe('Active');
    });

    it('should extract checkbox field value', () => {
      const fieldTrue: ClickUpCustomField = {
        id: '7',
        name: 'Completed',
        type: 'checkbox',
        value: true
      };
      expect(extractCustomFieldValue(fieldTrue)).toBe('Yes');

      const fieldFalse: ClickUpCustomField = {
        id: '8',
        name: 'Completed',
        type: 'checkbox',
        value: false
      };
      expect(extractCustomFieldValue(fieldFalse)).toBe('No');
    });

    it('should extract labels field value', () => {
      const field: ClickUpCustomField = {
        id: '9',
        name: 'Labels',
        type: 'labels',
        value: [{ label: 'Bug' }, { label: 'Feature' }]
      };
      expect(extractCustomFieldValue(field)).toBe('Bug; Feature');
    });

    it('should return empty for null/undefined values', () => {
      const field: ClickUpCustomField = {
        id: '10',
        name: 'Empty',
        type: 'text',
        value: null
      };
      expect(extractCustomFieldValue(field)).toBe('');
    });

    it('should normalize text fields named "Phone"', () => {
      const field: ClickUpCustomField = {
        id: '11',
        name: 'Personal Phone',
        type: 'text',
        value: '(623) 258-3673'
      };
      expect(extractCustomFieldValue(field)).toBe('+16232583673');
    });
  });

  describe('getCustomField', () => {
    const task = createMockTask({
      custom_fields: [
        { id: '1', name: 'Email', type: 'email', value: 'test@example.com' },
        { id: '2', name: 'Phone', type: 'phone', value: '+14124812210' },
        { id: '3', name: 'Phone', type: 'text', value: null } // Duplicate name, no value
      ]
    });

    it('should get custom field by name', () => {
      expect(getCustomField(task, 'Email')).toBe('test@example.com');
    });

    it('should prefer field with value when duplicates exist', () => {
      expect(getCustomField(task, 'Phone')).toBe('+14124812210');
    });

    it('should return empty for non-existent field', () => {
      expect(getCustomField(task, 'NonExistent')).toBe('');
    });

    it('should return empty for task without custom fields', () => {
      const taskWithoutFields = createMockTask({ custom_fields: undefined });
      expect(getCustomField(taskWithoutFields, 'Email')).toBe('');
    });
  });

  describe('taskToCSVRow', () => {
    it('should convert task to CSV row', () => {
      const task = createMockTask({
        id: 'task123',
        name: 'Test Task',
        status: { status: 'done', color: '#0f0', orderindex: 0, type: 'closed' },
        assignees: [{ id: 1, username: 'john' }],
        url: 'https://app.clickup.com/t/task123',
        custom_fields: [
          { id: '1', name: 'Email', type: 'email', value: 'test@example.com' }
        ]
      });

      const fieldOrder = ['Task ID', 'Name', 'Status', 'Email'];
      const row = taskToCSVRow(task, fieldOrder);

      expect(row).toHaveLength(4);
      expect(row[0]).toBe('task123');
      expect(row[1]).toBe('Test Task');
      expect(row[2]).toBe('done');
      expect(row[3]).toBe('test@example.com');
    });

    it('should handle phone_number synthetic column', () => {
      const task = createMockTask({
        custom_fields: [
          { id: '1', name: 'Personal Phone', type: 'text', value: '(412) 481-2210' }
        ]
      });

      const fieldOrder = ['Name', 'phone_number'];
      const row = taskToCSVRow(task, fieldOrder);

      expect(row[1]).toBe('+14124812210');
    });
  });
});

// ==========================================================================
// Helper Functions
// ==========================================================================

function createAxiosError(status: number, data?: any): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const error = new AxiosError(
    'Request failed',
    status === 0 ? 'ECONNABORTED' : 'ERR_BAD_REQUEST',
    config as any,
    undefined,
    status > 0 ? {
      status,
      statusText: 'Error',
      data: data || {},
      headers: {},
      config: config as any
    } as any : undefined
  );
  return error;
}

function createMockTask(overrides: Partial<ClickUpTask> = {}): ClickUpTask {
  return {
    id: 'task_default',
    name: 'Default Task',
    text_content: '',
    description: '',
    status: {
      status: 'open',
      color: '#cccccc',
      orderindex: 0,
      type: 'open'
    },
    orderindex: '0',
    date_created: '1703318400000',
    date_updated: '1703318400000',
    creator: { id: 1, username: 'creator' },
    assignees: [],
    tags: [],
    team_id: 'team1',
    url: 'https://app.clickup.com/t/task_default',
    list: { id: 'list1', name: 'List', access: true },
    project: { id: 'project1', name: 'Project', hidden: false, access: true },
    folder: { id: 'folder1', name: 'Folder', hidden: false, access: true },
    space: { id: 'space1' },
    ...overrides
  };
}
