/**
 * ClickUp time tracking tools: Start, Stop, Get entries
 */

import { z } from "zod";
import { server, ResponseFormatSchema } from "../server.js";
import { ResponseFormat } from "../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatTimeEntryMarkdown,
  truncateResponse,
  formatTruncationInfo
} from "../utils/index.js";
import type { ClickUpTimeEntry } from "../types.js";

/**
 * Register all time tracking related tools
 */
export function registerTimeTrackingTools(): void {
  // ============================================================================
  // Tool: Start Time Entry
  // ============================================================================

  server.registerTool(
    "clickup_start_time_entry",
    {
      title: "Start Time Tracking",
      description: `Start tracking time on a task.

This tool starts a new time tracking entry for the authenticated user on a specific task.

Args:
  - team_id (string): The team ID
  - task_id (string): The task ID to track time for
  - description (string, optional): Description of what you're working on

Returns:
  The started time entry with start time and ID.

Examples:
  - Use when: "Start tracking time on task abc123"
  - Use when: "Begin time entry for this task"

Error Handling:
  - Returns error if already tracking time
  - Returns "Error: Resource not found" if task_id is invalid (404)`,
      inputSchema: z.object({
        team_id: z.string().min(1).describe("Team ID"),
        task_id: z.string().min(1).describe("Task ID"),
        description: z.string().optional().describe("Description of work")
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
        const data: any = { tid: params.task_id };
        if (params.description) data.description = params.description;

        const entry = await makeApiRequest<{ data: ClickUpTimeEntry }>(
          `team/${params.team_id}/time_entries/start`,
          "POST",
          data
        );

        return {
          content: [{
            type: "text",
            text: `Time tracking started successfully\n\n${formatTimeEntryMarkdown(entry.data)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }]
        };
      }
    }
  );

  // ============================================================================
  // Tool: Stop Time Entry
  // ============================================================================

  server.registerTool(
    "clickup_stop_time_entry",
    {
      title: "Stop Time Tracking",
      description: `Stop the currently running time entry.

This tool stops the active time tracking entry for the authenticated user.

Args:
  - team_id (string): The team ID

Returns:
  The completed time entry with duration.

Examples:
  - Use when: "Stop tracking time"
  - Use when: "End current time entry"

Error Handling:
  - Returns error if no active time tracking
  - Returns "Error: Resource not found" if team_id is invalid (404)`,
      inputSchema: z.object({
        team_id: z.string().min(1).describe("Team ID")
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
        const entry = await makeApiRequest<{ data: ClickUpTimeEntry }>(
          `team/${params.team_id}/time_entries/stop`,
          "POST"
        );

        return {
          content: [{
            type: "text",
            text: `Time tracking stopped successfully\n\n${formatTimeEntryMarkdown(entry.data)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }]
        };
      }
    }
  );

  // ============================================================================
  // Tool: Get Time Entries
  // ============================================================================

  server.registerTool(
    "clickup_get_time_entries",
    {
      title: "Get Time Entries",
      description: `Get time tracking entries for a team.

This tool retrieves time entries with optional filtering by assignee and date range.

Args:
  - team_id (string): The team ID
  - assignee (number, optional): Filter by assignee user ID
  - start_date (number, optional): Filter entries after this date (Unix timestamp)
  - end_date (number, optional): Filter entries before this date (Unix timestamp)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of time entries with task, user, duration, and dates.

Examples:
  - Use when: "Show me time entries for team 123456"
  - Use when: "Get time tracked by user 789 this week"

Error Handling:
  - Returns "Error: Resource not found" if team_id is invalid (404)`,
      inputSchema: z.object({
        team_id: z.string().min(1).describe("Team ID"),
        assignee: z.number().optional().describe("Filter by assignee user ID"),
        start_date: z.number().optional().describe("Filter after date (Unix timestamp)"),
        end_date: z.number().optional().describe("Filter before date (Unix timestamp)"),
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
        const queryParams: any = {};
        if (params.assignee) queryParams.assignee = params.assignee;
        if (params.start_date) queryParams.start_date = params.start_date;
        if (params.end_date) queryParams.end_date = params.end_date;

        const data = await makeApiRequest<{ data: ClickUpTimeEntry[] }>(
          `team/${params.team_id}/time_entries`,
          "GET",
          undefined,
          queryParams
        );
        const entries = data.data || [];

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = [`# Time Entries for Team ${params.team_id}`, ""];
          lines.push(`Found ${entries.length} time entr${entries.length === 1 ? "y" : "ies"}`, "");
          lines.push("");

          for (const entry of entries) {
            lines.push(formatTimeEntryMarkdown(entry));
            lines.push("");
            lines.push("---");
            lines.push("");
          }

          result = lines.join("\n");
        } else {
          result = JSON.stringify({ entries }, null, 2);
        }

        const { content: finalContent, truncation } = truncateResponse(result, entries.length, "entries");
        result = finalContent + formatTruncationInfo(truncation);

        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }]
        };
      }
    }
  );
}
