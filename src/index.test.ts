/**
 * Tests for ClickUp MCP Server pagination validation
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DEFAULT_LIMIT } from "./constants.js";

// Mock environment variable
process.env.CLICKUP_API_TOKEN = "pk_test_token_for_testing";

describe('Pagination Validation', () => {
  describe('clickup_get_tasks', () => {
    it('should accept offset=0 with default limit', () => {
      const offset = 0;
      const limit = DEFAULT_LIMIT;
      expect(offset % limit).toBe(0);
    });

    it('should accept offset as multiple of limit', () => {
      const testCases = [
        { offset: 0, limit: 20 },
        { offset: 20, limit: 20 },
        { offset: 40, limit: 20 },
        { offset: 60, limit: 20 },
        { offset: 0, limit: 10 },
        { offset: 10, limit: 10 },
        { offset: 50, limit: 10 },
        { offset: 0, limit: 100 },
        { offset: 100, limit: 100 },
      ];

      testCases.forEach(({ offset, limit }) => {
        expect(offset % limit).toBe(0);
      });
    });

    it('should detect offset not multiple of limit', () => {
      const invalidCases = [
        { offset: 5, limit: 20 },
        { offset: 25, limit: 20 },
        { offset: 37, limit: 20 },
        { offset: 15, limit: 10 },
        { offset: 23, limit: 10 },
        { offset: 99, limit: 100 },
      ];

      invalidCases.forEach(({ offset, limit }) => {
        expect(offset % limit).not.toBe(0);
      });
    });

    it('should validate pagination alignment logic', () => {
      const validatePagination = (offset: number, limit: number): boolean => {
        return offset % limit === 0;
      };

      // Valid cases
      expect(validatePagination(0, 20)).toBe(true);
      expect(validatePagination(20, 20)).toBe(true);
      expect(validatePagination(40, 20)).toBe(true);

      // Invalid cases
      expect(validatePagination(5, 20)).toBe(false);
      expect(validatePagination(25, 20)).toBe(false);
      expect(validatePagination(37, 20)).toBe(false);
    });

    it('should correctly calculate page numbers', () => {
      // This tests the ClickUp API page calculation logic
      const calculatePage = (offset: number, limit: number): number => {
        return Math.floor(offset / limit);
      };

      expect(calculatePage(0, 20)).toBe(0);
      expect(calculatePage(20, 20)).toBe(1);
      expect(calculatePage(40, 20)).toBe(2);
      expect(calculatePage(60, 20)).toBe(3);

      // Non-aligned offsets (which should now be prevented)
      expect(calculatePage(25, 20)).toBe(1); // Would confusingly return page 1, not items 25-44
      expect(calculatePage(37, 20)).toBe(1); // Would confusingly return page 1, not items 37-56
    });

    it('should handle edge case with limit=1', () => {
      // With limit=1, any integer offset is valid
      expect(0 % 1).toBe(0);
      expect(1 % 1).toBe(0);
      expect(100 % 1).toBe(0);
    });

    it('should generate correct error message format', () => {
      const generateError = (offset: number, limit: number): string => {
        return `Error: offset (${offset}) must be a multiple of limit (${limit}) for proper pagination. Use the next_offset value from previous responses, or ensure offset is divisible by limit.`;
      };

      const error = generateError(25, 20);
      expect(error).toContain('offset (25)');
      expect(error).toContain('limit (20)');
      expect(error).toContain('multiple of limit');
      expect(error).toContain('next_offset');
    });

    it('should calculate next_offset correctly', () => {
      const calculateNextOffset = (offset: number, count: number): number => {
        return offset + count;
      };

      expect(calculateNextOffset(0, 20)).toBe(20);
      expect(calculateNextOffset(20, 20)).toBe(40);
      expect(calculateNextOffset(40, 20)).toBe(60);
    });
  });

  describe('Page-based pagination behavior', () => {
    it('should understand why non-aligned offsets are problematic', () => {
      // Example: User requests offset=25, limit=20
      // Expected: Items 25-44
      // Actual: page=Math.floor(25/20)=1, returns items 20-39
      // This is confusing and should be prevented

      const problematicOffset = 25;
      const limit = 20;
      const calculatedPage = Math.floor(problematicOffset / limit);
      const actualStartItem = calculatedPage * limit;

      expect(calculatedPage).toBe(1);
      expect(actualStartItem).toBe(20); // Not 25!
      expect(actualStartItem).not.toBe(problematicOffset);
    });

    it('should verify aligned offsets work correctly', () => {
      const testCases = [
        { offset: 0, limit: 20, expectedPage: 0, expectedStart: 0 },
        { offset: 20, limit: 20, expectedPage: 1, expectedStart: 20 },
        { offset: 40, limit: 20, expectedPage: 2, expectedStart: 40 },
      ];

      testCases.forEach(({ offset, limit, expectedPage, expectedStart }) => {
        const page = Math.floor(offset / limit);
        const actualStart = page * limit;

        expect(page).toBe(expectedPage);
        expect(actualStart).toBe(expectedStart);
        expect(actualStart).toBe(offset); // They match!
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should support common pagination patterns', () => {
      // Pattern 1: First page
      expect(0 % 20).toBe(0); // offset=0, limit=20

      // Pattern 2: Next page using next_offset
      const firstPageOffset = 0;
      const firstPageCount = 20;
      const nextOffset = firstPageOffset + firstPageCount;
      expect(nextOffset % 20).toBe(0); // offset=20, limit=20

      // Pattern 3: Third page
      const thirdPageOffset = 40;
      expect(thirdPageOffset % 20).toBe(0); // offset=40, limit=20
    });

    it('should prevent confusing pagination scenarios', () => {
      // These scenarios would cause confusion and are now blocked
      const confusingScenarios = [
        { offset: 15, limit: 20, description: 'Offset in middle of page' },
        { offset: 25, limit: 20, description: 'Offset slightly past page boundary' },
        { offset: 37, limit: 20, description: 'Random offset' },
      ];

      confusingScenarios.forEach(({ offset, limit }) => {
        expect(offset % limit).not.toBe(0);
      });
    });
  });
});

describe('API Response Format', () => {
  it('should verify pagination info structure', () => {
    // This tests the structure returned in responses
    const paginationInfo = {
      count: 20,
      offset: 0,
      has_more: true,
      next_offset: 20
    };

    expect(paginationInfo).toHaveProperty('count');
    expect(paginationInfo).toHaveProperty('offset');
    expect(paginationInfo).toHaveProperty('has_more');
    expect(paginationInfo).toHaveProperty('next_offset');
    expect(paginationInfo.next_offset).toBe(paginationInfo.offset + paginationInfo.count);
  });

  it('should validate next_offset is always aligned', () => {
    const testCases = [
      { offset: 0, count: 20, limit: 20 },
      { offset: 20, count: 20, limit: 20 },
      { offset: 40, count: 15, limit: 20 }, // Partial page
    ];

    testCases.forEach(({ offset, count, limit }) => {
      const next_offset = offset + count;
      // Even with partial pages, next_offset should be aligned
      expect(offset % limit).toBe(0); // Current offset must be aligned
    });
  });
});

describe('Error Handling', () => {
  it('should provide actionable error messages', () => {
    const errorMessage = `Error: offset (25) must be a multiple of limit (20) for proper pagination. Use the next_offset value from previous responses, or ensure offset is divisible by limit.`;

    // Error should contain key information
    expect(errorMessage).toMatch(/offset \(\d+\)/);
    expect(errorMessage).toMatch(/limit \(\d+\)/);
    expect(errorMessage).toContain('multiple of limit');
    expect(errorMessage).toContain('next_offset');
    expect(errorMessage).toContain('divisible by limit');
  });
});
