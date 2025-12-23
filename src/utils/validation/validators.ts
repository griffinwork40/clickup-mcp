/**
 * Validation and filtering utilities for ClickUp MCP server.
 * Handles client-side filtering of task data.
 */

import type { ClickUpTask } from "../../types.js";

/**
 * Filter tasks by status names (client-side filtering)
 * @param tasks - Array of tasks to filter
 * @param statuses - Array of status names to match
 * @returns Filtered array of tasks
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
