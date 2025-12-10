/**
 * ClickUp task search tool
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
 * Register task search tool
 */
export function registerTaskSearchTools(): void {
  server.registerTool(
    "clickup_search_tasks",
    {
      title: "Search ClickUp Tasks",
      description: `Search for tasks across a team with advanced filtering.

Args:
  - team_id (string): The team ID to search in
  - query (string, optional): Search query string
  - statuses (string[], optional): Filter by status names
  - assignees (number[], optional): Filter by assignee IDs
  - tags (string[], optional): Filter by tag names
  - date_created_gt (number, optional): Created after (Unix timestamp)
  - date_updated_gt (number, optional): Updated after (Unix timestamp)
  - limit (number): Maximum results (1-100, default: 20)
  - offset (number): Pagination offset (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')
  - response_mode ('full' | 'compact' | 'summary'): Detail level (default: 'full')

Examples:
  - Use when: "Search for tasks containing 'bug' in team 123456"
  - Use when: "Find all 'in progress' tasks assigned to user 789"
  - Use with: response_mode='compact' for large result sets`,
      inputSchema: z.object({
        team_id: z.string().min(1).describe("Team ID"),
        query: z.string().optional().describe("Search query string"),
        statuses: z.array(z.string()).optional().describe("Filter by status names"),
        assignees: z.array(z.number()).optional().describe("Filter by assignee IDs"),
        tags: z.array(z.string()).optional().describe("Filter by tag names"),
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
              text: `Error: offset (${offset}) must be a multiple of limit (${limit}).`
            }]
          };
        }

        const queryParams: any = { page: Math.floor(offset / limit) };
        let useClientSideFiltering = false;
        let allTasks: ClickUpTask[] = [];

        if (params.query) queryParams.query = params.query;
        if (params.statuses?.length) queryParams.statuses = JSON.stringify(params.statuses);
        if (params.assignees) queryParams.assignees = JSON.stringify(params.assignees);
        if (params.tags) queryParams.tags = JSON.stringify(params.tags);
        if (params.date_created_gt) queryParams.date_created_gt = params.date_created_gt;
        if (params.date_updated_gt) queryParams.date_updated_gt = params.date_updated_gt;

        try {
          const data = await makeApiRequest<{ tasks: ClickUpTask[] }>(
            `team/${params.team_id}/task`, "GET", undefined, queryParams
          );
          allTasks = data.tasks || [];
        } catch (error) {
          // Fall back to client-side filtering on 400 error with status filters
          if ((error as any).response?.status === 400 && params.statuses?.length) {
            useClientSideFiltering = true;
            let currentOffset = 0;
            let hasMore = true;

            while (hasMore) {
              const fetchParams: any = { page: Math.floor(currentOffset / MAX_LIMIT) };
              if (params.query) fetchParams.query = params.query;
              if (params.assignees) fetchParams.assignees = JSON.stringify(params.assignees);
              if (params.tags) fetchParams.tags = JSON.stringify(params.tags);
              if (params.date_created_gt) fetchParams.date_created_gt = params.date_created_gt;
              if (params.date_updated_gt) fetchParams.date_updated_gt = params.date_updated_gt;

              const fetchData = await makeApiRequest<{ tasks: ClickUpTask[] }>(
                `team/${params.team_id}/task`, "GET", undefined, fetchParams
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
            const lines: string[] = ["# Task Search Results", ""];
            const totalCount = useClientSideFiltering ? allTasks.length : paginatedTasks.length;
            lines.push(`Found ${totalCount} task(s)`, "");

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
}
