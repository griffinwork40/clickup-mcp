/**
 * Common Zod schemas for input validation across all ClickUp MCP tools.
 */

import { z } from "zod";
import { ResponseFormat, ResponseMode, MAX_LIMIT, DEFAULT_LIMIT } from "../constants.js";

/**
 * Schema for response format (markdown or json)
 */
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

/**
 * Schema for response mode (full, compact, or summary)
 */
export const ResponseModeSchema = z.nativeEnum(ResponseMode)
  .default(ResponseMode.FULL)
  .describe("Response detail level: 'full' for complete task details, 'compact' for essential fields only (id, name, status, assignees), 'summary' for statistical overview");

/**
 * Schema for pagination parameters
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
 * Type exports for use in tool definitions
 */
export type ResponseFormatType = z.infer<typeof ResponseFormatSchema>;
export type ResponseModeType = z.infer<typeof ResponseModeSchema>;
export type PaginationType = z.infer<typeof PaginationSchema>;
