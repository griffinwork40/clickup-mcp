/**
 * @file task-operations.ts
 * @description Task counting and CSV export operations for ClickUp MCP server.
 * This module provides functions for counting tasks and exporting to CSV.
 */

import type { ClickUpTask } from "../types.js";
import { MAX_LIMIT } from "../constants.js";
import { makeApiRequest } from "./api-helpers.js";
import { filterTasksByStatus } from "./response-utils.js";
import { escapeCSV, taskToCSVRow, type ExportCSVOptions } from "./custom-field-formatters.js";

/**
 * Options for counting tasks by status.
 * 
 * @interface CountTasksOptions
 * @property {boolean} [archived] - Include archived tasks
 * @property {boolean} [include_closed] - Include closed tasks
 * @property {string[]} [statuses] - Filter by specific status names
 */
export interface CountTasksOptions {
  archived?: boolean;
  include_closed?: boolean;
  statuses?: string[];
}

/**
 * Result of counting tasks by status.
 * 
 * @interface CountTasksResult
 * @property {number} total - Total number of tasks counted
 * @property {Record<string, number>} by_status - Count breakdown by status name
 */
export interface CountTasksResult {
  total: number;
  by_status: Record<string, number>;
}

/**
 * Counts tasks in a list by status with automatic pagination handling.
 * 
 * @param {string} listId - The ClickUp list ID
 * @param {CountTasksOptions} [options={}] - Counting options
 * @returns {Promise<CountTasksResult>} Total count and breakdown by status
 * @throws {Error} If the API request fails
 */
export async function countTasksByStatus(
  listId: string,
  options: CountTasksOptions = {}
): Promise<CountTasksResult> {
  const { archived = false, include_closed = false, statuses } = options;
  const limit = 100;
  let offset = 0;
  let allTasks: ClickUpTask[] = [];
  let hasMore = true;

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

  let filteredTasks = allTasks;
  if (statuses && statuses.length > 0) {
    filteredTasks = filterTasksByStatus(allTasks, statuses);
  }

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
 * Exports tasks from a ClickUp list to CSV format.
 * 
 * @param {string} listId - ClickUp list ID to export from
 * @param {ExportCSVOptions} [options={}] - Export configuration options
 * @returns {Promise<string>} CSV content as a string
 * @throws {Error} If the API request fails
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

  if (statuses && statuses.length > 0) {
    allTasks = filterTasksByStatus(allTasks, statuses);
  }

  if (allTasks.length === 0) {
    return '';
  }

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

  const allCustomFieldNames = new Set<string>();
  for (const task of allTasks) {
    if (task.custom_fields) {
      for (const field of task.custom_fields) {
        allCustomFieldNames.add(field.name);
      }
    }
  }

  const customFieldsToInclude = custom_fields && custom_fields.length > 0
    ? custom_fields.filter(name => allCustomFieldNames.has(name))
    : Array.from(allCustomFieldNames);

  const fieldOrder: string[] = [];
  if (include_standard_fields) {
    fieldOrder.push(...standardFields);
  }
  fieldOrder.push(...customFieldsToInclude);

  if (add_phone_number_column) {
    const phoneNumberIdx = fieldOrder.indexOf('phone_number');
    
    if (phoneNumberIdx === -1) {
      const emailIdx = fieldOrder.indexOf('Email');
      if (emailIdx >= 0) {
        fieldOrder.splice(emailIdx + 1, 0, 'phone_number');
      } else {
        fieldOrder.push('phone_number');
      }
    }
  }

  const csvRows: string[] = [];
  
  csvRows.push(fieldOrder.map(escapeCSV).join(','));
  
  for (const task of allTasks) {
    const row = taskToCSVRow(task, fieldOrder);
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}
