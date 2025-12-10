/**
 * ClickUp task read tools: Get tasks and task details
 */

import { z } from "zod";
import { server, ResponseFormatSchema, ResponseModeSchema, PaginationSchema } from "../server.js";
import { ResponseFormat, ResponseMode, DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatTaskMarkdown,
  formatTaskCompact,
  generateTaskSummary,
  truncateResponse,
  formatTruncationInfo,
  filterTasksByStatus,
  getPagination
} from "../utils/index.js";
import type { ClickUpTask } from "../types.js";

/**
 * Register task read tools
 */
export function registerTaskReadTools(): void {
  // ============================================================================
  // Tool: Get Tasks
  // ============================================================================

  server.registerTool(
    "clickup_get_tasks",
    {
      title: "Get Tasks in List",
      description: `Get tasks in a specific list with filtering and pagination.

This tool retrieves tasks from a list with support for filtering by status, assignee, and other criteria.

Args:
  - list_id (string): The list ID
  - archived (boolean): Include archived tasks (default: false)
  - include_closed (boolean): Include closed tasks (default: false)
  - statuses (string[], optional): Filter by status names. MUST be an array, e.g., ["to do", "in progress"]
  - assignees (number[], optional): Filter by assignee IDs. MUST be an array, e.g., [123, 456]
  - limit (number): Maximum results (1-100, default: 20)
  - offset (number): Pagination offset (default: 0). MUST be a multiple of limit
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')
  - response_mode ('full' | 'compact' | 'summary'): Detail level (default: 'full')

Pagination:
  Use the next_offset value from the response to get the next page.

Examples:
  - Use when: "Show me tasks in list 123456"
  - Use when: "Get all 'to do' tasks assigned to user 789"
  - Use with: response_mode='compact' for large lists (100+ tasks)`,
      inputSchema: z.object({
        list_id: z.string().min(1).describe("List ID"),
        archived: z.boolean().default(false).describe("Include archived tasks"),
        include_closed: z.boolean().default(false).describe("Include closed tasks"),
        statuses: z.array(z.string()).optional().describe("Filter by status names"),
        assignees: z.array(z.number()).optional().describe("Filter by assignee IDs"),
        ...PaginationSchema.shape,
        response_format: ResponseFormatSchema,
        response_mode: ResponseModeSchema
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
        const limit = params.limit ?? DEFAULT_LIMIT;
        const offset = params.offset ?? 0;

        if (offset % limit !== 0) {
          return {
            content: [{
              type: "text",
              text: `Error: offset (${offset}) must be a multiple of limit (${limit}).`
            }]
          };
        }

        const queryParams: any = {
          archived: params.archived,
          include_closed: params.include_closed,
          page: Math.floor(offset / limit)
        };

        let useClientSideFiltering = false;
        let allTasks: ClickUpTask[] = [];

        if (params.statuses?.length) {
          queryParams.statuses = JSON.stringify(params.statuses);
        }
        if (params.assignees?.length) {
          queryParams.assignees = JSON.stringify(params.assignees);
        }

        try {
          const data = await makeApiRequest<{ tasks: ClickUpTask[] }>(
            `list/${params.list_id}/task`, "GET", undefined, queryParams
          );
          allTasks = data.tasks || [];
        } catch (error) {
          // Fall back to client-side filtering on 400 error with status filters
          if ((error as any).response?.status === 400 && params.statuses?.length) {
            useClientSideFiltering = true;
            let currentOffset = 0;
            let hasMore = true;

            while (hasMore) {
              const fetchParams: any = {
                archived: params.archived,
                include_closed: params.include_closed,
                page: Math.floor(currentOffset / MAX_LIMIT)
              };
              if (params.assignees?.length) {
                fetchParams.assignees = JSON.stringify(params.assignees);
              }

              const fetchData = await makeApiRequest<{ tasks: ClickUpTask[] }>(
                `list/${params.list_id}/task`, "GET", undefined, fetchParams
              );
              const fetchedTasks = fetchData.tasks || [];
              allTasks.push(...fetchedTasks);
              hasMore = fetchedTasks.length === MAX_LIMIT;
              currentOffset += MAX_LIMIT;
            }
            allTasks = filterTasksByStatus(allTasks, params.statuses);
          } else {
            throw error;
          }
        }

        const paginatedTasks = useClientSideFiltering
          ? allTasks.slice(offset, offset + limit)
          : allTasks;

        const pagination = getPagination(
          useClientSideFiltering ? allTasks.length : undefined,
          paginatedTasks.length, offset, limit
        );

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (params.response_mode === ResponseMode.SUMMARY) {
            result = generateTaskSummary(useClientSideFiltering ? allTasks : paginatedTasks);
          } else {
            const lines: string[] = [`# Tasks in List ${params.list_id}`, ""];
            const totalCount = useClientSideFiltering ? allTasks.length : paginatedTasks.length;
            lines.push(`Found ${totalCount} task(s) (offset: ${offset})`, "");

            for (const task of paginatedTasks) {
              if (params.response_mode === ResponseMode.COMPACT) {
                lines.push(formatTaskCompact(task));
              } else {
                lines.push(formatTaskMarkdown(task), "", "---", "");
              }
            }

            if (pagination.has_more) {
              lines.push("", `More results available. Use offset=${pagination.next_offset}`);
            }
            result = lines.join("\n");
          }
        } else {
          result = JSON.stringify({ tasks: paginatedTasks, pagination }, null, 2);
        }

        const { content: finalContent, truncation } = truncateResponse(result, paginatedTasks.length, "tasks");
        result = finalContent + formatTruncationInfo(truncation);

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // ============================================================================
  // Tool: Get Task
  // ============================================================================

  server.registerTool(
    "clickup_get_task",
    {
      title: "Get Task Details",
      description: `Get detailed information about a specific task.

Args:
  - task_id (string): The task ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete task information including name, description, status, priority,
  assignees, due date, custom fields, checklists, tags, and URL.

Examples:
  - Use when: "Show me details for task abc123"
  - Use when: "What's the status of task xyz?"`,
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
        const result = params.response_format === ResponseFormat.MARKDOWN
          ? formatTaskMarkdown(task)
          : JSON.stringify(task, null, 2);

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
