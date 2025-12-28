/**
 * @file comment-formatters.ts
 * @description Comment formatting utilities for ClickUp MCP server.
 * This module provides functions for formatting task comments.
 */

import type { ClickUpComment } from "../types.js";
import { formatDate } from "./time-formatters.js";

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
