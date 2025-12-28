/**
 * @file search-tasks.ts
 * @description MCP tool for searching tasks across a ClickUp team with advanced filtering.
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
 * Registers the clickup_search_tasks tool with the MCP server.
 * This tool searches for tasks across a team with multiple filter options.
 */
export function registerSearchTasksTool(server: McpServer): void {
  server.registerTool(
    "clickup_search_tasks",
    {
      title: "Search ClickUp Tasks",
      description: `Search for tasks across a team with advanced filtering.

This tool searches across all accessible tasks in a team with support for multiple filters.

Args:
  - team_id (string): The team ID to search in
  - query (string, optional): Search query string
  - statuses (string[], optional): Filter by status names. MUST be an array, e.g., ["to do", "in progress"]
  - assignees (number[], optional): Filter by assignee IDs. MUST be an array, e.g., [123, 456]
  - tags (string[], optional): Filter by tag names. MUST be an array, e.g., ["bug", "feature"]
  - date_created_gt (number, optional): Created after (Unix timestamp)
  - date_updated_gt (number, optional): Updated after (Unix timestamp)
  - limit (number): Maximum results (1-100, default: 20)
  - offset (number): Pagination offset (default: 0). MUST be a multiple of limit
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')
  - response_mode ('full' | 'compact' | 'summary'): Detail level (default: 'full')

Pagination:
  Use the next_offset value from the response to get the next page. Offset must be a multiple of limit.

Examples:
  - Use when: "Search for tasks containing 'bug' in team 123456"
  - Use when: "Find all 'in progress' tasks assigned to user 789"`,
      inputSchema: z.object({
        team_id: z.string().min(1).describe("Team ID"),
        query: z.string().optional().describe("Search query string"),
        statuses: z.array(z.string()).optional().describe("Filter by status names - MUST be array like [\"to do\", \"in progress\"]"),
        assignees: z.array(z.number()).optional().describe("Filter by assignee IDs - MUST be array like [123, 456]"),
        tags: z.array(z.string()).optional().describe("Filter by tag names - MUST be array like [\"bug\", \"feature\"]"),
        date_created_gt: z.number().optional().describe("Created after (Unix timestamp)"),
        date_updated_gt: z.number().optional().describe("Updated after (Unix timestamp)"),
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

        const queryParams: any = { page: Math.floor(offset / limit) };
        let useClientSideFiltering = false;
        let allTasks: ClickUpTask[] = [];

        if (params.query) queryParams.query = params.query;
        if (params.statuses && params.statuses.length > 0) {
          queryParams.statuses = JSON.stringify(params.statuses);
        }
        if (params.assignees) queryParams.assignees = params.assignees;
        if (params.tags) queryParams.tags = JSON.stringify(params.tags);
        if (params.date_created_gt) queryParams.date_created_gt = params.date_created_gt;
        if (params.date_updated_gt) queryParams.date_updated_gt = params.date_updated_gt;

        try {
          const data = await makeApiRequest<{ tasks: ClickUpTask[] }>(
            `team/${params.team_id}/task`,
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
              const fetchParams: any = { page: Math.floor(currentOffset / fetchLimit) };
              if (params.query) fetchParams.query = params.query;
              if (params.assignees) fetchParams.assignees = params.assignees;
              if (params.tags) fetchParams.tags = JSON.stringify(params.tags);
              if (params.date_created_gt) fetchParams.date_created_gt = params.date_created_gt;
              if (params.date_updated_gt) fetchParams.date_updated_gt = params.date_updated_gt;

              const fetchData = await makeApiRequest<{ tasks: ClickUpTask[] }>(
                `team/${params.team_id}/task`,
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
          const lines: string[] = ["# Task Search Results", ""];

          if (params.response_mode === ResponseMode.SUMMARY) {
            result = generateTaskSummary(useClientSideFiltering ? allTasks : paginatedTasks);
          } else {
            const totalCount = useClientSideFiltering ? allTasks.length : paginatedTasks.length;
            lines.push(`Found ${totalCount} task(s)`, "");

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
