/**
 * CSV export utilities for ClickUp MCP server.
 * Handles full CSV generation from ClickUp lists.
 */

import type { ClickUpTask } from "../../types.js";
import { MAX_LIMIT } from "../../constants.js";
import { makeApiRequest } from "../api/helpers.js";
import { filterTasksByStatus } from "../validation/validators.js";
import { escapeCSV, taskToCSVRow } from "./csvrows.js";

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

/** Standard CSV fields for tasks */
const STANDARD_FIELDS = [
  'Task ID', 'Name', 'Status', 'Date Created', 'Date Updated',
  'URL', 'Assignees', 'Creator', 'Due Date', 'Priority', 'Description', 'Tags'
];

/**
 * Fetch all tasks from a list with pagination
 */
async function fetchAllTasks(listId: string, archived: boolean, includeClosed: boolean): Promise<ClickUpTask[]> {
  const limit = MAX_LIMIT;
  let offset = 0;
  const allTasks: ClickUpTask[] = [];
  let hasMore = true;

  while (hasMore) {
    const data = await makeApiRequest<{ tasks: ClickUpTask[] }>(
      `list/${listId}/task`, "GET", undefined,
      { archived, include_closed: includeClosed, page: Math.floor(offset / limit) }
    );
    const tasks = data.tasks || [];
    allTasks.push(...tasks);
    hasMore = tasks.length === limit;
    offset += limit;
  }

  return allTasks;
}

/**
 * Build field order array for CSV export
 */
function buildFieldOrder(
  tasks: ClickUpTask[],
  customFields: string[] | undefined,
  includeStandard: boolean,
  addPhone: boolean
): string[] {
  // Collect all custom field names
  const allCustomFieldNames = new Set<string>();
  for (const task of tasks) {
    task.custom_fields?.forEach(f => allCustomFieldNames.add(f.name));
  }

  const fieldsToInclude = customFields?.length
    ? customFields.filter(name => allCustomFieldNames.has(name))
    : Array.from(allCustomFieldNames);

  const fieldOrder: string[] = [];
  if (includeStandard) fieldOrder.push(...STANDARD_FIELDS);
  fieldOrder.push(...fieldsToInclude);

  // Add phone_number column if requested
  if (addPhone && !fieldOrder.includes('phone_number')) {
    const emailIdx = fieldOrder.indexOf('Email');
    if (emailIdx >= 0) {
      fieldOrder.splice(emailIdx + 1, 0, 'phone_number');
    } else {
      fieldOrder.push('phone_number');
    }
  }

  return fieldOrder;
}

/**
 * Export tasks to CSV format
 * @param listId - ClickUp list ID
 * @param options - Export options
 * @returns CSV content as string
 */
export async function exportTasksToCSV(listId: string, options: ExportCSVOptions = {}): Promise<string> {
  const {
    archived = false, include_closed = false, statuses,
    custom_fields, include_standard_fields = true, add_phone_number_column = false
  } = options;

  let tasks = await fetchAllTasks(listId, archived, include_closed);

  if (statuses?.length) {
    tasks = filterTasksByStatus(tasks, statuses);
  }

  if (tasks.length === 0) return '';

  const fieldOrder = buildFieldOrder(tasks, custom_fields, include_standard_fields, add_phone_number_column);

  // Build CSV: headers + rows
  const csvRows = [fieldOrder.map(escapeCSV).join(',')];
  for (const task of tasks) {
    csvRows.push(taskToCSVRow(task, fieldOrder).join(','));
  }

  return csvRows.join('\n');
}

// Re-export for convenience
export { escapeCSV, taskToCSVRow } from "./csvrows.js";
