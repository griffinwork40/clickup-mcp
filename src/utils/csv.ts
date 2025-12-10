/**
 * CSV export utilities for ClickUp MCP server.
 */

import type { ClickUpTask, ClickUpCustomField } from "../types.js";
import { MAX_LIMIT } from "../constants.js";
import { makeApiRequest } from "./api.js";
import { filterTasksByStatus } from "./tasks.js";

/** Escape CSV fields to handle commas, quotes, and newlines */
export function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Normalize phone number to E.164 format (+[1-9]\d{1,14}) */
export function normalizePhoneToE164(phone: string | null | undefined): string {
  if (!phone) return '';
  
  let normalized = String(phone).trim();
  if (!normalized) return '';
  
  // Remove extensions
  normalized = normalized.replace(/\s*(?:x|ext|extension)\s*\d+/i, '');
  
  const hasPlus = normalized.startsWith('+');
  if (hasPlus) normalized = normalized.substring(1);
  
  // Remove all non-digit characters
  normalized = normalized.replace(/\D/g, '');
  if (!normalized || normalized.startsWith('0')) return '';
  
  // Handle US/Canada numbers
  if (normalized.length === 10) {
    normalized = '1' + normalized;
  } else if (normalized.length < 10 || normalized.length > 15) {
    return '';
  }
  
  normalized = '+' + normalized;
  return /^\+[1-9]\d{1,14}$/.test(normalized) ? normalized : '';
}

/** Extract value from a custom field based on its type */
export function extractCustomFieldValue(field: ClickUpCustomField): string {
  if (!field || field.value === null || field.value === undefined || field.value === '') return '';
  
  const isPhoneField = field.type === 'phone' || field.type === 'phone_number' ||
                       (typeof field.name === 'string' && /phone/i.test(field.name));
  
  switch (field.type) {
    case 'email': case 'url': case 'text': case 'short_text':
      const textVal = String(field.value).trim();
      return isPhoneField ? normalizePhoneToE164(textVal) : textVal;
    case 'phone': case 'phone_number':
      return normalizePhoneToE164(field.value);
    case 'number': case 'currency':
      return String(field.value);
    case 'date':
      return new Date(parseInt(field.value)).toISOString().split('T')[0];
    case 'dropdown':
      return field.value?.label || field.value?.name || String(field.value || '');
    case 'labels':
      return Array.isArray(field.value) ? field.value.map((v: any) => v.label || v.name || v).join('; ') : '';
    case 'checklist':
      return Array.isArray(field.value) ? field.value.map((item: any) => item.name).join('; ') : '';
    case 'checkbox':
      return field.value ? 'Yes' : 'No';
    default:
      const val = String(field.value || '').trim();
      return isPhoneField ? normalizePhoneToE164(val) : val;
  }
}

/** Get custom field value by name */
export function getCustomField(task: ClickUpTask, fieldName: string, preferredType?: string): string {
  if (!task.custom_fields) return '';
  
  const matchingFields = task.custom_fields.filter(f => f.name === fieldName);
  if (matchingFields.length === 0) return '';
  
  if (preferredType) {
    const typedField = matchingFields.find(f => f.type === preferredType && f.value);
    if (typedField) return extractCustomFieldValue(typedField);
  }
  
  const fieldWithValue = matchingFields.find(f => f.value !== null && f.value !== undefined && f.value !== '');
  return extractCustomFieldValue(fieldWithValue || matchingFields[0]);
}

/** Convert task to CSV row array */
export function taskToCSVRow(task: ClickUpTask, fieldOrder: string[]): string[] {
  return fieldOrder.map(fieldName => {
    let value = '';
    switch (fieldName) {
      case 'Task ID': value = task.id; break;
      case 'Name': value = task.name; break;
      case 'Status': value = task.status?.status || ''; break;
      case 'Date Created': value = task.date_created ? new Date(parseInt(task.date_created)).toISOString() : ''; break;
      case 'Date Updated': value = task.date_updated ? new Date(parseInt(task.date_updated)).toISOString() : ''; break;
      case 'URL': value = task.url || ''; break;
      case 'Assignees': value = task.assignees?.map(a => a.username || a.email).join('; ') || ''; break;
      case 'Creator': value = task.creator?.username || task.creator?.email || ''; break;
      case 'Due Date': value = task.due_date ? new Date(parseInt(task.due_date)).toISOString() : ''; break;
      case 'Priority': value = task.priority?.priority || ''; break;
      case 'Description': value = task.description || task.text_content || ''; break;
      case 'Tags': value = task.tags?.map(t => t.name).join('; ') || ''; break;
      default: value = getCustomField(task, fieldName);
    }
    return escapeCSV(value);
  });
}

export interface ExportCSVOptions {
  archived?: boolean;
  include_closed?: boolean;
  statuses?: string[];
  custom_fields?: string[];
  include_standard_fields?: boolean;
}

/** Export tasks to CSV format */
export async function exportTasksToCSV(listId: string, options: ExportCSVOptions = {}): Promise<string> {
  const { archived = false, include_closed = false, statuses, custom_fields, include_standard_fields = true } = options;

  let allTasks: ClickUpTask[] = [];
  let offset = 0;
  let hasMore = true;

  // Fetch all tasks with pagination
  while (hasMore) {
    const data = await makeApiRequest<{ tasks: ClickUpTask[] }>(
      `list/${listId}/task`, "GET", undefined,
      { archived, include_closed, page: Math.floor(offset / MAX_LIMIT) }
    );
    const tasks = data.tasks || [];
    allTasks.push(...tasks);
    hasMore = tasks.length === MAX_LIMIT;
    offset += MAX_LIMIT;
  }

  // Filter by status if specified
  if (statuses?.length) allTasks = filterTasksByStatus(allTasks, statuses);
  if (allTasks.length === 0) return '';

  // Build field order
  const standardFields = ['Task ID', 'Name', 'Status', 'Date Created', 'Date Updated', 'URL',
                          'Assignees', 'Creator', 'Due Date', 'Priority', 'Description', 'Tags'];

  const allCustomFieldNames = new Set<string>();
  for (const task of allTasks) {
    task.custom_fields?.forEach(f => allCustomFieldNames.add(f.name));
  }

  const customFieldsToInclude = custom_fields?.length
    ? custom_fields.filter(name => allCustomFieldNames.has(name))
    : Array.from(allCustomFieldNames);

  const fieldOrder = include_standard_fields ? [...standardFields, ...customFieldsToInclude] : customFieldsToInclude;

  // Build CSV
  const csvRows = [fieldOrder.map(escapeCSV).join(',')];
  for (const task of allTasks) {
    csvRows.push(taskToCSVRow(task, fieldOrder).join(','));
  }

  return csvRows.join('\n');
}
