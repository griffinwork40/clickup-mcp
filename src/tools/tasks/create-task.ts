/**
 * @file create-task.ts
 * @description MCP tool for creating new tasks in ClickUp.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormatSchema, PrioritySchema } from "./schemas.js";
import { ResponseFormat } from "../../constants.js";
import { makeApiRequest, handleApiError, formatTaskMarkdown } from "../../utils.js";
import type { ClickUpTask } from "../../types.js";

/**
 * Registers the clickup_create_task tool with the MCP server.
 * This tool creates a new task in a specified list.
 */
export function registerCreateTaskTool(server: McpServer): void {
  server.registerTool(
    "clickup_create_task",
    {
      title: "Create ClickUp Task",
      description: `Create a new task in a list.

This tool creates a new task with specified properties. Use clickup_get_list_details first to see available statuses.

Args:
  - list_id (string): The list ID where task will be created
  - name (string): Task name (required)
  - description (string, optional): Task description (supports markdown)
  - status (string, optional): Task status (must match list statuses)
  - priority (1-4, optional): Priority (1=Urgent, 2=High, 3=Normal, 4=Low)
  - assignees (number[], optional): Array of assignee user IDs
  - due_date (number, optional): Due date as Unix timestamp in milliseconds
  - start_date (number, optional): Start date as Unix timestamp in milliseconds
  - tags (string[], optional): Array of tag names
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  The created task with all properties including the new task ID.

Examples:
  - Use when: "Create a task called 'Fix bug' in list 123456"
  - Use when: "Add a new task with priority high and assign to user 789"

Error Handling:
  - Returns "Error: Bad request" if status doesn't match list statuses (400)
  - Returns "Error: Resource not found" if list_id is invalid (404)`,
      inputSchema: z.object({
        list_id: z.string().min(1).describe("List ID"),
        name: z.string().min(1).max(1000).describe("Task name"),
        description: z.string().optional().describe("Task description (markdown supported)"),
        status: z.string().optional().describe("Task status (must match list statuses)"),
        priority: PrioritySchema.optional(),
        assignees: z.array(z.number()).optional().describe("Assignee user IDs"),
        due_date: z.number().optional().describe("Due date (Unix timestamp in milliseconds)"),
        start_date: z.number().optional().describe("Start date (Unix timestamp in milliseconds)"),
        tags: z.array(z.string()).optional().describe("Tag names"),
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
        const taskData: any = { name: params.name };

        if (params.description) taskData.description = params.description;
        if (params.status) taskData.status = params.status;
        if (params.priority) taskData.priority = params.priority;
        if (params.assignees) taskData.assignees = params.assignees;
        if (params.due_date) taskData.due_date = params.due_date;
        if (params.start_date) taskData.start_date = params.start_date;
        if (params.tags) taskData.tags = params.tags;

        const task = await makeApiRequest<ClickUpTask>(
          `list/${params.list_id}/task`,
          "POST",
          taskData
        );

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = ["# Task Created Successfully", ""];
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
