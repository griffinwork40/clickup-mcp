/**
 * @file export-tasks.ts
 * @description MCP tool for exporting ClickUp tasks to CSV format.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { handleApiError, exportTasksToCSV } from "../../utils.js";

/**
 * Registers the clickup_export_tasks_to_csv tool with the MCP server.
 * This tool exports tasks from a list to CSV format with custom field support.
 */
export function registerExportTasksTool(server: McpServer): void {
  server.registerTool(
    "clickup_export_tasks_to_csv",
    {
      title: "Export Tasks to CSV",
      description: `Export tasks from a list to CSV format.

This tool handles pagination, status filtering, and custom field extraction automatically. It fetches detailed task information to include all custom fields in the export.

Args:
  - list_id (string): The list to export from
  - statuses (string[], optional): Filter by specific status names. If omitted, exports all tasks
  - archived (boolean): Include archived tasks (default: false)
  - include_closed (boolean): Include closed tasks (default: false)
  - custom_fields (string[], optional): Specific custom field names to include. If omitted, includes all custom fields found
  - include_standard_fields (boolean): Include standard fields like ID, name, status, etc. (default: true)
  - add_phone_number_column (boolean): Automatically create a combined 'phone_number' column from phone fields (for ElevenLabs compatibility) (default: false)

Returns:
  CSV content as text (can be saved to file by client). Includes headers as first row.

Examples:
  - Use when: "Export all tasks from list 123456 to CSV"
  - Use when: "Export tasks with status '#1 - phone call' from list 123456"
  - Use when: "Export leads with specific custom fields to CSV"

Error Handling:
  - Returns "Error: Resource not found" if list_id is invalid (404)
  - Returns empty CSV if no tasks match the criteria`,
      inputSchema: z.object({
        list_id: z.string().min(1).describe("List ID"),
        statuses: z.array(z.string()).optional().describe("Filter by specific status names. If omitted, exports all tasks"),
        archived: z.boolean().default(false).describe("Include archived tasks"),
        include_closed: z.boolean().default(false).describe("Include closed tasks"),
        custom_fields: z.array(z.string()).optional().describe("Specific custom field names to include. If omitted, includes all custom fields found"),
        include_standard_fields: z.boolean().default(true).describe("Include standard fields like ID, name, status, etc."),
        add_phone_number_column: z.boolean().default(false).describe("Automatically create a combined 'phone_number' column from phone fields (for ElevenLabs compatibility)")
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
        const csvContent = await exportTasksToCSV(params.list_id, {
          archived: params.archived,
          include_closed: params.include_closed,
          statuses: params.statuses,
          custom_fields: params.custom_fields,
          include_standard_fields: params.include_standard_fields,
          add_phone_number_column: params.add_phone_number_column
        });

        if (csvContent === '') {
          return {
            content: [{
              type: "text",
              text: "No tasks found matching the criteria. CSV is empty."
            }]
          };
        }

        return { content: [{ type: "text", text: csvContent }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
