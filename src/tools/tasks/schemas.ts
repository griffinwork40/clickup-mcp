/**
 * @file schemas.ts
 * @description Shared Zod schemas for task tool validation.
 * These schemas define input validation for all task-related MCP tools.
 */

import { z } from "zod";
import { ResponseFormat, ResponseMode, DEFAULT_LIMIT, MAX_LIMIT, Priority } from "../../constants.js";

/**
 * Schema for response format selection.
 * Controls output format between markdown (human-readable) and JSON (machine-readable).
 */
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

/**
 * Schema for response mode selection.
 * Controls level of detail in task responses.
 */
export const ResponseModeSchema = z.nativeEnum(ResponseMode)
  .default(ResponseMode.FULL)
  .describe("Response detail level: 'full' for complete task details, 'compact' for essential fields only (id, name, status, assignees), 'summary' for statistical overview");

/**
 * Schema for pagination parameters.
 * Used for controlling result set size and offset.
 */
export const PaginationSchema = z.object({
  limit: z.number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe(`Maximum results to return (1-${MAX_LIMIT})`),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination")
});

/**
 * Schema for task priority levels.
 * Maps to ClickUp priority values (1=Urgent, 2=High, 3=Normal, 4=Low).
 */
export const PrioritySchema = z.nativeEnum(Priority)
  .describe("Priority: 1=Urgent, 2=High, 3=Normal, 4=Low");
