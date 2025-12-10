/**
 * ClickUp task analytics tools: Count and Export
 */

import { z } from "zod";
import { server, ResponseFormatSchema } from "../server.js";
import { ResponseFormat } from "../constants.js";
import {
  handleApiError,
  countTasksByStatus,
  exportTasksToCSV
} from "../utils/index.js";

/**
 * Register task analytics tools
 */
export function registerTaskAnalyticsTools(): void {
  // ============================================================================
  // Tool: Count Tasks by Status
  // ============================================================================

  server.registerTool(
    "clickup_count_tasks_by_status",
    {
      title: "Count Tasks by Status",
      description: `Count tasks in a list, optionally filtered by status.

Handles pagination internally. Useful for lead tracking, status reporting, and analytics.

Args:
  - list_id (string): The list ID to count tasks in
  - statuses (string[], optional): Filter by specific status names
  - archived (boolean): Include archived tasks (default: false)
  - include_closed (boolean): Include closed tasks (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "total": number,
    "by_status": { "status_name": count, ... }
  }

Examples:
  - Use when: "Count all tasks in list 123456"
  - Use when: "How many tasks have status '#1 - phone call'?"`,
      inputSchema: z.object({
        list_id: z.string().min(1).describe("List ID"),
        statuses: z.array(z.string()).optional().describe("Filter by specific status names"),
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
          
          if (params.statuses?.length) {
            lines.push(`**Filtering by status**: ${params.statuses.join(", ")}`, "");
          }
          
          lines.push(`**Total tasks**: ${result.total}`, "", "");

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

  // ============================================================================
  // Tool: Export Tasks to CSV
  // ============================================================================

  server.registerTool(
    "clickup_export_tasks_to_csv",
    {
      title: "Export Tasks to CSV",
      description: `Export tasks from a list to CSV format.

Handles pagination, status filtering, and custom field extraction automatically.

Args:
  - list_id (string): The list to export from
  - statuses (string[], optional): Filter by specific status names
  - archived (boolean): Include archived tasks (default: false)
  - include_closed (boolean): Include closed tasks (default: false)
  - custom_fields (string[], optional): Specific custom field names to include
  - include_standard_fields (boolean): Include ID, name, status, etc. (default: true)

Returns:
  CSV content as text (can be saved to file by client).

Examples:
  - Use when: "Export all tasks from list 123456 to CSV"
  - Use when: "Export tasks with status '#1 - phone call'"
  - Use when: "Export leads with specific custom fields to CSV"`,
      inputSchema: z.object({
        list_id: z.string().min(1).describe("List ID"),
        statuses: z.array(z.string()).optional().describe("Filter by specific status names"),
        archived: z.boolean().default(false).describe("Include archived tasks"),
        include_closed: z.boolean().default(false).describe("Include closed tasks"),
        custom_fields: z.array(z.string()).optional().describe("Specific custom field names to include"),
        include_standard_fields: z.boolean().default(true).describe("Include standard fields")
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
          include_standard_fields: params.include_standard_fields
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
