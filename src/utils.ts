/**
 * Shared utility functions for ClickUp MCP server.
 */

import axios, { AxiosError } from "axios";
import { API_BASE_URL, CHARACTER_LIMIT, DEFAULT_TIMEOUT, ResponseFormat, ResponseMode } from "./constants.js";
import type {
  ClickUpTask,
  ClickUpList,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpComment,
  ClickUpTimeEntry,
  PaginationInfo,
  TruncationInfo
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
 * Format truncation information as text
 */
export function formatTruncationInfo(truncation: TruncationInfo | null): string {
  if (!truncation) return "";

  return `\n\n---\n⚠️ ${truncation.truncation_message}`;
}
