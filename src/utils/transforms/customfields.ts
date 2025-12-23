/**
 * Custom field extraction utilities for ClickUp MCP server.
 * Handles extracting and formatting custom field values.
 */

import type { ClickUpTask, ClickUpCustomField } from "../../types.js";
import { normalizePhoneToE164 } from "./phone.js";

/**
 * Extract value from a custom field based on its type
 * @param field - ClickUp custom field object
 * @returns Extracted value as string
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
 * @param task - ClickUp task object
 * @param fieldName - Name of the custom field
 * @param preferredType - Optional preferred field type
 * @returns Extracted field value or empty string
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
