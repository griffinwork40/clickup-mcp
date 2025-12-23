/**
 * Response truncation utilities for ClickUp MCP server.
 * Handles intelligent truncation of large responses.
 */

import type { TruncationInfo } from "../../types.js";
import { CHARACTER_LIMIT } from "../../constants.js";

/** Create truncation info object */
function createTruncation(original: number, returned: number, itemType: string, msg?: string): TruncationInfo {
  return {
    truncated: true,
    original_count: original,
    returned_count: returned,
    truncation_message: msg || `Response truncated from ${original} to ${returned} ${itemType} due to size limits (${CHARACTER_LIMIT.toLocaleString()} chars). Use pagination (offset/limit), add filters, or use response_mode='compact' to see more results.`
  };
}

/** Truncate JSON by removing array items */
function truncateJson(content: string, itemCount: number, itemType: string): { content: string; truncation: TruncationInfo | null } {
  try {
    const data = JSON.parse(content);
    const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
    if (!arrayKey) throw new Error('No array found');

    const origLength = data[arrayKey].length;
    while (JSON.stringify(data, null, 2).length > CHARACTER_LIMIT && data[arrayKey].length > 1) {
      data[arrayKey].pop();
    }

    let finalContent = JSON.stringify(data, null, 2);
    
    if (finalContent.length > CHARACTER_LIMIT && data[arrayKey].length === 1) {
      const item = data[arrayKey][0];
      if (typeof item === 'object') {
        for (const key of Object.keys(item)) {
          if (typeof item[key] === 'string' && item[key].length > 10000) {
            item[key] = item[key].substring(0, 10000) + '... [truncated]';
          }
        }
        finalContent = JSON.stringify(data, null, 2);
        if (finalContent.length <= CHARACTER_LIMIT) {
          return { content: finalContent, truncation: createTruncation(itemCount, 1, itemType, `Large ${itemType} fields were truncated to fit size limits.`) };
        }
      }
      return truncateMarkdown(content, itemCount, itemType);
    }

    const kept = data[arrayKey].length;
    return kept < origLength
      ? { content: finalContent, truncation: createTruncation(origLength, kept, itemType) }
      : { content: finalContent, truncation: null };
  } catch {
    return truncateMarkdown(content, itemCount, itemType);
  }
}

/** Truncate markdown with smart boundary detection */
function truncateMarkdown(content: string, itemCount: number, itemType: string): { content: string; truncation: TruncationInfo | null } {
  if (content.length <= CHARACTER_LIMIT) return { content, truncation: null };

  const searchStart = Math.max(0, CHARACTER_LIMIT - 1000);
  const breaks = [
    content.lastIndexOf("\n# ", CHARACTER_LIMIT),
    content.lastIndexOf("\n## ", CHARACTER_LIMIT),
    content.lastIndexOf("\n---\n", CHARACTER_LIMIT),
    content.lastIndexOf("\n\n", CHARACTER_LIMIT)
  ].filter(pos => pos >= searchStart);

  const truncateAt = breaks.length ? Math.max(...breaks) : (content.lastIndexOf("\n", CHARACTER_LIMIT) > searchStart ? content.lastIndexOf("\n", CHARACTER_LIMIT) : CHARACTER_LIMIT);
  const finalContent = content.substring(0, truncateAt);
  
  const headerPattern = /^# .+ \(/gm;
  const keptItems = (finalContent.match(headerPattern) || []).length || Math.max(1, Math.floor(itemCount * (truncateAt / content.length)));

  return { content: finalContent, truncation: createTruncation(itemCount, keptItems, itemType) };
}

/**
 * Truncate response with smart boundary detection.
 * Detects format (JSON/markdown) and uses appropriate strategy.
 */
export function truncateResponse(content: string, itemCount: number, itemType: string = "items"): { content: string; truncation: TruncationInfo | null } {
  if (content.length <= CHARACTER_LIMIT) return { content, truncation: null };
  
  const trimmed = content.trimStart();
  return (trimmed.startsWith('{') || trimmed.startsWith('['))
    ? truncateJson(content, itemCount, itemType)
    : truncateMarkdown(content, itemCount, itemType);
}
