/**
 * @file task-formatters.ts
 * @description Task, list, space, and folder formatting utilities for ClickUp MCP server.
 * This module provides functions for formatting various ClickUp entities to markdown.
 */

import type {
  ClickUpTask,
  ClickUpList,
  ClickUpSpace,
  ClickUpFolder,
  PaginationInfo,
  TruncationInfo
} from "../types.js";
import { formatDate } from "./time-formatters.js";

/**
 * Formats a priority object as a human-readable string.
 * 
 * @param {{ priority: string; color: string } | undefined} priority - Priority object
 * @returns {string} Priority label or "None"
 */
export function formatPriority(priority?: { priority: string; color: string }): string {
  if (!priority) return "None";
  return priority.priority;
}

/**
 * Formats a task as detailed markdown output.
 * 
 * @param {ClickUpTask} task - The task to format
 * @returns {string} Markdown-formatted task details
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
 * @param {ClickUpTask} task - The task to format
 * @returns {string} Single-line markdown task summary
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
 * @param {ClickUpList} list - The list to format
 * @returns {string} Markdown-formatted list details
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
 * @param {ClickUpSpace} space - The space to format
 * @returns {string} Markdown-formatted space details
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
 * @param {ClickUpFolder} folder - The folder to format
 * @returns {string} Markdown-formatted folder details
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
 * Calculates pagination information from response data.
 * 
 * @param {number | undefined} total - Total number of items available (if known)
 * @param {number} count - Number of items in current response
 * @param {number} offset - Current offset position
 * @param {number} limit - Maximum items per page
 * @returns {PaginationInfo} Pagination metadata object
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
 * @param {ClickUpTask[]} tasks - Array of tasks to analyze
 * @returns {string} Markdown-formatted summary statistics
 */
export function generateTaskSummary(tasks: ClickUpTask[]): string {
  const lines: string[] = [];

  lines.push("# Task Summary");
  lines.push("");
  lines.push(`**Total Tasks**: ${tasks.length}`);
  lines.push("");

  const statusCounts: Record<string, number> = {};
  const assigneeCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  for (const task of tasks) {
    const status = task.status.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (task.assignees && task.assignees.length > 0) {
      for (const assignee of task.assignees) {
        assigneeCounts[assignee.username] = (assigneeCounts[assignee.username] || 0) + 1;
      }
    } else {
      assigneeCounts["Unassigned"] = (assigneeCounts["Unassigned"] || 0) + 1;
    }

    const priority = formatPriority(task.priority);
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
  }

  lines.push("## By Status");
  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push("");
  lines.push("## By Assignee");
  for (const [assignee, count] of Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${assignee}: ${count}`);
  }

  lines.push("");
  lines.push("## By Priority");
  for (const [priority, count] of Object.entries(priorityCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${priority}: ${count}`);
  }

  return lines.join("\n");
}

/**
 * Formats truncation information as a user-friendly message.
 * 
 * @param {TruncationInfo | null} truncation - Truncation metadata or null
 * @returns {string} Formatted truncation warning or empty string
 */
export function formatTruncationInfo(truncation: TruncationInfo | null): string {
  if (!truncation) return "";

  return `\n\n---\n⚠️ ${truncation.truncation_message}`;
}
