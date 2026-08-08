/**
 * @file custom-fields.test.ts
 * @description Tests for ClickUp custom fields tool functionality.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AxiosError } from 'axios';
import { mockCustomFields, mockTask1, createMockTaskWithCustomFields } from './mocks.js';
import { handleApiError, extractCustomFieldValue, getCustomField } from '../../utils.js';
import type { ClickUpCustomField } from '../../types.js';

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

describe('Custom Fields Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom field data structure', () => {
    it('should have correct number of mock fields', () => {
      expect(mockCustomFields).toHaveLength(5);
    });

    it('should validate custom field has required properties', () => {
      const field = mockCustomFields[0];

      expect(field).toHaveProperty('id');
      expect(field).toHaveProperty('name');
      expect(field).toHaveProperty('type');
    });

    it('should validate various field types', () => {
      const types = mockCustomFields.map(f => f.type);

      expect(types).toContain('email');
      expect(types).toContain('phone');
      expect(types).toContain('number');
      expect(types).toContain('date');
      expect(types).toContain('dropdown');
    });
  });

  describe('extractCustomFieldValue', () => {
    it('should extract text field value', () => {
      const field: ClickUpCustomField = {
        id: 'cf_text',
        name: 'Notes',
        type: 'text',
        value: 'Some notes'
      };

      expect(extractCustomFieldValue(field)).toBe('Some notes');
    });

    it('should extract email field value', () => {
      const field = mockCustomFields[0]; // Email field

      expect(extractCustomFieldValue(field)).toBe('test@example.com');
    });

    it('should extract and normalize phone field value', () => {
      const field = mockCustomFields[1]; // Phone field

      expect(extractCustomFieldValue(field)).toBe('+14124812210');
    });

    it('should extract number field value', () => {
      const field = mockCustomFields[2]; // Story Points

      expect(extractCustomFieldValue(field)).toBe('5');
    });

    it('should extract date field value', () => {
      const field = mockCustomFields[3]; // Date field

      const result = extractCustomFieldValue(field);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract dropdown field value', () => {
      const field = mockCustomFields[4]; // Dropdown

      expect(extractCustomFieldValue(field)).toBe('High');
    });

    it('should handle null value', () => {
      const field: ClickUpCustomField = {
        id: 'cf_null',
        name: 'Empty',
        type: 'text',
        value: null
      };

      expect(extractCustomFieldValue(field)).toBe('');
    });

    it('should handle undefined value', () => {
      const field: ClickUpCustomField = {
        id: 'cf_undef',
        name: 'Undefined',
        type: 'text',
        value: undefined
      };

      expect(extractCustomFieldValue(field)).toBe('');
    });

    it('should handle checkbox field - true', () => {
      const field: ClickUpCustomField = {
        id: 'cf_check1',
        name: 'Completed',
        type: 'checkbox',
        value: true
      };

      expect(extractCustomFieldValue(field)).toBe('Yes');
    });

    it('should handle checkbox field - false', () => {
      const field: ClickUpCustomField = {
        id: 'cf_check2',
        name: 'Approved',
        type: 'checkbox',
        value: false
      };

      expect(extractCustomFieldValue(field)).toBe('No');
    });

    it('should handle labels field', () => {
      const field: ClickUpCustomField = {
        id: 'cf_labels',
        name: 'Categories',
        type: 'labels',
        value: [
          { label: 'Feature' },
          { label: 'Priority' }
        ]
      };

      expect(extractCustomFieldValue(field)).toBe('Feature; Priority');
    });

    it('should handle currency field', () => {
      const field: ClickUpCustomField = {
        id: 'cf_currency',
        name: 'Budget',
        type: 'currency',
        value: 1500.50
      };

      expect(extractCustomFieldValue(field)).toBe('1500.5');
    });

    it('should handle short_text field', () => {
      const field: ClickUpCustomField = {
        id: 'cf_short',
        name: 'Title',
        type: 'short_text',
        value: 'Short title'
      };

      expect(extractCustomFieldValue(field)).toBe('Short title');
    });

    it('should handle url field', () => {
      const field: ClickUpCustomField = {
        id: 'cf_url',
        name: 'Website',
        type: 'url',
        value: 'https://example.com'
      };

      expect(extractCustomFieldValue(field)).toBe('https://example.com');
    });
  });

  describe('getCustomField', () => {
    it('should get custom field by name', () => {
      const result = getCustomField(mockTask1, 'Email');

      expect(result).toBe('test@example.com');
    });

    it('should return empty string for non-existent field', () => {
      const result = getCustomField(mockTask1, 'NonExistent');

      expect(result).toBe('');
    });

    it('should handle task without custom fields', () => {
      const taskNoFields = { ...mockTask1, custom_fields: undefined };
      const result = getCustomField(taskNoFields, 'Email');

      expect(result).toBe('');
    });

    it('should prefer field with value when multiple match', () => {
      const taskWithDuplicates = createMockTaskWithCustomFields('task_dup', [
        { id: 'cf1', name: 'Phone', type: 'text', value: null },
        { id: 'cf2', name: 'Phone', type: 'phone', value: '412-481-2210' }
      ]);

      const result = getCustomField(taskWithDuplicates, 'Phone');

      expect(result).toBe('+14124812210');
    });

    it('should use preferred type when specified', () => {
      const taskWithDuplicates = createMockTaskWithCustomFields('task_dup', [
        { id: 'cf1', name: 'Phone', type: 'text', value: 'text value' },
        { id: 'cf2', name: 'Phone', type: 'phone', value: '412-481-2210' }
      ]);

      const result = getCustomField(taskWithDuplicates, 'Phone', 'phone');

      expect(result).toBe('+14124812210');
    });

    it('should get Story Points field', () => {
      const result = getCustomField(mockTask1, 'Story Points');

      expect(result).toBe('5');
    });
  });

  describe('Error handling for custom fields', () => {
    it('should handle 404 for invalid task_id', () => {
      const error = createAxiosError(404, 'Task not found');
      const message = handleApiError(error);

      expect(message).toContain('Resource not found');
    });

    it('should handle 400 for invalid field value format', () => {
      const error = createAxiosError(400, 'Invalid value for field type');
      const message = handleApiError(error);

      expect(message).toContain('Bad request');
    });

    it('should handle 404 for invalid field_id', () => {
      const error = createAxiosError(404, 'Field not found');
      const message = handleApiError(error);

      expect(message).toContain('Resource not found');
    });
  });

  describe('Phone field normalization', () => {
    it('should normalize phone fields by type', () => {
      const phoneField: ClickUpCustomField = {
        id: 'cf_phone',
        name: 'Contact',
        type: 'phone',
        value: '(412) 481-2210'
      };

      expect(extractCustomFieldValue(phoneField)).toBe('+14124812210');
    });

    it('should normalize text fields with phone in name', () => {
      const textPhoneField: ClickUpCustomField = {
        id: 'cf_text_phone',
        name: 'Business Phone',
        type: 'text',
        value: '412.481.2210'
      };

      expect(extractCustomFieldValue(textPhoneField)).toBe('+14124812210');
    });

    it('should not normalize non-phone text fields', () => {
      const textField: ClickUpCustomField = {
        id: 'cf_text',
        name: 'Notes',
        type: 'text',
        value: '412.481.2210'
      };

      // Should not normalize because field name doesn't contain 'phone'
      expect(extractCustomFieldValue(textField)).toBe('412.481.2210');
    });

    it('should handle phone_number type', () => {
      const field: ClickUpCustomField = {
        id: 'cf_pn',
        name: 'Cell',
        type: 'phone_number',
        value: '817-527-9708'
      };

      expect(extractCustomFieldValue(field)).toBe('+18175279708');
    });
  });
});
