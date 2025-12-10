/**
 * CSV export utilities for ClickUp MCP server.
 * Handles CSV generation and phone number normalization.
 */

import type { ClickUpTask, ClickUpCustomField } from "../types.js";
import { MAX_LIMIT } from "../constants.js";
import { makeApiRequest } from "./api.js";
import { filterTasksByStatus } from "./tasks.js";

/**
 * Escape CSV fields to handle commas, quotes, and newlines
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
 * Normalize phone number to E.164 format
 * E.164 format: ^\+?[1-9]\d{1,14}$
 * Rules:
 * - Optional + at the start
 * - Must start with digit 1-9 (not 0)
 * - Followed by 1-14 digits only
 * - NO spaces, dashes, parentheses, dots, or other characters
 * - NO extensions
 */
export function normalizePhoneToE164(phone: string | null | undefined): string {
  if (!phone) return '';
  
  let normalized = String(phone).trim();
  if (!normalized) return '';
  
  // Remove extensions (x206, ext 123, extension 456, etc.)
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
  
  // Handle US/Canada numbers
  if (normalized.length === 10) {
    // 10 digits without country code - add +1 for US/Canada
    normalized = '1' + normalized;
  } else if (normalized.length === 11 && normalized.startsWith('1')) {
    // Already has US/Canada country code - keep as is
  } else if (normalized.length < 10) {
    // Too short to be a valid phone number
    return '';
  } else if (normalized.length > 15) {
    // Too long for E.164 (max 15 digits after country code)
    return '';
  }
  
  // Add + prefix
  normalized = '+' + normalized;
  
  // Validate E.164 format
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(normalized)) {
    return '';
  }
  
  return normalized;
}

/**
 * Extract value from a custom field based on its type
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
 * Get custom field value by name (prefers field with value if multiple exist)
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
 * Convert task to CSV row array
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
    } else {
      // Custom field
      value = getCustomField(task, fieldName);
    }
    
    row.push(escapeCSV(value));
  }
  
  return row;
}

/**
 * Options for exporting tasks to CSV
 */
export interface ExportCSVOptions {
  archived?: boolean;
  include_closed?: boolean;
  statuses?: string[];
  custom_fields?: string[];
  include_standard_fields?: boolean;
}

/**
 * Export tasks to CSV format
 */
export async function exportTasksToCSV(
  listId: string,
  options: ExportCSVOptions = {}
): Promise<string> {
  const {
    archived = false,
    include_closed = false,
    statuses,
    custom_fields,
    include_standard_fields = true
  } = options;

  const limit = MAX_LIMIT;
  let offset = 0;
  let allTasks: ClickUpTask[] = [];
  let hasMore = true;

  // Step 1: Fetch all tasks with pagination
  while (hasMore) {
    const queryParams: any = {
      archived,
      include_closed,
      page: Math.floor(offset / limit)
    };

    const data = await makeApiRequest<{ tasks: ClickUpTask[] }>(
      `list/${listId}/task`,
      "GET",
      undefined,
      queryParams
    );

    const tasks = data.tasks || [];
    allTasks.push(...tasks);

    hasMore = tasks.length === limit;
    offset += limit;
  }

  // Step 2: Filter by status if specified
  if (statuses && statuses.length > 0) {
    allTasks = filterTasksByStatus(allTasks, statuses);
  }

  if (allTasks.length === 0) {
    return ''; // Return empty CSV if no tasks
  }

  // Step 3: Build field order and headers
  const standardFields = [
    'Task ID',
    'Name',
    'Status',
    'Date Created',
    'Date Updated',
    'URL',
    'Assignees',
    'Creator',
    'Due Date',
    'Priority',
    'Description',
    'Tags'
  ];

  // Collect all custom field names from tasks
  const allCustomFieldNames = new Set<string>();
  for (const task of allTasks) {
    if (task.custom_fields) {
      for (const field of task.custom_fields) {
        allCustomFieldNames.add(field.name);
      }
    }
  }

  // Determine which custom fields to include
  const customFieldsToInclude = custom_fields && custom_fields.length > 0
    ? custom_fields.filter(name => allCustomFieldNames.has(name))
    : Array.from(allCustomFieldNames);

  // Build field order
  const fieldOrder: string[] = [];
  if (include_standard_fields) {
    fieldOrder.push(...standardFields);
  }
  fieldOrder.push(...customFieldsToInclude);

  // Step 4: Build CSV
  const csvRows: string[] = [];
  
  // Headers
  csvRows.push(fieldOrder.map(escapeCSV).join(','));
  
  // Data rows
  for (const task of allTasks) {
    const row = taskToCSVRow(task, fieldOrder);
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}
