/**
 * @file count-tasks.ts
 * @description MCP tool for counting tasks by status in a ClickUp list.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormatSchema } from "./schemas.js";
import { ResponseFormat } from "../../constants.js";
import { handleApiError, countTasksByStatus } from "../../utils.js";

/**
 * Registers the clickup_count_tasks_by_status tool with the MCP server.
 * This tool counts tasks in a list with optional status filtering.
 */
export function registerCountTasksTool(server: McpServer): void {
  server.registerTool(
    "clickup_count_tasks_by_status",
    {
      title: "Count Tasks by Status",
      description: `Count tasks in a list, optionally filtered by status.

This tool handles pagination internally and returns counts efficiently. It's optimized for counting tasks by status, which is useful for lead tracking, status reporting, and analytics.

Args:
  - list_id (string): The list ID to count tasks in
  - statuses (string[], optional): Filter by specific status names. If omitted, returns counts for all statuses
  - archived (boolean): Include archived tasks (default: false)
  - include_closed (boolean): Include closed tasks (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "total": number,
    "by_status": {
      "status_name": count,
      ...
    }
  }

Examples:
  - Use when: "Count all tasks in list 123456"
  - Use when: "How many tasks have status '#1 - phone call' in list 123456?"
  - Use when: "Get counts for all statuses in this list"

Error Handling:
  - Returns "Error: Resource not found" if list_id is invalid (404)`,
      inputSchema: z.object({
        list_id: z.string().min(1).describe("List ID"),
        statuses: z.array(z.string()).optional().describe("Filter by specific status names. If omitted, returns counts for all statuses"),
        archived: z.boolean().default(false).describe("Include archived tasks"),
        include_closed: z.boolean().default(false).describe("Include closed tasks"),
        response_format: ResponseFormatSchema
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const result = await countTasksByStatus(params.list_id, {
          archived: params.archived,
          include_closed: params.include_closed,
          statuses: params.statuses
        });

        let output: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = [`# Task Counts for List ${params.list_id}`, ""];

          if (params.statuses && params.statuses.length > 0) {
            lines.push(`**Filtering by status**: ${params.statuses.join(", ")}`, "");
          }

          lines.push(`**Total tasks**: ${result.total}`, "");
          lines.push("");

          if (Object.keys(result.by_status).length > 0) {
            lines.push("## Counts by Status");
            for (const [status, count] of Object.entries(result.by_status).sort((a, b) => b[1] - a[1])) {
              lines.push(`- ${status}: ${count}`);
            }
          } else {
            lines.push("No tasks found matching the criteria.");
          }

          output = lines.join("\n");
        } else {
          output = JSON.stringify(result, null, 2);
        }

        return { content: [{ type: "text", text: output }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
