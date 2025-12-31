/**
 * @file response-utils.ts
 * @description Response truncation and task filtering utilities for ClickUp MCP server.
 * This module provides functions for truncating large responses and filtering tasks.
 */

import type { ClickUpTask, TruncationInfo } from "../types.js";
import { CHARACTER_LIMIT } from "../constants.js";

/**
 * Truncates a JSON response by removing items from arrays.
 * 
 * @param {string} content - JSON string content to truncate
 * @param {number} itemCount - Original number of items
 * @param {string} [itemType="items"] - Type name for truncation message
 * @returns {{ content: string; truncation: TruncationInfo | null }} Truncated content and metadata
 */
function truncateJsonResponse(
  content: string,
  itemCount: number,
  itemType: string = "items"
): { content: string; truncation: TruncationInfo | null } {
  try {
    const data = JSON.parse(content);
    
    const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
    if (!arrayKey || !Array.isArray(data[arrayKey])) {
      throw new Error('No array found in JSON');
    }
    
    const items = data[arrayKey];
    let keptItems = items.length;
    
    while (JSON.stringify(data, null, 2).length > CHARACTER_LIMIT && data[arrayKey].length > 1) {
      data[arrayKey].pop();
      keptItems = data[arrayKey].length;
    }
    
    const finalContent = JSON.stringify(data, null, 2);
    
    if (finalContent.length > CHARACTER_LIMIT) {
      if (data[arrayKey].length === 1 && typeof data[arrayKey][0] === 'object') {
        const item = data[arrayKey][0];
        for (const key of Object.keys(item)) {
          if (typeof item[key] === 'string' && item[key].length > 10000) {
            item[key] = item[key].substring(0, 10000) + '... [truncated]';
          }
        }
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
    return truncateMarkdownResponse(content, itemCount, itemType);
  }
}

/**
 * Truncates a markdown response with smart boundary detection.
 * 
 * @param {string} content - Markdown string content to truncate
 * @param {number} itemCount - Original number of items
 * @param {string} [itemType="items"] - Type name for truncation message
 * @returns {{ content: string; truncation: TruncationInfo | null }} Truncated content and metadata
 */
function truncateMarkdownResponse(
  content: string,
  itemCount: number,
  itemType: string = "items"
): { content: string; truncation: TruncationInfo | null } {
  if (content.length <= CHARACTER_LIMIT) {
    return { content, truncation: null };
  }

  let truncateAt = CHARACTER_LIMIT;
  const searchStart = Math.max(0, CHARACTER_LIMIT - 1000);

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
    if (lastNewline > searchStart) {
      truncateAt = lastNewline;
    }
  }

  const finalContent = content.substring(0, truncateAt);

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
 * and applies the appropriate truncation strategy.
 * 
 * @param {string} content - Response content to potentially truncate
 * @param {number} itemCount - Original number of items in the response
 * @param {string} [itemType="items"] - Type name for truncation message
 * @returns {{ content: string; truncation: TruncationInfo | null }} Processed content and truncation info
 */
export function truncateResponse(
  content: string,
  itemCount: number,
  itemType: string = "items"
): { content: string; truncation: TruncationInfo | null } {
  if (content.length <= CHARACTER_LIMIT) {
    return { content, truncation: null };
  }
  
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return truncateJsonResponse(content, itemCount, itemType);
  }
  
  return truncateMarkdownResponse(content, itemCount, itemType);
}

/**
 * Filters tasks by status names using client-side filtering.
 * 
 * @param {ClickUpTask[]} tasks - Array of tasks to filter
 * @param {string[]} statuses - Status names to filter by
 * @returns {ClickUpTask[]} Filtered array of tasks
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
