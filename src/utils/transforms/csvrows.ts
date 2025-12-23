/**
 * CSV row conversion utilities for ClickUp MCP server.
 * Handles converting tasks to CSV row arrays.
 */

import type { ClickUpTask } from "../../types.js";
import { extractCustomFieldValue, getCustomField } from "./customfields.js";

/**
 * Escape CSV fields to handle commas, quotes, and newlines
 * @param value - Value to escape
 * @returns Escaped CSV field string
 */
export function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Get phone number value from task, checking multiple sources
 */
function getPhoneNumberValue(task: ClickUpTask): string {
  const realPhoneField = task.custom_fields?.find(f => f.name === 'phone_number');
  
  if (realPhoneField?.value) {
    return extractCustomFieldValue(realPhoneField);
  }
  
  // Priority: Personal Phone > Biz Phone number > first phone field
  const personalPhone = getCustomField(task, 'Personal Phone');
  if (personalPhone) return personalPhone;
  
  const bizPhone = getCustomField(task, 'Biz Phone number');
  if (bizPhone) return bizPhone;
  
  const phoneFields = task.custom_fields?.filter(f => 
    f.type === 'phone' || 
    f.type === 'phone_number' ||
    (typeof f.name === 'string' && /phone/i.test(f.name))
  ) || [];
  
  return phoneFields.length > 0 ? extractCustomFieldValue(phoneFields[0]) : '';
}

/**
 * Get standard field value from task
 */
function getStandardFieldValue(task: ClickUpTask, fieldName: string): string {
  switch (fieldName) {
    case 'Task ID': return task.id;
    case 'Name': return task.name;
    case 'Status': return task.status?.status || '';
    case 'Date Created': return task.date_created ? new Date(parseInt(task.date_created)).toISOString() : '';
    case 'Date Updated': return task.date_updated ? new Date(parseInt(task.date_updated)).toISOString() : '';
    case 'URL': return task.url || '';
    case 'Assignees': return task.assignees?.map(a => a.username || a.email).join('; ') || '';
    case 'Creator': return task.creator?.username || task.creator?.email || '';
    case 'Due Date': return task.due_date ? new Date(parseInt(task.due_date)).toISOString() : '';
    case 'Priority': return task.priority?.priority || '';
    case 'Description': return task.description || task.text_content || '';
    case 'Tags': return task.tags?.map(t => t.name).join('; ') || '';
    case 'phone_number': return getPhoneNumberValue(task);
    default: return getCustomField(task, fieldName);
  }
}

/**
 * Convert task to CSV row array
 * @param task - ClickUp task object
 * @param fieldOrder - Array of field names in order
 * @returns Array of escaped CSV values
 */
export function taskToCSVRow(task: ClickUpTask, fieldOrder: string[]): string[] {
  return fieldOrder.map(fieldName => escapeCSV(getStandardFieldValue(task, fieldName)));
}
