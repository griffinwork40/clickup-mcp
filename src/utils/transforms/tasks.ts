/**
 * Task-specific transformation utilities for ClickUp MCP server.
 * Handles task counting and aggregation operations.
 */

import type { ClickUpTask } from "../../types.js";
import { makeApiRequest } from "../api/helpers.js";
import { filterTasksByStatus } from "../validation/validators.js";

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
 * @param listId - ClickUp list ID
 * @param options - Count options
 * @returns Count result with total and breakdown by status
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
