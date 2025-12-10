/**
 * Response handling utilities for ClickUp MCP server.
 * Task summaries and response truncation.
 */

import type { ClickUpTask, TruncationInfo } from "../types.js";
import { CHARACTER_LIMIT } from "../constants.js";
import { formatPriority } from "./formatting.js";

/**
 * Generate summary statistics for a list of tasks
 */
export function generateTaskSummary(tasks: ClickUpTask[]): string {
  const lines: string[] = ["# Task Summary", "", `**Total Tasks**: ${tasks.length}`, ""];

  const statusCounts: Record<string, number> = {};
  const assigneeCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  for (const task of tasks) {
    // Count statuses
    const status = task.status.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Count assignees
    if (task.assignees?.length) {
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

  // Format breakdowns
  lines.push("## By Status");
  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push("", "## By Assignee");
  for (const [assignee, count] of Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${assignee}: ${count}`);
  }

  lines.push("", "## By Priority");
  for (const [priority, count] of Object.entries(priorityCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${priority}: ${count}`);
  }

  return lines.join("\n");
}

/**
 * Truncate response if it exceeds character limit with smart boundary detection
 */
export function truncateResponse(
  content: string,
  itemCount: number,
  itemType: string = "items"
): { content: string; truncation: TruncationInfo | null } {
  if (content.length <= CHARACTER_LIMIT) {
    return { content, truncation: null };
  }

  let truncateAt = CHARACTER_LIMIT;
  const searchStart = Math.max(0, CHARACTER_LIMIT - 1000);

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
    const lastNewline = content.lastIndexOf("\n", CHARACTER_LIMIT);
    if (lastNewline > searchStart) truncateAt = lastNewline;
  }

  const finalContent = content.substring(0, truncateAt);

  // Estimate how many items we kept
  const headerPattern = /^# .+ \(/gm;
  const keptItems = (finalContent.match(headerPattern) || []).length ||
                    Math.max(1, Math.floor(itemCount * (truncateAt / content.length)));

  const truncation: TruncationInfo = {
    truncated: true,
    original_count: itemCount,
    returned_count: keptItems,
    truncation_message: `Response truncated from ${itemCount} to ${keptItems} ${itemType} due to size limits (${CHARACTER_LIMIT.toLocaleString()} chars). Use pagination, filters, or response_mode='compact'.`
  };

  return { content: finalContent, truncation };
}

/**
 * Format truncation information as text
 */
export function formatTruncationInfo(truncation: TruncationInfo | null): string {
  if (!truncation) return "";
  return `\n\n---\n⚠️ ${truncation.truncation_message}`;
}
