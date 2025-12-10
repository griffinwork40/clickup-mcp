/**
 * Task-specific utilities for ClickUp MCP server.
 * Handles filtering, counting, and pagination.
 */

import type { ClickUpTask, PaginationInfo } from "../types.js";
import { MAX_LIMIT } from "../constants.js";
import { makeApiRequest } from "./api.js";

/**
 * Filter tasks by status names (client-side filtering with case-insensitive matching)
 */
export function filterTasksByStatus(tasks: ClickUpTask[], statuses: string[]): ClickUpTask[] {
  if (!statuses || statuses.length === 0) {
    return tasks;
  }

  // Normalize status names for case-insensitive comparison
  const normalizedStatuses = statuses.map(s => s.toLowerCase().trim());

  return tasks.filter(task => {
    const taskStatus = task.status?.status?.toLowerCase().trim();
    return taskStatus && normalizedStatuses.includes(taskStatus);
  });
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
  const limit = MAX_LIMIT;
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
