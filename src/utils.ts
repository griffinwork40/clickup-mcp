/**
 * Shared utility functions for ClickUp MCP server.
 */

import axios, { AxiosError } from "axios";
import { API_BASE_URL, CHARACTER_LIMIT, DEFAULT_TIMEOUT, MAX_LIMIT, ResponseFormat, ResponseMode } from "./constants.js";
import type {
  ClickUpTask,
  ClickUpList,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpComment,
  ClickUpTimeEntry,
  PaginationInfo,
  TruncationInfo,
  ClickUpCustomField
} from "./types.js";

/**
 * Get ClickUp API token from environment
 */
export function getApiToken(): string {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error("CLICKUP_API_TOKEN environment variable is required");
  }
  return token;
}

/**
 * Make an authenticated request to the ClickUp API
 */
export async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any
): Promise<T> {
  try {
    const token = getApiToken();
    const response = await axios({
      method,
      url: `${API_BASE_URL}/${endpoint}`,
      data,
      params,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Convert API errors to user-friendly messages
 */
export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return `Error: Bad request. ${data?.err || "Check your parameters and try again."}`;
        case 401:
          return "Error: Invalid or missing API token. Please check your CLICKUP_API_TOKEN environment variable.";
        case 403:
          return "Error: Permission denied. You don't have access to this resource.";
        case 404:
          return `Error: Resource not found. ${data?.err || "Please check the ID is correct."}`;
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests. ClickUp allows 100 requests/minute (Business) or 1000/minute (Business Plus+).";
        case 500:
        case 502:
        case 503:
          return "Error: ClickUp server error. Please try again later or check https://status.clickup.com";
        default:
          return `Error: API request failed with status ${status}. ${data?.err || ""}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return "Error: Cannot connect to ClickUp API. Please check your internet connection.";
    }
  }

  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Format a timestamp as human-readable date
 */
export function formatDate(timestamp: string | number | undefined): string {
  if (!timestamp) return "Not set";

  const date = new Date(typeof timestamp === "string" ? parseInt(timestamp) : timestamp);
  return date.toISOString().replace("T", " ").substring(0, 19) + " UTC";
}

/**
 * Format priority value as human-readable string
 */
export function formatPriority(priority?: { priority: string; color: string }): string {
  if (!priority) return "None";
  return priority.priority;
}

/**
 * Format a task as markdown (full detail)
 */
export function formatTaskMarkdown(task: ClickUpTask): string {
  const lines: string[] = [];

  lines.push(`# ${task.name} (${task.id})`);
  lines.push("");
  lines.push(`**Status**: ${task.status.status}`);
  lines.push(`**Priority**: ${formatPriority(task.priority)}`);
  lines.push(`**Created**: ${formatDate(task.date_created)}`);
  lines.push(`**Updated**: ${formatDate(task.date_updated)}`);

  if (task.due_date) {
    lines.push(`**Due Date**: ${formatDate(task.due_date)}`);
  }

  if (task.assignees && task.assignees.length > 0) {
    const assigneeNames = task.assignees.map(a => `@${a.username} (${a.id})`).join(", ");
    lines.push(`**Assignees**: ${assigneeNames}`);
  }

  if (task.tags && task.tags.length > 0) {
    const tagNames = task.tags.map(t => t.name).join(", ");
    lines.push(`**Tags**: ${tagNames}`);
  }

  if (task.description) {
    lines.push("");
    lines.push("## Description");
    lines.push(task.description);
  }

  lines.push("");
  lines.push(`**URL**: ${task.url}`);

  return lines.join("\n");
}

/**
 * Format a task as compact markdown (essential fields only)
 */
export function formatTaskCompact(task: ClickUpTask): string {
  const assignees = task.assignees && task.assignees.length > 0
    ? task.assignees.map(a => a.username).join(", ")
    : "Unassigned";

  return `- **${task.name}** (${task.id}) | Status: ${task.status.status} | Assignees: ${assignees} | URL: ${task.url}`;
}

/**
 * Format a list as markdown
 */
export function formatListMarkdown(list: ClickUpList): string {
  const lines: string[] = [];

  lines.push(`# ${list.name} (${list.id})`);
  lines.push("");
  lines.push(`**Tasks**: ${list.task_count}`);

  if (list.folder) {
    lines.push(`**Folder**: ${list.folder.name}`);
  }

  if (list.space) {
    lines.push(`**Space**: ${list.space.name}`);
  }

  if (list.statuses && list.statuses.length > 0) {
    lines.push("");
    lines.push("## Statuses");
    for (const status of list.statuses) {
      lines.push(`- ${status.status} (${status.type})`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a space as markdown
 */
export function formatSpaceMarkdown(space: ClickUpSpace): string {
  const lines: string[] = [];

  lines.push(`# ${space.name} (${space.id})`);
  lines.push("");
  lines.push(`**Private**: ${space.private ? "Yes" : "No"}`);
  lines.push(`**Multiple Assignees**: ${space.multiple_assignees ? "Yes" : "No"}`);

  if (space.features) {
    lines.push("");
    lines.push("## Features");
    lines.push(`- Due Dates: ${space.features.due_dates?.enabled ? "Enabled" : "Disabled"}`);
    lines.push(`- Time Tracking: ${space.features.time_tracking?.enabled ? "Enabled" : "Disabled"}`);
    lines.push(`- Tags: ${space.features.tags?.enabled ? "Enabled" : "Disabled"}`);
    lines.push(`- Custom Fields: ${space.features.custom_fields?.enabled ? "Enabled" : "Disabled"}`);
  }

  return lines.join("\n");
}

/**
 * Format a folder as markdown
 */
export function formatFolderMarkdown(folder: ClickUpFolder): string {
  const lines: string[] = [];

  lines.push(`# ${folder.name} (${folder.id})`);
  lines.push("");
  lines.push(`**Tasks**: ${folder.task_count}`);
  lines.push(`**Hidden**: ${folder.hidden ? "Yes" : "No"}`);

  if (folder.space) {
    lines.push(`**Space**: ${folder.space.name}`);
  }

  if (folder.lists && folder.lists.length > 0) {
    lines.push("");
    lines.push("## Lists");
    for (const list of folder.lists) {
      lines.push(`- ${list.name} (${list.id}) - ${list.task_count} tasks`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a comment as markdown
 */
export function formatCommentMarkdown(comment: ClickUpComment): string {
  const lines: string[] = [];

  lines.push(`**@${comment.user.username}** (${formatDate(comment.date)})`);
  lines.push(comment.comment_text);

  if (comment.resolved) {
    lines.push("*(Resolved)*");
  }

  return lines.join("\n");
}

/**
 * Format a time entry as markdown
 */
export function formatTimeEntryMarkdown(entry: ClickUpTimeEntry): string {
  const lines: string[] = [];

  const hours = Math.floor(parseInt(entry.duration) / 3600000);
  const minutes = Math.floor((parseInt(entry.duration) % 3600000) / 60000);
  const durationStr = `${hours}h ${minutes}m`;

  lines.push(`**@${entry.user.username}** - ${durationStr}`);
  lines.push(`- Start: ${formatDate(entry.start)}`);

  if (entry.end) {
    lines.push(`- End: ${formatDate(entry.end)}`);
  } else {
    lines.push("- End: *(Still running)*");
  }

  if (entry.task) {
    lines.push(`- Task: ${entry.task.name} (${entry.task.id})`);
  }

  if (entry.description) {
    lines.push(`- Description: ${entry.description}`);
  }

  lines.push(`- Billable: ${entry.billable ? "Yes" : "No"}`);

  return lines.join("\n");
}

/**
 * Extract pagination information from response
 */
export function getPagination(
  total: number | undefined,
  count: number,
  offset: number,
  limit: number
): PaginationInfo {
  const hasMore = total ? (offset + count < total) : count === limit;

  return {
    total,
    count,
    offset,
    has_more: hasMore,
    next_offset: hasMore ? offset + count : undefined
  };
}

/**
 * Generate summary statistics for a list of tasks
 */
export function generateTaskSummary(tasks: ClickUpTask[]): string {
  const lines: string[] = [];

  lines.push("# Task Summary");
  lines.push("");
  lines.push(`**Total Tasks**: ${tasks.length}`);
  lines.push("");

  // Group by status
  const statusCounts: Record<string, number> = {};
  const assigneeCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  for (const task of tasks) {
    // Count statuses
    const status = task.status.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Count assignees
    if (task.assignees && task.assignees.length > 0) {
      for (const assignee of task.assignees) {
        assigneeCounts[assignee.username] = (assigneeCounts[assignee.username] || 0) + 1;
      }
    } else {
      assigneeCounts["Unassigned"] = (assigneeCounts["Unassigned"] || 0) + 1;
    }

    // Count priorities
    const priority = formatPriority(task.priority);
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
  }

  // Format status breakdown
  lines.push("## By Status");
  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${status}: ${count}`);
  }

  // Format assignee breakdown
  lines.push("");
  lines.push("## By Assignee");
  for (const [assignee, count] of Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${assignee}: ${count}`);
  }

  // Format priority breakdown
  lines.push("");
  lines.push("## By Priority");
  for (const [priority, count] of Object.entries(priorityCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${priority}: ${count}`);
  }

  return lines.join("\n");
}

/**
 * Truncate JSON response by removing items from arrays
 */
function truncateJsonResponse(
  content: string,
  itemCount: number,
  itemType: string = "items"
): { content: string; truncation: TruncationInfo | null } {
  try {
    const data = JSON.parse(content);
    
    // Find the main array (tasks, conversations, etc.)
    const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
    if (!arrayKey || !Array.isArray(data[arrayKey])) {
      // If no array found, fall back to string truncation
      throw new Error('No array found in JSON');
    }
    
    const items = data[arrayKey];
    let keptItems = items.length;
    
    // Remove items one by one until we're under the limit
    // IMPORTANT: Check size of PRETTY-PRINTED JSON since that's what we return
    while (JSON.stringify(data, null, 2).length > CHARACTER_LIMIT && data[arrayKey].length > 1) {
      data[arrayKey].pop();
      keptItems = data[arrayKey].length;
    }
    
    const finalContent = JSON.stringify(data, null, 2);
    
    // Check if even a single item exceeds the limit
    if (finalContent.length > CHARACTER_LIMIT) {
      // Single item is too large - truncate the item's description/content fields
      if (data[arrayKey].length === 1 && typeof data[arrayKey][0] === 'object') {
        const item = data[arrayKey][0];
        // Truncate large text fields
        for (const key of Object.keys(item)) {
          if (typeof item[key] === 'string' && item[key].length > 10000) {
            item[key] = item[key].substring(0, 10000) + '... [truncated]';
          }
        }
        // Retry serialization
        const compactContent = JSON.stringify(data, null, 2);
        if (compactContent.length <= CHARACTER_LIMIT) {
          const truncation: TruncationInfo = {
            truncated: true,
            original_count: itemCount,
            returned_count: 1,
            truncation_message: `Large ${itemType} fields were truncated to fit size limits (${CHARACTER_LIMIT.toLocaleString()} chars).`
          };
          return { content: compactContent, truncation };
        }
      }
      // Still too large - fall back to markdown truncation
      return truncateMarkdownResponse(content, itemCount, itemType);
    }
    
    if (keptItems < items.length) {
      const truncation: TruncationInfo = {
        truncated: true,
        original_count: items.length,
        returned_count: keptItems,
        truncation_message: `Response truncated from ${items.length} to ${keptItems} ${itemType} due to size limits (${CHARACTER_LIMIT.toLocaleString()} chars). Use pagination (offset/limit), add filters, or use response_mode='compact' to see more results.`
      };
      return { content: finalContent, truncation };
    }
    
    return { content: finalContent, truncation: null };
  } catch {
    // If JSON parsing fails, fall back to string truncation
    return truncateMarkdownResponse(content, itemCount, itemType);
  }
}

/**
 * Truncate markdown response if it exceeds character limit with smart boundary detection
 */
function truncateMarkdownResponse(
  content: string,
  itemCount: number,
  itemType: string = "items"
): { content: string; truncation: TruncationInfo | null } {
  if (content.length <= CHARACTER_LIMIT) {
    return { content, truncation: null };
  }

  // Find a good boundary to truncate at (look for task separators or major section breaks)
  let truncateAt = CHARACTER_LIMIT;
  const searchStart = Math.max(0, CHARACTER_LIMIT - 1000); // Look back up to 1000 chars

  // Look for markdown headers or horizontal rules as good break points
  const potentialBreaks = [
    content.lastIndexOf("\n# ", truncateAt),
    content.lastIndexOf("\n## ", truncateAt),
    content.lastIndexOf("\n---\n", truncateAt),
    content.lastIndexOf("\n\n", truncateAt)
  ].filter(pos => pos >= searchStart);

  if (potentialBreaks.length > 0) {
    truncateAt = Math.max(...potentialBreaks);
  } else {
    // Fallback to last newline
    const lastNewline = content.lastIndexOf("\n", CHARACTER_LIMIT);
    if (lastNewline > searchStart) {
      truncateAt = lastNewline;
    }
  }

  const finalContent = content.substring(0, truncateAt);

  // Count how many complete items we kept by counting separators/headers
  const headerPattern = /^# .+ \(/gm;
  const keptItems = (finalContent.match(headerPattern) || []).length ||
                    Math.max(1, Math.floor(itemCount * (truncateAt / content.length)));

  const truncation: TruncationInfo = {
    truncated: true,
    original_count: itemCount,
    returned_count: keptItems,
    truncation_message: `Response truncated from ${itemCount} to ${keptItems} ${itemType} due to size limits (${CHARACTER_LIMIT.toLocaleString()} chars). Use pagination (offset/limit), add filters, or use response_mode='compact' to see more results.`
  };

  return { content: finalContent, truncation };
}

/**
 * Truncate response if it exceeds character limit with smart boundary detection
 * Detects format and uses appropriate truncation strategy
 */
export function truncateResponse(
  content: string,
  itemCount: number,
  itemType: string = "items"
): { content: string; truncation: TruncationInfo | null } {
  if (content.length <= CHARACTER_LIMIT) {
    return { content, truncation: null };
  }
  
  // Detect if content is JSON by checking first non-whitespace character
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return truncateJsonResponse(content, itemCount, itemType);
  }
  
  return truncateMarkdownResponse(content, itemCount, itemType);
}

/**
 * Format truncation information as text
 */
export function formatTruncationInfo(truncation: TruncationInfo | null): string {
  if (!truncation) return "";

  return `\n\n---\n⚠️ ${truncation.truncation_message}`;
}

/**
 * Filter tasks by status names (client-side filtering)
 */
export function filterTasksByStatus(tasks: ClickUpTask[], statuses: string[]): ClickUpTask[] {
  if (!statuses || statuses.length === 0) {
    return tasks;
  }

  return tasks.filter(task => {
    const taskStatus = task.status?.status;
    return taskStatus && statuses.includes(taskStatus);
  });
}

/**
 * Options for counting tasks by status
 */
export interface CountTasksOptions {
  archived?: boolean;
  include_closed?: boolean;
  statuses?: string[];
}

/**
 * Result of counting tasks by status
 */
export interface CountTasksResult {
  total: number;
  by_status: Record<string, number>;
}

/**
 * Count tasks in a list by status, handling pagination internally
 */
export async function countTasksByStatus(
  listId: string,
  options: CountTasksOptions = {}
): Promise<CountTasksResult> {
  const { archived = false, include_closed = false, statuses } = options;
  const limit = 100; // Use max limit for efficiency
  let offset = 0;
  let allTasks: ClickUpTask[] = [];
  let hasMore = true;

  // Fetch all tasks with pagination
  while (hasMore) {
    const queryParams: any = {
      archived,
      include_closed,
      page: Math.floor(offset / limit)
    };

    try {
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
    } catch (error) {
      throw error;
    }
  }

  // Filter by status if specified
  let filteredTasks = allTasks;
  if (statuses && statuses.length > 0) {
    filteredTasks = filterTasksByStatus(allTasks, statuses);
  }

  // Count by status
  const byStatus: Record<string, number> = {};
  for (const task of filteredTasks) {
    const status = task.status?.status || "Unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;
  }

  return {
    total: filteredTasks.length,
    by_status: byStatus
  };
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
  add_phone_number_column?: boolean;
}

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
    include_standard_fields = true,
    add_phone_number_column = false
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

    try {
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
    } catch (error) {
      throw error;
    }
  }

  // Step 2: Filter by status if specified
  if (statuses && statuses.length > 0) {
    allTasks = filterTasksByStatus(allTasks, statuses);
  }

  if (allTasks.length === 0) {
    return ''; // Return empty CSV if no tasks
  }

  // Note: The list endpoint already returns custom fields with values,
  // so we don't need to fetch individual task details!

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

  // Add phone_number column if requested (for ElevenLabs compatibility)
  if (add_phone_number_column) {
    // Check if phone_number already exists (e.g., as a real custom field)
    const phoneNumberIdx = fieldOrder.indexOf('phone_number');
    
    if (phoneNumberIdx === -1) {
      // phone_number doesn't exist, add our synthetic one
      // Find Email index to insert after it
      const emailIdx = fieldOrder.indexOf('Email');
      if (emailIdx >= 0) {
        fieldOrder.splice(emailIdx + 1, 0, 'phone_number');
      } else {
        // If no Email field, add at the end
        fieldOrder.push('phone_number');
      }
    }
    // If phone_number already exists, use the existing one (no duplicate needed)
  }

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
