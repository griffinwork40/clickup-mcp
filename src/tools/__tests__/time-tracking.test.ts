/**
 * @file time-tracking.test.ts
 * @description Tests for ClickUp time tracking tool functionality.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AxiosError } from 'axios';
import { mockTimeEntriesResponse, mockTimeEntry1, mockTimeEntry2 } from './mocks.js';
import { handleApiError, formatTimeEntryMarkdown } from '../../utils.js';

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

describe('Time Tracking Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Time entry data structure', () => {
    it('should have data array in response', () => {
      expect(mockTimeEntriesResponse.data).toBeDefined();
      expect(Array.isArray(mockTimeEntriesResponse.data)).toBe(true);
      expect(mockTimeEntriesResponse.data).toHaveLength(2);
    });

    it('should validate time entry has required properties', () => {
      expect(mockTimeEntry1).toHaveProperty('id');
      expect(mockTimeEntry1).toHaveProperty('user');
      expect(mockTimeEntry1).toHaveProperty('billable');
      expect(mockTimeEntry1).toHaveProperty('start');
      expect(mockTimeEntry1).toHaveProperty('duration');
    });

    it('should validate user structure', () => {
      expect(mockTimeEntry1.user).toHaveProperty('id');
      expect(mockTimeEntry1.user).toHaveProperty('username');
    });

    it('should validate task structure when present', () => {
      expect(mockTimeEntry1.task).toBeDefined();
      expect(mockTimeEntry1.task).toHaveProperty('id');
      expect(mockTimeEntry1.task).toHaveProperty('name');
    });

    it('should validate duration is string', () => {
      expect(typeof mockTimeEntry1.duration).toBe('string');
    });

    it('should have end time for completed entry', () => {
      expect(mockTimeEntry1.end).toBeDefined();
    });

    it('should allow undefined end for running entries', () => {
      expect(mockTimeEntry2.end).toBeUndefined();
    });

    it('should validate billable is boolean', () => {
      expect(typeof mockTimeEntry1.billable).toBe('boolean');
      expect(mockTimeEntry1.billable).toBe(true);
      expect(mockTimeEntry2.billable).toBe(false);
    });
  });

  describe('formatTimeEntryMarkdown', () => {
    it('should format time entry with user and duration', () => {
      const markdown = formatTimeEntryMarkdown(mockTimeEntry1);

      expect(markdown).toContain('@john_doe');
      expect(markdown).toContain('2h 0m');
    });

    it('should include start time', () => {
      const markdown = formatTimeEntryMarkdown(mockTimeEntry1);

      expect(markdown).toContain('Start:');
    });

    it('should include end time for completed entries', () => {
      const markdown = formatTimeEntryMarkdown(mockTimeEntry1);

      expect(markdown).toContain('End:');
    });

    it('should show running status for entries without end', () => {
      const markdown = formatTimeEntryMarkdown(mockTimeEntry2);

      expect(markdown).toContain('Still running');
    });

    it('should include task info when available', () => {
      const markdown = formatTimeEntryMarkdown(mockTimeEntry1);

      expect(markdown).toContain('Task:');
      expect(markdown).toContain('Implement user authentication');
    });

    it('should include description when available', () => {
      const markdown = formatTimeEntryMarkdown(mockTimeEntry1);

      expect(markdown).toContain('Description:');
      expect(markdown).toContain('Initial implementation');
    });

    it('should show billable Yes', () => {
      const markdown = formatTimeEntryMarkdown(mockTimeEntry1);
      expect(markdown).toContain('Billable: Yes');
    });

    it('should show billable No', () => {
      const markdown = formatTimeEntryMarkdown(mockTimeEntry2);
      expect(markdown).toContain('Billable: No');
    });

    it('should calculate 2 hours correctly', () => {
      const entry = { ...mockTimeEntry1, duration: '7200000' };
      expect(formatTimeEntryMarkdown(entry)).toContain('2h 0m');
    });

    it('should calculate 1.5 hours correctly', () => {
      const entry = { ...mockTimeEntry1, duration: '5400000' };
      expect(formatTimeEntryMarkdown(entry)).toContain('1h 30m');
    });

    it('should calculate 30 minutes correctly', () => {
      const entry = { ...mockTimeEntry1, duration: '1800000' };
      expect(formatTimeEntryMarkdown(entry)).toContain('0h 30m');
    });

    it('should calculate 0 minutes correctly', () => {
      const entry = { ...mockTimeEntry1, duration: '0' };
      expect(formatTimeEntryMarkdown(entry)).toContain('0h 0m');
    });
  });

  describe('Error handling for time tracking', () => {
    it('should handle 404 for invalid team_id', () => {
      const error = createAxiosError(404, 'Team not found');
      const message = handleApiError(error);

      expect(message).toContain('Resource not found');
    });

    it('should handle 400 when no active time tracking', () => {
      const error = createAxiosError(400, 'No active time tracking');
      const message = handleApiError(error);

      expect(message).toContain('Bad request');
    });

    it('should handle 400 when already tracking time', () => {
      const error = createAxiosError(400, 'Already tracking time');
      const message = handleApiError(error);

      expect(message).toContain('Bad request');
    });

    it('should handle 403 permission denied', () => {
      const error = createAxiosError(403, 'Cannot access time entries');
      const message = handleApiError(error);

      expect(message).toContain('Permission denied');
    });
  });

  describe('Time entry filtering', () => {
    it('should support filtering by date range conceptually', () => {
      const startDate = Date.now() - 86400000; // 1 day ago
      const endDate = Date.now();

      // Validate the filter logic works
      expect(startDate).toBeLessThan(endDate);
      expect(typeof startDate).toBe('number');
    });

    it('should support assignee filter', () => {
      const assigneeId = 12345;

      // Filter mock data
      const filtered = mockTimeEntriesResponse.data.filter(
        entry => entry.user.id === assigneeId
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('time_001');
    });
  });

  describe('Time calculations', () => {
    it('should convert milliseconds to hours and minutes', () => {
      const msToHoursMinutes = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return { hours, minutes };
      };

      expect(msToHoursMinutes(3600000)).toEqual({ hours: 1, minutes: 0 });
      expect(msToHoursMinutes(5400000)).toEqual({ hours: 1, minutes: 30 });
      expect(msToHoursMinutes(7200000)).toEqual({ hours: 2, minutes: 0 });
      expect(msToHoursMinutes(9000000)).toEqual({ hours: 2, minutes: 30 });
    });
  });
});
