/**
 * Tests for constants module
 * 
 * Verifies that all constants are correctly defined and have expected values.
 */

import { describe, it, expect } from '@jest/globals';
import {
  API_BASE_URL,
  CHARACTER_LIMIT,
  DEFAULT_TIMEOUT,
  ResponseFormat,
  ResponseMode,
  Priority,
  DEFAULT_LIMIT,
  MAX_LIMIT
} from '../constants.js';

describe('Constants Module', () => {
  describe('API Configuration', () => {
    it('should have correct API base URL', () => {
      expect(API_BASE_URL).toBe('https://api.clickup.com/api/v2');
    });

    it('should have character limit for response truncation', () => {
      expect(CHARACTER_LIMIT).toBe(100000);
      expect(typeof CHARACTER_LIMIT).toBe('number');
    });

    it('should have default timeout in milliseconds', () => {
      expect(DEFAULT_TIMEOUT).toBe(30000);
      expect(DEFAULT_TIMEOUT).toBeGreaterThan(0);
    });
  });

  describe('ResponseFormat Enum', () => {
    it('should have MARKDOWN format', () => {
      expect(ResponseFormat.MARKDOWN).toBe('markdown');
    });

    it('should have JSON format', () => {
      expect(ResponseFormat.JSON).toBe('json');
    });

    it('should only have two formats', () => {
      const values = Object.values(ResponseFormat);
      expect(values).toHaveLength(2);
      expect(values).toContain('markdown');
      expect(values).toContain('json');
    });
  });

  describe('ResponseMode Enum', () => {
    it('should have FULL mode', () => {
      expect(ResponseMode.FULL).toBe('full');
    });

    it('should have COMPACT mode', () => {
      expect(ResponseMode.COMPACT).toBe('compact');
    });

    it('should have SUMMARY mode', () => {
      expect(ResponseMode.SUMMARY).toBe('summary');
    });

    it('should only have three modes', () => {
      const values = Object.values(ResponseMode);
      expect(values).toHaveLength(3);
      expect(values).toContain('full');
      expect(values).toContain('compact');
      expect(values).toContain('summary');
    });
  });

  describe('Priority Enum', () => {
    it('should have URGENT priority as 1', () => {
      expect(Priority.URGENT).toBe(1);
    });

    it('should have HIGH priority as 2', () => {
      expect(Priority.HIGH).toBe(2);
    });

    it('should have NORMAL priority as 3', () => {
      expect(Priority.NORMAL).toBe(3);
    });

    it('should have LOW priority as 4', () => {
      expect(Priority.LOW).toBe(4);
    });

    it('should have correct priority order (1 = highest)', () => {
      expect(Priority.URGENT).toBeLessThan(Priority.HIGH);
      expect(Priority.HIGH).toBeLessThan(Priority.NORMAL);
      expect(Priority.NORMAL).toBeLessThan(Priority.LOW);
    });
  });

  describe('Pagination Constants', () => {
    it('should have default limit of 20', () => {
      expect(DEFAULT_LIMIT).toBe(20);
    });

    it('should have max limit of 100', () => {
      expect(MAX_LIMIT).toBe(100);
    });

    it('should have default limit less than or equal to max limit', () => {
      expect(DEFAULT_LIMIT).toBeLessThanOrEqual(MAX_LIMIT);
    });

    it('should have positive pagination values', () => {
      expect(DEFAULT_LIMIT).toBeGreaterThan(0);
      expect(MAX_LIMIT).toBeGreaterThan(0);
    });
  });
});
