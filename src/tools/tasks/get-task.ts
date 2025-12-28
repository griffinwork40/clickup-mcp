/**
 * @file get-task.ts
 * @description MCP tool for retrieving details of a single ClickUp task.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormatSchema } from "./schemas.js";
import { ResponseFormat } from "../../constants.js";
import { makeApiRequest, handleApiError, formatTaskMarkdown } from "../../utils.js";
import type { ClickUpTask } from "../../types.js";

/**
 * Registers the clickup_get_task tool with the MCP server.
 * This tool retrieves detailed information about a single task.
 */
export function registerGetTaskTool(server: McpServer): void {
  server.registerTool(
    "clickup_get_task",
    {
      title: "Get Task Details",
      description: `Get detailed information about a specific task.

This tool retrieves complete information about a single task, including description, status, assignees, custom fields, checklists, and more.

Args:
  - task_id (string): The task ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete task information including:
  - Name, description, status, priority
  - Assignees, watchers, creator
  - Due date, time estimates, time spent
  - Custom fields, checklists, tags
  - Related tasks, dependencies
  - URL for viewing in ClickUp

Examples:
  - Use when: "Show me details for task abc123"
  - Use when: "What's the status of task xyz?"

Error Handling:
  - Returns "Error: Resource not found" if task_id is invalid (404)`,
      inputSchema: z.object({
        task_id: z.string().min(1).describe("Task ID"),
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
        const task = await makeApiRequest<ClickUpTask>(`task/${params.task_id}`);

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          result = formatTaskMarkdown(task);
        } else {
          result = JSON.stringify(task, null, 2);
        }

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
