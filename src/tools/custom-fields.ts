/**
 * ClickUp Custom Fields tool definitions.
 * 
 * Tools for managing custom field values on tasks.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError } from "../utils.js";

/**
 * Register all custom field-related tools with the MCP server.
 */
export function registerCustomFieldTools(server: McpServer): void {
  registerSetCustomField(server);
}

/**
 * Tool: Set Custom Field Value
 */
function registerSetCustomField(server: McpServer): void {
  server.registerTool(
    "clickup_set_custom_field",
    {
      title: "Set Custom Field Value",
      description: `Set a custom field value on a task.

This tool updates a custom field value on a specific task. Use clickup_get_list_details first to see available custom fields.

Args:
  - task_id (string): The task ID
  - field_id (string): The custom field ID
  - value (any): The value to set (format depends on field type)

Note: Value format varies by field type:
  - Text/URL/Email: "string value"
  - Number/Currency: 123
  - Date: Unix timestamp in milliseconds
  - Dropdown: "option_uuid"
  - Checkbox: true or false

Returns:
  Confirmation of the update.

Examples:
  - Use when: "Set custom field abc to 'Complete' on task xyz"
  - Use after: Getting list details to know field IDs

Error Handling:
  - Returns "Error: Bad request" if value format is wrong (400)
  - Returns "Error: Resource not found" if IDs are invalid (404)`,
      inputSchema: z.object({
        task_id: z.string().min(1).describe("Task ID"),
        field_id: z.string().min(1).describe("Custom field ID"),
        value: z.any().describe("Value to set (format depends on field type)")
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        await makeApiRequest(
          `task/${params.task_id}/field/${params.field_id}`,
          "POST",
          { value: params.value }
        );

        return {
          content: [{
            type: "text",
            text: `Custom field ${params.field_id} updated successfully on task ${params.task_id}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }]
        };
      }
    }
  );
}
