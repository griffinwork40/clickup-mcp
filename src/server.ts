/**
 * MCP Server instance and shared schemas for ClickUp MCP server.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResponseFormat, ResponseMode, DEFAULT_LIMIT, MAX_LIMIT } from "./constants.js";

/**
 * Shared MCP server instance
 */
export const server = new McpServer({
  name: "clickup-mcp-server",
  version: "1.0.0"
});

/**
 * Schema for response format parameter
 */
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

/**
 * Schema for response mode parameter
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
