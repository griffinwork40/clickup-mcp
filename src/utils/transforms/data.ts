/**
 * Data transformation utilities for ClickUp MCP server.
 * Handles pagination and summary generation.
 */

import type { ClickUpTask, PaginationInfo } from "../../types.js";
import { formatPriority } from "../formatters/text.js";

/**
 * Extract pagination information from response
 * @param total - Total number of items (may be undefined)
 * @param count - Number of items returned in this page
 * @param offset - Current offset
 * @param limit - Page size limit
 * @returns Pagination info object
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
 * @param tasks - Array of ClickUp tasks
 * @returns Markdown formatted summary string
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
