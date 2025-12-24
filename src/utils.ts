/**
 * @file utils.ts
 * @description Shared utility functions for ClickUp MCP server.
 * This module provides helper functions for API communication, response formatting,
 * data transformation, and CSV export capabilities.
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
 * Retrieves the ClickUp API token from environment variables.
 * 
 * @description Checks for the CLICKUP_API_TOKEN environment variable and returns it.
 * This token is required for authenticating all ClickUp API requests.
 * 
 * @returns {string} The ClickUp API token
 * @throws {Error} If CLICKUP_API_TOKEN environment variable is not set
 * 
 * @example
 * try {
 *   const token = getApiToken();
 *   console.log("Token retrieved successfully");
 * } catch (error) {
 *   console.error("API token not configured");
 * }
 */
export function getApiToken(): string {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error("CLICKUP_API_TOKEN environment variable is required");
  }
  return token;
}

/**
 * Makes an authenticated request to the ClickUp API.
 * 
 * @description Sends an HTTP request to the ClickUp API v2 with automatic
 * authentication using the configured API token. Supports all HTTP methods
 * and handles request/response serialization.
 * 
 * @template T - The expected response type
 * @param {string} endpoint - API endpoint path (without base URL)
 * @param {"GET" | "POST" | "PUT" | "DELETE"} [method="GET"] - HTTP method
 * @param {any} [data] - Request body data for POST/PUT requests
 * @param {any} [params] - URL query parameters
 * @returns {Promise<T>} The parsed API response
 * @throws {AxiosError} If the API request fails
 * 
 * @example
 * // GET request
 * const teams = await makeApiRequest<{ teams: ClickUpTeam[] }>("team");
 * 
 * @example
 * // POST request with data
 * const task = await makeApiRequest<ClickUpTask>(
 *   "list/123/task",
 *   "POST",
 *   { name: "New Task", description: "Task description" }
 * );
 * 
 * @example
 * // GET request with query parameters
 * const tasks = await makeApiRequest<{ tasks: ClickUpTask[] }>(
 *   "list/123/task",
 *   "GET",
 *   undefined,
 *   { archived: false, page: 0 }
 * );
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
 * Converts API errors to user-friendly error messages.
 * 
 * @description Analyzes error responses from the ClickUp API and returns
 * appropriate human-readable error messages. Handles common HTTP status codes,
 * network errors, and timeout conditions.
 * 
 * @param {unknown} error - The error object to handle
 * @returns {string} A user-friendly error message
 * 
 * @example
 * try {
 *   await makeApiRequest("team/invalid");
 * } catch (error) {
 *   const message = handleApiError(error);
 *   // Returns: "Error: Resource not found. Please check the ID is correct."
 * }
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
 * Formats a Unix timestamp as a human-readable date string.
 * 
 * @description Converts a Unix timestamp (milliseconds) to an ISO-like date string
 * in UTC timezone. Returns "Not set" for undefined or falsy values.
 * 
 * @param {string | number | undefined} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string (YYYY-MM-DD HH:MM:SS UTC) or "Not set"
 * 
 * @example
 * formatDate("1609459200000"); // Returns: "2021-01-01 00:00:00 UTC"
 * formatDate(undefined);       // Returns: "Not set"
 */
export function formatDate(timestamp: string | number | undefined): string {
  if (!timestamp) return "Not set";

  const date = new Date(typeof timestamp === "string" ? parseInt(timestamp) : timestamp);
  return date.toISOString().replace("T", " ").substring(0, 19) + " UTC";
}

/**
 * Formats a priority object as a human-readable string.
 * 
 * @description Extracts the priority label from a ClickUp priority object.
 * Returns "None" if no priority is set.
 * 
 * @param {{ priority: string; color: string } | undefined} priority - Priority object
 * @returns {string} Priority label or "None"
 * 
 * @example
 * formatPriority({ priority: "high", color: "#f9d900" }); // Returns: "high"
 * formatPriority(undefined); // Returns: "None"
 */
export function formatPriority(priority?: { priority: string; color: string }): string {
  if (!priority) return "None";
  return priority.priority;
}

/**
 * Formats a task as detailed markdown output.
 * 
 * @description Generates comprehensive markdown-formatted output for a task,
 * including name, status, priority, dates, assignees, tags, description, and URL.
 * Used for full detail display of individual tasks.
 * 
 * @param {ClickUpTask} task - The task to format
 * @returns {string} Markdown-formatted task details
 * 
 * @example
 * const markdown = formatTaskMarkdown(task);
 * // Returns:
 * // # Task Name (abc123)
 * //
 * // **Status**: in progress
 * // **Priority**: high
 * // ...
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
 * Formats a task as compact single-line markdown.
 * 
 * @description Generates a condensed single-line representation of a task
 * with essential fields only: name, ID, status, assignees, and URL.
 * Ideal for displaying large lists of tasks.
 * 
 * @param {ClickUpTask} task - The task to format
 * @returns {string} Single-line markdown task summary
 * 
 * @example
 * const compact = formatTaskCompact(task);
 * // Returns: "- **Task Name** (abc123) | Status: in progress | Assignees: john | URL: ..."
 */
export function formatTaskCompact(task: ClickUpTask): string {
  const assignees = task.assignees && task.assignees.length > 0
    ? task.assignees.map(a => a.username).join(", ")
    : "Unassigned";

  return `- **${task.name}** (${task.id}) | Status: ${task.status.status} | Assignees: ${assignees} | URL: ${task.url}`;
}

/**
 * Formats a list as detailed markdown output.
 * 
 * @description Generates markdown-formatted output for a ClickUp list,
 * including name, task count, parent folder/space, and available statuses.
 * 
 * @param {ClickUpList} list - The list to format
 * @returns {string} Markdown-formatted list details
 * 
 * @example
 * const markdown = formatListMarkdown(list);
 * // Returns:
 * // # List Name (123)
 * //
 * // **Tasks**: 42
 * // **Folder**: Sprint 1
 * // ...
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
 * Formats a space as detailed markdown output.
 * 
 * @description Generates markdown-formatted output for a ClickUp space,
 * including name, privacy settings, and enabled features.
 * 
 * @param {ClickUpSpace} space - The space to format
 * @returns {string} Markdown-formatted space details
 * 
 * @example
 * const markdown = formatSpaceMarkdown(space);
 * // Returns:
 * // # Space Name (789)
 * //
 * // **Private**: No
 * // **Multiple Assignees**: Yes
 * // ...
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
 * Formats a folder as detailed markdown output.
 * 
 * @description Generates markdown-formatted output for a ClickUp folder,
 * including name, task count, visibility, parent space, and contained lists.
 * 
 * @param {ClickUpFolder} folder - The folder to format
 * @returns {string} Markdown-formatted folder details
 * 
 * @example
 * const markdown = formatFolderMarkdown(folder);
 * // Returns:
 * // # Folder Name (456)
 * //
 * // **Tasks**: 25
 * // **Hidden**: No
 * // ...
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
 * Formats a comment as markdown output.
 * 
 * @description Generates markdown-formatted output for a task comment,
 * including author, timestamp, content, and resolution status.
 * 
 * @param {ClickUpComment} comment - The comment to format
 * @returns {string} Markdown-formatted comment
 * 
 * @example
 * const markdown = formatCommentMarkdown(comment);
 * // Returns:
 * // **@john** (2021-01-01 12:00:00 UTC)
 * // Great work on this task!
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
 * Formats a time entry as markdown output.
 * 
 * @description Generates markdown-formatted output for a time tracking entry,
 * including duration, user, start/end times, associated task, and billable status.
 * 
 * @param {ClickUpTimeEntry} entry - The time entry to format
 * @returns {string} Markdown-formatted time entry
 * 
 * @example
 * const markdown = formatTimeEntryMarkdown(entry);
 * // Returns:
 * // **@john** - 2h 30m
 * // - Start: 2021-01-01 09:00:00 UTC
 * // - End: 2021-01-01 11:30:00 UTC
 * // ...
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
 * Calculates pagination information from response data.
 * 
 * @description Generates pagination metadata including whether more results
 * are available and the offset for the next page of results.
 * 
 * @param {number | undefined} total - Total number of items available (if known)
 * @param {number} count - Number of items in current response
 * @param {number} offset - Current offset position
 * @param {number} limit - Maximum items per page
 * @returns {PaginationInfo} Pagination metadata object
 * 
 * @example
 * const pagination = getPagination(100, 20, 0, 20);
 * // Returns: { total: 100, count: 20, offset: 0, has_more: true, next_offset: 20 }
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
 * Generates summary statistics for a list of tasks.
 * 
 * @description Analyzes a collection of tasks and produces a statistical
 * summary including total count and breakdowns by status, assignee, and priority.
 * 
 * @param {ClickUpTask[]} tasks - Array of tasks to analyze
 * @returns {string} Markdown-formatted summary statistics
 * 
 * @example
 * const summary = generateTaskSummary(tasks);
 * // Returns:
 * // # Task Summary
 * //
 * // **Total Tasks**: 42
 * //
 * // ## By Status
 * // - in progress: 15
 * // - to do: 27
 * // ...
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
 * Truncates a JSON response by removing items from arrays.
 * 
 * @description Iteratively removes items from the main array in a JSON response
 * until the serialized size is under the character limit. Preserves JSON structure.
 * 
 * @param {string} content - JSON string content to truncate
 * @param {number} itemCount - Original number of items
 * @param {string} [itemType="items"] - Type name for truncation message
 * @returns {{ content: string; truncation: TruncationInfo | null }} Truncated content and metadata
 * 
 * @example
 * const result = truncateJsonResponse(jsonString, 100, "tasks");
 * if (result.truncation) {
 *   console.log(`Truncated from ${result.truncation.original_count} to ${result.truncation.returned_count}`);
 * }
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
 * Truncates a markdown response with smart boundary detection.
 * 
 * @description Truncates markdown content at logical boundaries (headers,
 * horizontal rules) rather than mid-content. Provides truncation metadata.
 * 
 * @param {string} content - Markdown string content to truncate
 * @param {number} itemCount - Original number of items
 * @param {string} [itemType="items"] - Type name for truncation message
 * @returns {{ content: string; truncation: TruncationInfo | null }} Truncated content and metadata
 * 
 * @example
 * const result = truncateMarkdownResponse(markdownString, 50, "tasks");
 * console.log(result.content); // Truncated markdown
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
 * Truncates a response if it exceeds the character limit.
 * 
 * @description Automatically detects the response format (JSON or markdown)
 * and applies the appropriate truncation strategy. Preserves as much content
 * as possible while staying under the character limit.
 * 
 * @param {string} content - Response content to potentially truncate
 * @param {number} itemCount - Original number of items in the response
 * @param {string} [itemType="items"] - Type name for truncation message
 * @returns {{ content: string; truncation: TruncationInfo | null }} Processed content and truncation info
 * 
 * @example
 * const result = truncateResponse(responseContent, 100, "tasks");
 * const output = result.content + formatTruncationInfo(result.truncation);
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
 * Formats truncation information as a user-friendly message.
 * 
 * @description Generates a formatted warning message for truncated responses.
 * Returns an empty string if no truncation occurred.
 * 
 * @param {TruncationInfo | null} truncation - Truncation metadata or null
 * @returns {string} Formatted truncation warning or empty string
 * 
 * @example
 * const message = formatTruncationInfo(truncation);
 * // Returns: "\n\n---\n⚠️ Response truncated from 100 to 42 tasks..."
 */
export function formatTruncationInfo(truncation: TruncationInfo | null): string {
  if (!truncation) return "";

  return `\n\n---\n⚠️ ${truncation.truncation_message}`;
}

/**
 * Filters tasks by status names using client-side filtering.
 * 
 * @description Filters an array of tasks to only include those matching
 * the specified status names. Used as a fallback when API-side filtering fails.
 * 
 * @param {ClickUpTask[]} tasks - Array of tasks to filter
 * @param {string[]} statuses - Status names to filter by
 * @returns {ClickUpTask[]} Filtered array of tasks
 * 
 * @example
 * const filtered = filterTasksByStatus(tasks, ["in progress", "review"]);
 * console.log(`${filtered.length} tasks match the status filter`);
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
 * @description Fetches all tasks from a list using pagination and returns
 * counts grouped by status. Optionally filters by specific status names.
 * 
 * @param {string} listId - The ClickUp list ID
 * @param {CountTasksOptions} [options={}] - Counting options
 * @returns {Promise<CountTasksResult>} Total count and breakdown by status
 * @throws {Error} If the API request fails
 * 
 * @example
 * const counts = await countTasksByStatus("123456", {
 *   statuses: ["in progress", "review"],
 *   include_closed: false
 * });
 * console.log(`Total: ${counts.total}`);
 * console.log("By status:", counts.by_status);
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
 * Options for exporting tasks to CSV format.
 * 
 * @interface ExportCSVOptions
 * @property {boolean} [archived] - Include archived tasks
 * @property {boolean} [include_closed] - Include closed tasks
 * @property {string[]} [statuses] - Filter by specific status names
 * @property {string[]} [custom_fields] - Specific custom field names to include
 * @property {boolean} [include_standard_fields] - Include standard fields (default: true)
 * @property {boolean} [add_phone_number_column] - Add combined phone number column for ElevenLabs
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
 * Escapes a value for safe inclusion in CSV format.
 * 
 * @description Handles special characters (commas, quotes, newlines) by
 * wrapping values in quotes and escaping internal quotes.
 * 
 * @param {any} value - Value to escape
 * @returns {string} CSV-safe string value
 * 
 * @example
 * escapeCSV('Hello, World'); // Returns: '"Hello, World"'
 * escapeCSV('Say "Hello"'); // Returns: '"Say ""Hello"""'
 * escapeCSV('Normal text'); // Returns: 'Normal text'
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
 * Normalizes a phone number to E.164 international format.
 * 
 * @description Converts various phone number formats to E.164 format
 * (e.g., +15551234567). Handles US/Canada numbers, removes extensions,
 * and validates the result against E.164 specifications.
 * 
 * @param {string | null | undefined} phone - Phone number to normalize
 * @returns {string} E.164 formatted phone number or empty string if invalid
 * 
 * @example
 * normalizePhoneToE164('555-123-4567'); // Returns: '+15551234567'
 * normalizePhoneToE164('(555) 123-4567 x206'); // Returns: '+15551234567'
 * normalizePhoneToE164('+44 20 7946 0958'); // Returns: '+442079460958'
 * normalizePhoneToE164('invalid'); // Returns: ''
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
 * Extracts and formats the value from a custom field based on its type.
 * 
 * @description Handles various ClickUp custom field types (text, number,
 * date, dropdown, etc.) and returns the appropriate string representation.
 * Automatically normalizes phone number fields to E.164 format.
 * 
 * @param {ClickUpCustomField} field - Custom field to extract value from
 * @returns {string} Formatted field value
 * 
 * @example
 * extractCustomFieldValue({ id: '1', name: 'Points', type: 'number', value: 5 });
 * // Returns: '5'
 * 
 * extractCustomFieldValue({ id: '2', name: 'Due', type: 'date', value: '1609459200000' });
 * // Returns: '2021-01-01'
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
 * Gets a custom field value from a task by field name.
 * 
 * @description Searches a task's custom fields for a field with the specified
 * name and returns its formatted value. Handles cases with multiple fields
 * of the same name by preferring the one with a value.
 * 
 * @param {ClickUpTask} task - Task containing custom fields
 * @param {string} fieldName - Name of the custom field to retrieve
 * @param {string} [preferredType] - Optional preferred field type
 * @returns {string} Field value or empty string if not found
 * 
 * @example
 * const email = getCustomField(task, 'Email');
 * const phone = getCustomField(task, 'Phone Number', 'phone');
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
 * Converts a task to an array of CSV field values.
 * 
 * @description Maps task properties and custom fields to CSV column values
 * in the specified field order. Handles both standard fields and custom fields.
 * 
 * @param {ClickUpTask} task - Task to convert
 * @param {string[]} fieldOrder - Ordered list of field names for columns
 * @returns {string[]} Array of escaped CSV values
 * 
 * @example
 * const row = taskToCSVRow(task, ['Task ID', 'Name', 'Status', 'Email']);
 * // Returns: ['abc123', 'Task Name', 'in progress', 'user@example.com']
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
 * Exports tasks from a ClickUp list to CSV format.
 * 
 * @description Fetches all tasks from a list with automatic pagination,
 * applies optional status filtering, and generates CSV output with
 * standard fields and custom fields.
 * 
 * @param {string} listId - ClickUp list ID to export from
 * @param {ExportCSVOptions} [options={}] - Export configuration options
 * @returns {Promise<string>} CSV content as a string
 * @throws {Error} If the API request fails
 * 
 * @example
 * const csv = await exportTasksToCSV("123456", {
 *   statuses: ["in progress"],
 *   include_standard_fields: true,
 *   add_phone_number_column: true
 * });
 * 
 * // Save to file
 * fs.writeFileSync('tasks.csv', csv);
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
