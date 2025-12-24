/**
 * Entity formatting utilities for ClickUp MCP server.
 * Handles formatting of spaces, folders, lists, comments, and time entries.
 */

import type { ClickUpList, ClickUpSpace, ClickUpFolder, ClickUpComment, ClickUpTimeEntry, TruncationInfo } from "../../types.js";
import { formatDate } from "./date.js";

/** Format a list as markdown */
export function formatListMarkdown(list: ClickUpList): string {
  const lines = [`# ${list.name} (${list.id})`, "", `**Tasks**: ${list.task_count}`];
  if (list.folder) lines.push(`**Folder**: ${list.folder.name}`);
  if (list.space) lines.push(`**Space**: ${list.space.name}`);
  if (list.statuses?.length) {
    lines.push("", "## Statuses");
    list.statuses.forEach(s => lines.push(`- ${s.status} (${s.type})`));
  }
  return lines.join("\n");
}

/** Format a space as markdown */
export function formatSpaceMarkdown(space: ClickUpSpace): string {
  const lines = [
    `# ${space.name} (${space.id})`, "",
    `**Private**: ${space.private ? "Yes" : "No"}`,
    `**Multiple Assignees**: ${space.multiple_assignees ? "Yes" : "No"}`
  ];
  if (space.features) {
    lines.push("", "## Features",
      `- Due Dates: ${space.features.due_dates?.enabled ? "Enabled" : "Disabled"}`,
      `- Time Tracking: ${space.features.time_tracking?.enabled ? "Enabled" : "Disabled"}`,
      `- Tags: ${space.features.tags?.enabled ? "Enabled" : "Disabled"}`,
      `- Custom Fields: ${space.features.custom_fields?.enabled ? "Enabled" : "Disabled"}`
    );
  }
  return lines.join("\n");
}

/** Format a folder as markdown */
export function formatFolderMarkdown(folder: ClickUpFolder): string {
  const lines = [
    `# ${folder.name} (${folder.id})`, "",
    `**Tasks**: ${folder.task_count}`,
    `**Hidden**: ${folder.hidden ? "Yes" : "No"}`
  ];
  if (folder.space) lines.push(`**Space**: ${folder.space.name}`);
  if (folder.lists?.length) {
    lines.push("", "## Lists");
    folder.lists.forEach(l => lines.push(`- ${l.name} (${l.id}) - ${l.task_count} tasks`));
  }
  return lines.join("\n");
}

/** Format a comment as markdown */
export function formatCommentMarkdown(comment: ClickUpComment): string {
  const lines = [`**@${comment.user.username}** (${formatDate(comment.date)})`, comment.comment_text];
  if (comment.resolved) lines.push("*(Resolved)*");
  return lines.join("\n");
}

/** Format a time entry as markdown */
export function formatTimeEntryMarkdown(entry: ClickUpTimeEntry): string {
  const hours = Math.floor(parseInt(entry.duration) / 3600000);
  const minutes = Math.floor((parseInt(entry.duration) % 3600000) / 60000);
  const lines = [
    `**@${entry.user.username}** - ${hours}h ${minutes}m`,
    `- Start: ${formatDate(entry.start)}`,
    entry.end ? `- End: ${formatDate(entry.end)}` : "- End: *(Still running)*"
  ];
  if (entry.task) lines.push(`- Task: ${entry.task.name} (${entry.task.id})`);
  if (entry.description) lines.push(`- Description: ${entry.description}`);
  lines.push(`- Billable: ${entry.billable ? "Yes" : "No"}`);
  return lines.join("\n");
}

/** Format truncation information as text */
export function formatTruncationInfo(truncation: TruncationInfo | null): string {
  return truncation ? `\n\n---\n⚠️ ${truncation.truncation_message}` : "";
}
