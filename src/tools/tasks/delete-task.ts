/**
 * @file delete-task.ts
 * @description MCP tool for permanently deleting ClickUp tasks.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError } from "../../utils.js";

/**
 * Registers the clickup_delete_task tool with the MCP server.
 * This tool permanently deletes a task from ClickUp.
 * 
 * WARNING: This is a destructive operation that cannot be undone.
 */
export function registerDeleteTaskTool(server: McpServer): void {
  server.registerTool(
    "clickup_delete_task",
    {
      title: "Delete ClickUp Task",
      description: `Delete a task permanently.

⚠️ WARNING: This action is destructive and cannot be undone. The task will be permanently deleted from ClickUp.

Args:
  - task_id (string): The task ID to delete

Returns:
  Confirmation message of deletion.

Examples:
  - Use when: "Delete task abc123"
  - Don't use when: You want to archive (use update status to 'closed' instead)

Error Handling:
  - Returns "Error: Resource not found" if task_id is invalid (404)
  - Returns "Error: Permission denied" if no delete access (403)`,
      inputSchema: z.object({
        task_id: z.string().min(1).describe("Task ID to delete")
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        await makeApiRequest(`task/${params.task_id}`, "DELETE");

        return {
          content: [{
            type: "text",
            text: `Task ${params.task_id} has been deleted successfully.`
          }]
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
