/**
 * @file time-formatters.ts
 * @description Time and date formatting utilities for ClickUp MCP server.
 * This module provides functions for formatting timestamps and time entries.
 */

import type { ClickUpTimeEntry } from "../types.js";

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
