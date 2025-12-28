/**
 * @file get-tasks.ts
 * @description MCP tool for retrieving tasks from a ClickUp list with filtering and pagination.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormatSchema, ResponseModeSchema, PaginationSchema } from "./schemas.js";
import { ResponseFormat, ResponseMode, DEFAULT_LIMIT, MAX_LIMIT } from "../../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatTaskMarkdown,
  formatTaskCompact,
  generateTaskSummary,
  getPagination,
  truncateResponse,
  formatTruncationInfo,
  filterTasksByStatus
} from "../../utils.js";
import type { ClickUpTask } from "../../types.js";

/**
 * Registers the clickup_get_tasks tool with the MCP server.
 * This tool retrieves tasks from a list with filtering and pagination support.
 */
export function registerGetTasksTool(server: McpServer): void {
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
  - offset (number): Pagination offset (default: 0). MUST be a multiple of limit (0, 20, 40, 60, etc.)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')
  - response_mode ('full' | 'compact' | 'summary'): Detail level (default: 'full')

Pagination:
  Use the next_offset value from the response to get the next page. Offset must be a multiple of limit.

Examples:
  - Use when: "Show me tasks in list 123456"
  - Use when: "Get all 'to do' tasks assigned to user 789"
  - Use with: response_mode='compact' for large lists (100+ tasks)`,
      inputSchema: z.object({
        list_id: z.string().min(1).describe("List ID"),
        archived: z.boolean().default(false).describe("Include archived tasks"),
        include_closed: z.boolean().default(false).describe("Include closed tasks"),
        statuses: z.array(z.string()).optional().describe("Filter by status names - MUST be array like [\"to do\", \"in progress\"]"),
        assignees: z.array(z.number()).optional().describe("Filter by assignee IDs - MUST be array like [123, 456]"),
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
              text: `Error: offset (${offset}) must be a multiple of limit (${limit}) for proper pagination.`
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

        if (params.statuses && params.statuses.length > 0) {
          queryParams.statuses = JSON.stringify(params.statuses);
        }
        if (params.assignees && params.assignees.length > 0) {
          queryParams.assignees = params.assignees;
        }

        try {
          const data = await makeApiRequest<{ tasks: ClickUpTask[] }>(
            `list/${params.list_id}/task`,
            "GET",
            undefined,
            queryParams
          );
          allTasks = data.tasks || [];
        } catch (error) {
          if (error instanceof Error && 'response' in error && (error as any).response?.status === 400 && params.statuses && params.statuses.length > 0) {
            useClientSideFiltering = true;
            let currentOffset = 0;
            let hasMore = true;
            const fetchLimit = MAX_LIMIT;

            while (hasMore) {
              const fetchParams: any = {
                archived: params.archived,
                include_closed: params.include_closed,
                page: Math.floor(currentOffset / fetchLimit)
              };
              if (params.assignees && params.assignees.length > 0) {
                fetchParams.assignees = params.assignees;
              }

              const fetchData = await makeApiRequest<{ tasks: ClickUpTask[] }>(
                `list/${params.list_id}/task`,
                "GET",
                undefined,
                fetchParams
              );

              const fetchedTasks = fetchData.tasks || [];
              allTasks.push(...fetchedTasks);
              hasMore = fetchedTasks.length === fetchLimit;
              currentOffset += fetchLimit;
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
          paginatedTasks.length,
          offset,
          limit
        );

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = [`# Tasks in List ${params.list_id}`, ""];

          if (params.response_mode === ResponseMode.SUMMARY) {
            result = generateTaskSummary(useClientSideFiltering ? allTasks : paginatedTasks);
          } else {
            const totalCount = useClientSideFiltering ? allTasks.length : paginatedTasks.length;
            lines.push(`Found ${totalCount} task(s) (offset: ${offset})`, "");

            for (const task of paginatedTasks) {
              if (params.response_mode === ResponseMode.COMPACT) {
                lines.push(formatTaskCompact(task));
              } else {
                lines.push(formatTaskMarkdown(task));
                lines.push("", "---", "");
              }
            }

            if (pagination.has_more) {
              lines.push("", `More results available. Use offset=${pagination.next_offset} to get next page.`);
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
}
