/**
 * Task formatting utilities for ClickUp MCP server.
 * Handles formatting of task entities as markdown.
 */

import type { ClickUpTask } from "../../types.js";
import { formatDate } from "./date.js";

/**
 * Format priority value as human-readable string
 * @param priority - Priority object with priority and color fields
 * @returns Priority string or "None" if not set
 */
export function formatPriority(priority?: { priority: string; color: string }): string {
  if (!priority) return "None";
  return priority.priority;
}

/**
 * Format a task as markdown (full detail)
 * @param task - The ClickUp task object
 * @returns Markdown formatted string with all task details
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
 * @param task - The ClickUp task object
 * @returns Single-line markdown string with essential fields
 */
export function formatTaskCompact(task: ClickUpTask): string {
  const assignees = task.assignees && task.assignees.length > 0
    ? task.assignees.map(a => a.username).join(", ")
    : "Unassigned";

  return `- **${task.name}** (${task.id}) | Status: ${task.status.status} | Assignees: ${assignees} | URL: ${task.url}`;
}
