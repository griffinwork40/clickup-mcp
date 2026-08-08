/**
 * @file tasks.test.ts
 * @description Tests for ClickUp tasks tool functionality.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AxiosError } from 'axios';
import {
  mockTasksResponse,
  mockTask1,
  mockTask2,
  mockTask3,
  generateMockTasks
} from './mocks.js';
import {
  handleApiError,
  formatTaskMarkdown,
  formatTaskCompact,
  generateTaskSummary,
  filterTasksByStatus,
  getPagination
} from '../../utils.js';

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

describe('Tasks Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task data structure', () => {
    it('should have tasks array in response', () => {
      expect(mockTasksResponse.tasks).toBeDefined();
      expect(Array.isArray(mockTasksResponse.tasks)).toBe(true);
      expect(mockTasksResponse.tasks).toHaveLength(3);
    });

    it('should validate task has required properties', () => {
      expect(mockTask1).toHaveProperty('id');
      expect(mockTask1).toHaveProperty('name');
      expect(mockTask1).toHaveProperty('status');
      expect(mockTask1).toHaveProperty('creator');
      expect(mockTask1).toHaveProperty('url');
    });

    it('should validate task status structure', () => {
      expect(mockTask1.status).toHaveProperty('status');
      expect(mockTask1.status).toHaveProperty('color');
      expect(mockTask1.status).toHaveProperty('type');
    });

    it('should validate assignees array', () => {
      expect(Array.isArray(mockTask1.assignees)).toBe(true);
      expect(mockTask1.assignees).toHaveLength(2);
    });

    it('should validate tags array', () => {
      expect(Array.isArray(mockTask1.tags)).toBe(true);
      expect(mockTask1.tags[0]).toHaveProperty('name');
    });
  });

  describe('formatTaskMarkdown', () => {
    it('should format task with all details', () => {
      const markdown = formatTaskMarkdown(mockTask1);

      expect(markdown).toContain('Implement user authentication');
      expect(markdown).toContain(mockTask1.id);
      expect(markdown).toContain('Status**: in progress');
      expect(markdown).toContain('Priority**: high');
    });

    it('should include assignees', () => {
      const markdown = formatTaskMarkdown(mockTask1);

      expect(markdown).toContain('Assignees');
      expect(markdown).toContain('john_doe');
      expect(markdown).toContain('jane_smith');
    });

    it('should include tags', () => {
      const markdown = formatTaskMarkdown(mockTask1);

      expect(markdown).toContain('Tags');
      expect(markdown).toContain('bug');
      expect(markdown).toContain('urgent');
    });

    it('should include description', () => {
      const markdown = formatTaskMarkdown(mockTask1);

      expect(markdown).toContain('Description');
      expect(markdown).toContain('OAuth2 login flow');
    });

    it('should include URL', () => {
      const markdown = formatTaskMarkdown(mockTask1);

      expect(markdown).toContain('URL');
      expect(markdown).toContain('https://app.clickup.com/t/task_001');
    });

    it('should handle task without due date', () => {
      const taskNoDue = { ...mockTask2, due_date: undefined };
      const markdown = formatTaskMarkdown(taskNoDue);

      expect(markdown).toContain('Fix login bug');
      expect(markdown).not.toContain('Due Date**:');
    });

    it('should handle task without assignees', () => {
      const markdown = formatTaskMarkdown(mockTask3);

      expect(markdown).toContain('Update documentation');
      expect(markdown).not.toContain('Assignees**:');
    });

    it('should handle task without priority', () => {
      const markdown = formatTaskMarkdown(mockTask2);

      expect(markdown).toContain('Priority**: None');
    });
  });

  describe('formatTaskCompact', () => {
    it('should format task in single line', () => {
      const compact = formatTaskCompact(mockTask1);

      expect(compact.split('\n')).toHaveLength(1);
      expect(compact).toContain('Implement user authentication');
      expect(compact).toContain('task_001');
      expect(compact).toContain('in progress');
    });

    it('should include assignees', () => {
      const compact = formatTaskCompact(mockTask1);

      expect(compact).toContain('john_doe');
    });

    it('should show Unassigned for tasks without assignees', () => {
      const compact = formatTaskCompact(mockTask3);

      expect(compact).toContain('Unassigned');
    });

    it('should include URL', () => {
      const compact = formatTaskCompact(mockTask1);

      expect(compact).toContain('URL');
    });
  });

  describe('generateTaskSummary', () => {
    it('should generate summary with total count', () => {
      const tasks = [mockTask1, mockTask2, mockTask3];
      const summary = generateTaskSummary(tasks);

      expect(summary).toContain('Total Tasks**: 3');
    });

    it('should group by status', () => {
      const tasks = [mockTask1, mockTask2, mockTask3];
      const summary = generateTaskSummary(tasks);

      expect(summary).toContain('By Status');
      expect(summary).toContain('in progress');
      expect(summary).toContain('to do');
      expect(summary).toContain('complete');
    });

    it('should group by assignee', () => {
      const tasks = [mockTask1, mockTask2];
      const summary = generateTaskSummary(tasks);

      expect(summary).toContain('By Assignee');
      expect(summary).toContain('john_doe');
    });

    it('should count unassigned tasks', () => {
      const tasks = [mockTask3];
      const summary = generateTaskSummary(tasks);

      expect(summary).toContain('Unassigned');
    });

    it('should group by priority', () => {
      const tasks = [mockTask1, mockTask2];
      const summary = generateTaskSummary(tasks);

      expect(summary).toContain('By Priority');
    });

    it('should handle empty task array', () => {
      const summary = generateTaskSummary([]);

      expect(summary).toContain('Total Tasks**: 0');
    });
  });

  describe('filterTasksByStatus', () => {
    it('should filter tasks by single status', () => {
      const tasks = [mockTask1, mockTask2, mockTask3];
      const filtered = filterTasksByStatus(tasks, ['to do']);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('task_002');
    });

    it('should filter tasks by multiple statuses', () => {
      const tasks = [mockTask1, mockTask2, mockTask3];
      const filtered = filterTasksByStatus(tasks, ['to do', 'in progress']);

      expect(filtered).toHaveLength(2);
    });

    it('should return all tasks if no filter specified', () => {
      const tasks = [mockTask1, mockTask2, mockTask3];
      const filtered = filterTasksByStatus(tasks, []);

      expect(filtered).toHaveLength(3);
    });

    it('should return empty array if no matches', () => {
      const tasks = [mockTask1, mockTask2, mockTask3];
      const filtered = filterTasksByStatus(tasks, ['nonexistent']);

      expect(filtered).toHaveLength(0);
    });

    it('should handle undefined status gracefully', () => {
      const taskWithNoStatus = { ...mockTask1, status: undefined } as any;
      const filtered = filterTasksByStatus([taskWithNoStatus], ['to do']);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('getPagination', () => {
    it('should calculate has_more correctly', () => {
      const pagination = getPagination(100, 20, 0, 20);

      expect(pagination.has_more).toBe(true);
      expect(pagination.next_offset).toBe(20);
    });

    it('should detect last page', () => {
      const pagination = getPagination(100, 20, 80, 20);

      expect(pagination.has_more).toBe(false);
      expect(pagination.next_offset).toBeUndefined();
    });

    it('should handle partial page', () => {
      const pagination = getPagination(95, 15, 80, 20);

      expect(pagination.has_more).toBe(false);
      expect(pagination.count).toBe(15);
    });

    it('should handle unknown total', () => {
      const pagination = getPagination(undefined, 20, 0, 20);

      // When count equals limit, assume more might exist
      expect(pagination.has_more).toBe(true);
    });

    it('should return offset in pagination', () => {
      const pagination = getPagination(100, 20, 40, 20);

      expect(pagination.offset).toBe(40);
    });
  });

  describe('Error handling for tasks', () => {
    it('should handle 404 for invalid task_id', () => {
      const error = createAxiosError(404, 'Task not found');
      const message = handleApiError(error);

      expect(message).toContain('Resource not found');
    });

    it('should handle 400 for invalid status', () => {
      const error = createAxiosError(400, "Status 'invalid' not found");
      const message = handleApiError(error);

      expect(message).toContain('Bad request');
    });

    it('should handle 403 permission denied', () => {
      const error = createAxiosError(403, 'Cannot access task');
      const message = handleApiError(error);

      expect(message).toContain('Permission denied');
    });
  });

  describe('Pagination validation', () => {
    it('should validate offset is multiple of limit', () => {
      const validatePagination = (offset: number, limit: number): boolean => {
        return offset % limit === 0;
      };

      expect(validatePagination(0, 20)).toBe(true);
      expect(validatePagination(20, 20)).toBe(true);
      expect(validatePagination(40, 20)).toBe(true);
      expect(validatePagination(25, 20)).toBe(false);
      expect(validatePagination(37, 20)).toBe(false);
    });

    it('should calculate correct page number', () => {
      const calculatePage = (offset: number, limit: number): number => {
        return Math.floor(offset / limit);
      };

      expect(calculatePage(0, 20)).toBe(0);
      expect(calculatePage(20, 20)).toBe(1);
      expect(calculatePage(40, 20)).toBe(2);
    });
  });

  describe('Mock task generation', () => {
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
  });
});
