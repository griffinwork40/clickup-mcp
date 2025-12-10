/**
 * Formatting utilities for ClickUp MCP server.
 * Converts API responses to human-readable markdown.
 */

import type {
  ClickUpTask,
  ClickUpList,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpComment,
  ClickUpTimeEntry
} from "../types.js";

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

  if (task.due_date) lines.push(`**Due Date**: ${formatDate(task.due_date)}`);

  if (task.assignees?.length) {
    const assigneeNames = task.assignees.map(a => `@${a.username} (${a.id})`).join(", ");
    lines.push(`**Assignees**: ${assigneeNames}`);
  }

  if (task.tags?.length) {
    lines.push(`**Tags**: ${task.tags.map(t => t.name).join(", ")}`);
  }

  if (task.description) {
    lines.push("", "## Description", task.description);
  }

  lines.push("", `**URL**: ${task.url}`);
  return lines.join("\n");
}

/**
 * Format a task as compact markdown (essential fields only)
 */
export function formatTaskCompact(task: ClickUpTask): string {
  const assignees = task.assignees?.length
    ? task.assignees.map(a => a.username).join(", ")
    : "Unassigned";
  return `- **${task.name}** (${task.id}) | Status: ${task.status.status} | Assignees: ${assignees} | URL: ${task.url}`;
}

/**
 * Format a list as markdown
 */
export function formatListMarkdown(list: ClickUpList): string {
  const lines: string[] = [`# ${list.name} (${list.id})`, "", `**Tasks**: ${list.task_count}`];

  if (list.folder) lines.push(`**Folder**: ${list.folder.name}`);
  if (list.space) lines.push(`**Space**: ${list.space.name}`);

  if (list.statuses?.length) {
    lines.push("", "## Statuses");
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
  const lines: string[] = [
    `# ${space.name} (${space.id})`, "",
    `**Private**: ${space.private ? "Yes" : "No"}`,
    `**Multiple Assignees**: ${space.multiple_assignees ? "Yes" : "No"}`
  ];

  if (space.features) {
    lines.push("", "## Features");
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
  const lines: string[] = [
    `# ${folder.name} (${folder.id})`, "",
    `**Tasks**: ${folder.task_count}`,
    `**Hidden**: ${folder.hidden ? "Yes" : "No"}`
  ];

  if (folder.space) lines.push(`**Space**: ${folder.space.name}`);

  if (folder.lists?.length) {
    lines.push("", "## Lists");
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
  const lines: string[] = [
    `**@${comment.user.username}** (${formatDate(comment.date)})`,
    comment.comment_text
  ];
  if (comment.resolved) lines.push("*(Resolved)*");
  return lines.join("\n");
}

/**
 * Format a time entry as markdown
 */
export function formatTimeEntryMarkdown(entry: ClickUpTimeEntry): string {
  const hours = Math.floor(parseInt(entry.duration) / 3600000);
  const minutes = Math.floor((parseInt(entry.duration) % 3600000) / 60000);
  
  const lines: string[] = [
    `**@${entry.user.username}** - ${hours}h ${minutes}m`,
    `- Start: ${formatDate(entry.start)}`
  ];

  lines.push(entry.end ? `- End: ${formatDate(entry.end)}` : "- End: *(Still running)*");
  if (entry.task) lines.push(`- Task: ${entry.task.name} (${entry.task.id})`);
  if (entry.description) lines.push(`- Description: ${entry.description}`);
  lines.push(`- Billable: ${entry.billable ? "Yes" : "No"}`);

  return lines.join("\n");
}
