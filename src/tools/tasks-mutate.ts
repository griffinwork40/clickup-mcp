/**
 * ClickUp task mutation tools: Create, Update, Delete
 */

import { z } from "zod";
import { server, ResponseFormatSchema } from "../server.js";
import { ResponseFormat, Priority } from "../constants.js";
import { makeApiRequest, handleApiError, formatTaskMarkdown } from "../utils/index.js";
import type { ClickUpTask } from "../types.js";

/**
 * Register task mutation tools
 */
export function registerTaskMutateTools(): void {
  // ============================================================================
  // Tool: Create Task
  // ============================================================================

  server.registerTool(
    "clickup_create_task",
    {
      title: "Create ClickUp Task",
      description: `Create a new task in a list.

Use clickup_get_list_details first to see available statuses.

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
  - Use when: "Add a new task with priority high and assign to user 789"`,
      inputSchema: z.object({
        list_id: z.string().min(1).describe("List ID"),
        name: z.string().min(1).max(1000).describe("Task name"),
        description: z.string().optional().describe("Task description (markdown supported)"),
        status: z.string().optional().describe("Task status (must match list statuses)"),
        priority: z.nativeEnum(Priority).optional().describe("Priority: 1=Urgent, 2=High, 3=Normal, 4=Low"),
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
          `list/${params.list_id}/task`, "POST", taskData
        );

        const result = params.response_format === ResponseFormat.MARKDOWN
          ? `# Task Created Successfully\n\n${formatTaskMarkdown(task)}`
          : JSON.stringify(task, null, 2);

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // ============================================================================
  // Tool: Update Task
  // ============================================================================

  server.registerTool(
    "clickup_update_task",
    {
      title: "Update ClickUp Task",
      description: `Update an existing task's properties.

Only include the fields you want to change.

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
  - Use when: "Change task priority to urgent and add assignee 789"`,
      inputSchema: z.object({
        task_id: z.string().min(1).describe("Task ID"),
        name: z.string().optional().describe("New task name"),
        description: z.string().optional().describe("New description"),
        status: z.string().optional().describe("New status"),
        priority: z.nativeEnum(Priority).optional().describe("New priority"),
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

        if (params.assignees_add?.length) {
          updateData.assignees = { add: params.assignees_add };
        }
        if (params.assignees_rem?.length) {
          if (!updateData.assignees) updateData.assignees = {};
          updateData.assignees.rem = params.assignees_rem;
        }

        const task = await makeApiRequest<ClickUpTask>(
          `task/${params.task_id}`, "PUT", updateData
        );

        const result = params.response_format === ResponseFormat.MARKDOWN
          ? `# Task Updated Successfully\n\n${formatTaskMarkdown(task)}`
          : JSON.stringify(task, null, 2);

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // ============================================================================
  // Tool: Delete Task
  // ============================================================================

  server.registerTool(
    "clickup_delete_task",
    {
      title: "Delete ClickUp Task",
      description: `Delete a task permanently.

⚠️ WARNING: This action is destructive and cannot be undone.

Args:
  - task_id (string): The task ID to delete

Returns:
  Confirmation message of deletion.

Examples:
  - Use when: "Delete task abc123"
  - Don't use when: You want to archive (use update status to 'closed' instead)`,
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
