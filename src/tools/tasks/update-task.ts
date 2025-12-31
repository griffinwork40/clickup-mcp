/**
 * @file update-task.ts
 * @description MCP tool for updating existing ClickUp tasks.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormatSchema, PrioritySchema } from "./schemas.js";
import { ResponseFormat } from "../../constants.js";
import { makeApiRequest, handleApiError, formatTaskMarkdown } from "../../utils.js";
import type { ClickUpTask } from "../../types.js";

/**
 * Registers the clickup_update_task tool with the MCP server.
 * This tool updates one or more properties of an existing task.
 */
export function registerUpdateTaskTool(server: McpServer): void {
  server.registerTool(
    "clickup_update_task",
    {
      title: "Update ClickUp Task",
      description: `Update an existing task's properties.

This tool updates one or more properties of an existing task. Only include the fields you want to change.

Args:
  - task_id (string): The task ID
  - name (string, optional): New task name
  - description (string, optional): New description
  - status (string, optional): New status
  - priority (1-4, optional): New priority
  - assignees_add (number[], optional): User IDs to add as assignees
  - assignees_rem (number[], optional): User IDs to remove from assignees
  - due_date (number, optional): New due date (Unix timestamp in milliseconds)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  The updated task with all properties.

Examples:
  - Use when: "Update task abc123 status to 'complete'"
  - Use when: "Change task priority to urgent and add assignee 789"

Error Handling:
  - Returns "Error: Resource not found" if task_id is invalid (404)
  - Returns "Error: Bad request" if status doesn't exist in list (400)`,
      inputSchema: z.object({
        task_id: z.string().min(1).describe("Task ID"),
        name: z.string().optional().describe("New task name"),
        description: z.string().optional().describe("New description"),
        status: z.string().optional().describe("New status"),
        priority: PrioritySchema.optional(),
        assignees_add: z.array(z.number()).optional().describe("User IDs to add as assignees"),
        assignees_rem: z.array(z.number()).optional().describe("User IDs to remove"),
        due_date: z.number().optional().describe("New due date (Unix timestamp)"),
        response_format: ResponseFormatSchema
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const updateData: any = {};

        if (params.name) updateData.name = params.name;
        if (params.description !== undefined) updateData.description = params.description;
        if (params.status) updateData.status = params.status;
        if (params.priority) updateData.priority = params.priority;
        if (params.due_date !== undefined) updateData.due_date = params.due_date;

        if (params.assignees_add && params.assignees_add.length > 0) {
          updateData.assignees = { add: params.assignees_add };
        }
        if (params.assignees_rem && params.assignees_rem.length > 0) {
          if (!updateData.assignees) updateData.assignees = {};
          updateData.assignees.rem = params.assignees_rem;
        }

        const task = await makeApiRequest<ClickUpTask>(
          `task/${params.task_id}`,
          "PUT",
          updateData
        );

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = ["# Task Updated Successfully", ""];
          lines.push(formatTaskMarkdown(task));
          result = lines.join("\n");
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
