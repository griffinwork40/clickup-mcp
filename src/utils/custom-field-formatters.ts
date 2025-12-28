/**
 * @file custom-field-formatters.ts
 * @description Custom field, phone normalization, CSV utilities for ClickUp MCP server.
 */

import type { ClickUpTask, ClickUpCustomField } from "../types.js";

/**
 * Escapes a value for safe inclusion in CSV format.
 * Handles commas, quotes, and newlines by wrapping in quotes.
 * 
 * @param {any} value - Value to escape
 * @returns {string} CSV-safe string value
 */
export function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Normalizes a phone number to E.164 international format.
 * 
 * @description Converts various phone number formats to E.164 format
 * (e.g., +15551234567). Handles US/Canada numbers, removes extensions,
 * and validates the result against E.164 specifications.
 * 
 * @param {string | null | undefined} phone - Phone number to normalize
 * @returns {string} E.164 formatted phone number or empty string if invalid
 * 
 * @example
 * normalizePhoneToE164('555-123-4567'); // Returns: '+15551234567'
 * normalizePhoneToE164('(555) 123-4567 x206'); // Returns: '+15551234567'
 * normalizePhoneToE164('+44 20 7946 0958'); // Returns: '+442079460958'
 * normalizePhoneToE164('invalid'); // Returns: ''
 */
export function normalizePhoneToE164(phone: string | null | undefined): string {
  if (!phone) return '';
  
  let normalized = String(phone).trim();
  if (!normalized) return '';
  
  // Remove extensions (x206, ext 123, extension 456, etc.)
  // Match: x, ext, extension followed by optional space and digits
  normalized = normalized.replace(/\s*(?:x|ext|extension)\s*\d+/i, '');
  
  // Check if it starts with + (preserve it)
  const hasPlus = normalized.startsWith('+');
  if (hasPlus) {
    normalized = normalized.substring(1);
  }
  
  // Remove all non-digit characters
  normalized = normalized.replace(/\D/g, '');
  
  // If empty after cleaning, return empty
  if (!normalized) return '';
  
  // If number starts with 0, it's invalid for E.164 (must start with 1-9)
  if (normalized.startsWith('0')) {
    return '';
  }
  
  // Check if it already has a country code (starts with 1-9 and has 10+ digits)
  // If it's 10 digits and starts with 1, assume it's US/Canada with country code
  // If it's 10 digits and doesn't start with 1, assume it's missing country code
  // If it's 11 digits and starts with 1, it already has country code
  // If it's more than 11 digits, assume it already has country code
  
  if (normalized.length === 10) {
    // 10 digits without country code - add +1 for US/Canada
    normalized = '1' + normalized;
  } else if (normalized.length === 11 && normalized.startsWith('1')) {
    // Already has US/Canada country code
    // Keep as is
  } else if (normalized.length < 10) {
    // Too short to be a valid phone number
    return '';
  } else if (normalized.length > 15) {
    // Too long for E.164 (max 15 digits after country code)
    return '';
  }
  
  // Add + prefix
  normalized = '+' + normalized;
  
  // Validate E.164 format: ^\+?[1-9]\d{1,14}$
  // We already have the +, so check: [1-9]\d{1,14}
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(normalized)) {
    return '';
  }
  
  return normalized;
}

/**
 * Extracts and formats the value from a custom field based on its type.
 * 
 * @description Handles various ClickUp custom field types (text, number,
 * date, dropdown, etc.) and returns the appropriate string representation.
 * Automatically normalizes phone number fields to E.164 format.
 * 
 * @param {ClickUpCustomField} field - Custom field to extract value from
 * @returns {string} Formatted field value
 * 
 * @example
 * extractCustomFieldValue({ id: '1', name: 'Points', type: 'number', value: 5 });
 * // Returns: '5'
 * 
 * extractCustomFieldValue({ id: '2', name: 'Due', type: 'date', value: '1609459200000' });
 * // Returns: '2021-01-01'
 */
export function extractCustomFieldValue(field: ClickUpCustomField): string {
  if (!field || field.value === null || field.value === undefined || field.value === '') return '';
  
  // Check if this is a phone number field (by type or name)
  const isPhoneField = field.type === 'phone' || 
                       field.type === 'phone_number' ||
                       (typeof field.name === 'string' && /phone/i.test(field.name));
  
  // Handle different field types
  if (field.type === 'email' || field.type === 'url' || field.type === 'text' || field.type === 'short_text') {
    const value = String(field.value).trim();
    // Normalize if it's a phone field
    return isPhoneField ? normalizePhoneToE164(value) : value;
  } else if (field.type === 'phone' || field.type === 'phone_number') {
    return normalizePhoneToE164(field.value);
  } else if (field.type === 'number' || field.type === 'currency') {
    return String(field.value);
  } else if (field.type === 'date') {
    return new Date(parseInt(field.value)).toISOString().split('T')[0];
  } else if (field.type === 'dropdown') {
    return field.value?.label || field.value?.name || String(field.value || '');
  } else if (field.type === 'labels') {
    return Array.isArray(field.value) ? field.value.map((v: any) => v.label || v.name || v).join('; ') : '';
  } else if (field.type === 'checklist') {
    return Array.isArray(field.value) ? field.value.map((item: any) => item.name).join('; ') : '';
  } else if (field.type === 'checkbox') {
    return field.value ? 'Yes' : 'No';
  }
  
  // Default: return trimmed string, normalize if it's a phone field
  const value = String(field.value || '').trim();
  return isPhoneField ? normalizePhoneToE164(value) : value;
}

/**
 * Gets a custom field value from a task by field name.
 * 
 * @description Searches a task's custom fields for a field with the specified
 * name and returns its formatted value. Handles cases with multiple fields
 * of the same name by preferring the one with a value.
 * 
 * @param {ClickUpTask} task - Task containing custom fields
 * @param {string} fieldName - Name of the custom field to retrieve
 * @param {string} [preferredType] - Optional preferred field type
 * @returns {string} Field value or empty string if not found
 * 
 * @example
 * const email = getCustomField(task, 'Email');
 * const phone = getCustomField(task, 'Phone Number', 'phone');
 */
export function getCustomField(task: ClickUpTask, fieldName: string, preferredType?: string): string {
  if (!task.custom_fields) return '';
  
  // Find all fields with matching name
  const matchingFields = task.custom_fields.filter(f => f.name === fieldName);
  if (matchingFields.length === 0) return '';
  
  // If preferred type specified, try that first
  if (preferredType) {
    const typedField = matchingFields.find(f => f.type === preferredType && f.value);
    if (typedField) {
      return extractCustomFieldValue(typedField);
    }
  }
  
  // Prefer field with a value
  const fieldWithValue = matchingFields.find(f => f.value !== null && f.value !== undefined && f.value !== '');
  const field = fieldWithValue || matchingFields[0];
  
  return extractCustomFieldValue(field);
}

/**
 * Converts a task to an array of CSV field values.
 * 
 * @description Maps task properties and custom fields to CSV column values
 * in the specified field order. Handles both standard fields and custom fields.
 * 
 * @param {ClickUpTask} task - Task to convert
 * @param {string[]} fieldOrder - Ordered list of field names for columns
 * @returns {string[]} Array of escaped CSV values
 * 
 * @example
 * const row = taskToCSVRow(task, ['Task ID', 'Name', 'Status', 'Email']);
 * // Returns: ['abc123', 'Task Name', 'in progress', 'user@example.com']
 */
export function taskToCSVRow(task: ClickUpTask, fieldOrder: string[]): string[] {
  const row: string[] = [];
  
  for (const fieldName of fieldOrder) {
    let value: string = '';
    
    // Standard fields
    if (fieldName === 'Task ID') {
      value = task.id;
    } else if (fieldName === 'Name') {
      value = task.name;
    } else if (fieldName === 'Status') {
      value = task.status?.status || '';
    } else if (fieldName === 'Date Created') {
      value = task.date_created ? new Date(parseInt(task.date_created)).toISOString() : '';
    } else if (fieldName === 'Date Updated') {
      value = task.date_updated ? new Date(parseInt(task.date_updated)).toISOString() : '';
    } else if (fieldName === 'URL') {
      value = task.url || '';
    } else if (fieldName === 'Assignees') {
      value = task.assignees?.map(a => a.username || a.email).join('; ') || '';
    } else if (fieldName === 'Creator') {
      value = task.creator?.username || task.creator?.email || '';
    } else if (fieldName === 'Due Date') {
      value = task.due_date ? new Date(parseInt(task.due_date)).toISOString() : '';
    } else if (fieldName === 'Priority') {
      value = task.priority?.priority || '';
    } else if (fieldName === 'Description') {
      value = task.description || task.text_content || '';
    } else if (fieldName === 'Tags') {
      value = task.tags?.map(t => t.name).join('; ') || '';
    } else if (fieldName === 'phone_number') {
      // Combined phone number field for ElevenLabs compatibility
      // First check if a real phone_number custom field exists
      const realPhoneNumberField = task.custom_fields?.find(f => f.name === 'phone_number');
      
      if (realPhoneNumberField && (realPhoneNumberField.value !== null && realPhoneNumberField.value !== undefined && realPhoneNumberField.value !== '')) {
        // Use the real phone_number field value (already normalized)
        value = extractCustomFieldValue(realPhoneNumberField);
      } else {
        // No real phone_number field, use synthetic logic
        // Priority: Personal Phone > Biz Phone number > first phone field found
        const personalPhone = getCustomField(task, 'Personal Phone');
        const bizPhone = getCustomField(task, 'Biz Phone number');
        
        if (personalPhone) {
          value = personalPhone;
        } else if (bizPhone) {
          value = bizPhone;
        } else {
          // Try to find any phone field
          const phoneFields = task.custom_fields?.filter(f => 
            f.type === 'phone' || 
            f.type === 'phone_number' ||
            (typeof f.name === 'string' && /phone/i.test(f.name))
          ) || [];
          
          if (phoneFields.length > 0) {
            value = extractCustomFieldValue(phoneFields[0]);
          }
        }
      }
    } else {
      // Custom field
      value = getCustomField(task, fieldName);
    }
    
    row.push(escapeCSV(value));
  }
  
  return row;
}

/**
 * Options for exporting tasks to CSV format.
 * 
 * @interface ExportCSVOptions
 * @property {boolean} [archived] - Include archived tasks
 * @property {boolean} [include_closed] - Include closed tasks
 * @property {string[]} [statuses] - Filter by specific status names
 * @property {string[]} [custom_fields] - Specific custom field names to include
 * @property {boolean} [include_standard_fields] - Include standard fields (default: true)
 * @property {boolean} [add_phone_number_column] - Add combined phone number column for ElevenLabs
 */
export interface ExportCSVOptions {
  archived?: boolean;
  include_closed?: boolean;
  statuses?: string[];
  custom_fields?: string[];
  include_standard_fields?: boolean;
  add_phone_number_column?: boolean;
}
