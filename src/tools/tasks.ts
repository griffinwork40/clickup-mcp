/**
 * ClickUp task tools: CRUD, search, count, export
 */

import { z } from "zod";
import { server, ResponseFormatSchema, ResponseModeSchema, PaginationSchema } from "../server.js";
import { ResponseFormat, ResponseMode, Priority, DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatTaskMarkdown,
  formatTaskCompact,
  generateTaskSummary,
  truncateResponse,
  formatTruncationInfo,
  filterTasksByStatus,
  getPagination,
  countTasksByStatus,
  exportTasksToCSV
} from "../utils/index.js";
import type { ClickUpTask } from "../types.js";

/**
 * Register all task-related tools
 */
export function registerTaskTools(): void {
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
  - offset (number): Pagination offset (default: 0). MUST be a multiple of limit (0, 20, 40, 60, etc.)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')
  - response_mode ('full' | 'compact' | 'summary'): Detail level (default: 'full')
    * 'full': Complete task details with descriptions
    * 'compact': Essential fields only (id, name, status, assignees) - use for large result sets
    * 'summary': Statistical overview by status/assignee without individual task details

Pagination:
  Use the next_offset value from the response to get the next page. Offset must be a multiple of limit.

Returns:
  For JSON format:
  {
    "tasks": [...],
    "pagination": {
      "count": number,
      "offset": number,
      "has_more": boolean,
      "next_offset": number
    }
  }

Examples:
  - Use when: "Show me tasks in list 123456"
  - Use when: "Get all 'to do' tasks assigned to user 789"
  - Use with: response_mode='compact' for large lists (100+ tasks)
  - Use with: response_mode='summary' for quick status overview

Error Handling:
  - Returns "Error: Resource not found" if list_id is invalid (404)
  - Returns helpful error if arrays not formatted correctly`,
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

        // Validate pagination alignment
        if (offset % limit !== 0) {
          return {
            content: [{
              type: "text",
              text: `Error: offset (${offset}) must be a multiple of limit (${limit}) for proper pagination. Use the next_offset value from previous responses, or ensure offset is divisible by limit.`
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

        // Try API filtering first if statuses are specified
        if (params.statuses && params.statuses.length > 0) {
          queryParams.statuses = JSON.stringify(params.statuses);
        }

        if (params.assignees && params.assignees.length > 0) {
          queryParams.assignees = JSON.stringify(params.assignees);
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
          // If API filtering fails with 400 error and we have status filters, fall back to client-side filtering
          if (error instanceof Error && 'response' in error && (error as any).response?.status === 400 && params.statuses && params.statuses.length > 0) {
            useClientSideFiltering = true;
            
            // Fetch all tasks with pagination
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
                fetchParams.assignees = JSON.stringify(params.assignees);
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
            
            // Apply client-side status filtering
            allTasks = filterTasksByStatus(allTasks, params.statuses);
          } else {
            throw error;
          }
        }

        // Apply pagination to results
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

          // Handle summary mode
          if (params.response_mode === ResponseMode.SUMMARY) {
            result = generateTaskSummary(useClientSideFiltering ? allTasks : paginatedTasks);
          } else {
            const totalCount = useClientSideFiltering ? allTasks.length : paginatedTasks.length;
            lines.push(`Found ${totalCount} task(s) (offset: ${offset})`, "");
            if (useClientSideFiltering && params.statuses) {
              lines.push(`*(Using client-side filtering for status: ${params.statuses.join(", ")})*`, "");
            }

            // Handle full vs compact mode
            for (const task of paginatedTasks) {
              if (params.response_mode === ResponseMode.COMPACT) {
                lines.push(formatTaskCompact(task));
              } else {
                lines.push(formatTaskMarkdown(task));
                lines.push("");
                lines.push("---");
                lines.push("");
              }
            }

            if (pagination.has_more) {
              lines.push("");
              lines.push(`More results available. Use offset=${pagination.next_offset} to get next page.`);
            }

            result = lines.join("\n");
          }
        } else {
          result = JSON.stringify({ tasks: paginatedTasks, pagination }, null, 2);
        }

        const { content: finalContent, truncation } = truncateResponse(result, paginatedTasks.length, "tasks");
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

  // ============================================================================
  // Tool: Get Task
  // ============================================================================

  server.registerTool(
    "clickup_get_task",
    {
      title: "Get Task Details",
      description: `Get detailed information about a specific task.

This tool retrieves complete information about a single task, including description, status, assignees, custom fields, checklists, and more.

Args:
  - task_id (string): The task ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete task information including:
  - Name, description, status, priority
  - Assignees, watchers, creator
  - Due date, time estimates, time spent
  - Custom fields, checklists, tags
  - Related tasks, dependencies
  - URL for viewing in ClickUp

Examples:
  - Use when: "Show me details for task abc123"
  - Use when: "What's the status of task xyz?"

Error Handling:
  - Returns "Error: Resource not found" if task_id is invalid (404)`,
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

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          result = formatTaskMarkdown(task);
        } else {
          result = JSON.stringify(task, null, 2);
        }

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

  // ============================================================================
  // Tool: Create Task
  // ============================================================================

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
        const taskData: any = {
          name: params.name
        };

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

  // ============================================================================
  // Tool: Update Task
  // ============================================================================

  server.registerTool(
    "clickup_update_task",
    {
      title: "Update ClickUp Task",
      description: `Update an existing task's properties.

This tool updates one or more properties of an existing task. Only include the fields you want to change.

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
  - Use when: "Change task priority to urgent and add assignee 789"

Error Handling:
  - Returns "Error: Resource not found" if task_id is invalid (404)
  - Returns "Error: Bad request" if status doesn't exist in list (400)`,
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

        // Handle assignee updates separately
        if (params.assignees_add && params.assignees_add.length > 0) {
          updateData.assignees = { add: params.assignees_add };
        }
        if (params.assignees_rem && params.assignees_rem.length > 0) {
          if (!updateData.assignees) updateData.assignees = {};
          updateData.assignees.rem = params.assignees_rem;
        }

        const task = await makeApiRequest<ClickUpTask>(
          `task/${params.task_id}`,
          "PUT",
          updateData
        );

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = ["# Task Updated Successfully", ""];
          lines.push(formatTaskMarkdown(task));
          result = lines.join("\n");
        } else {
          result = JSON.stringify(task, null, 2);
        }

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

  // ============================================================================
  // Tool: Delete Task
  // ============================================================================

  server.registerTool(
    "clickup_delete_task",
    {
      title: "Delete ClickUp Task",
      description: `Delete a task permanently.

⚠️ WARNING: This action is destructive and cannot be undone. The task will be permanently deleted from ClickUp.

Args:
  - task_id (string): The task ID to delete

Returns:
  Confirmation message of deletion.

Examples:
  - Use when: "Delete task abc123"
  - Don't use when: You want to archive (use update status to 'closed' instead)

Error Handling:
  - Returns "Error: Resource not found" if task_id is invalid (404)
  - Returns "Error: Permission denied" if no delete access (403)`,
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
        return {
          content: [{ type: "text", text: handleApiError(error) }]
        };
      }
    }
  );

  // ============================================================================
  // Tool: Search Tasks
  // ============================================================================

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
  - offset (number): Pagination offset (default: 0). MUST be a multiple of limit (0, 20, 40, 60, etc.)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')
  - response_mode ('full' | 'compact' | 'summary'): Detail level (default: 'full')
    * 'full': Complete task details with descriptions
    * 'compact': Essential fields only (id, name, status, assignees) - use for large result sets
    * 'summary': Statistical overview by status/assignee without individual task details

Pagination:
  Use the next_offset value from the response to get the next page. Offset must be a multiple of limit.

Returns:
  Matching tasks with pagination information.

Examples:
  - Use when: "Search for tasks containing 'bug' in team 123456"
  - Use when: "Find all 'in progress' tasks assigned to user 789"
  - Use with: response_mode='compact' for large result sets
  - Use with: response_mode='summary' for quick overview

Error Handling:
  - Returns "Error: Resource not found" if team_id is invalid (404)
  - Returns helpful error if arrays not formatted correctly`,
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

        // Validate pagination alignment
        if (offset % limit !== 0) {
          return {
            content: [{
              type: "text",
              text: `Error: offset (${offset}) must be a multiple of limit (${limit}) for proper pagination. Use the next_offset value from previous responses, or ensure offset is divisible by limit.`
            }]
          };
        }

        const queryParams: any = {
          page: Math.floor(offset / limit)
        };

        let useClientSideFiltering = false;
        let allTasks: ClickUpTask[] = [];

        if (params.query) queryParams.query = params.query;
        if (params.statuses && params.statuses.length > 0) {
          queryParams.statuses = JSON.stringify(params.statuses);
        }
        if (params.assignees) queryParams.assignees = JSON.stringify(params.assignees);
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
          // If API filtering fails with 400 error and we have status filters, fall back to client-side filtering
          if (error instanceof Error && 'response' in error && (error as any).response?.status === 400 && params.statuses && params.statuses.length > 0) {
            useClientSideFiltering = true;
            
            // Fetch all tasks with pagination
            let currentOffset = 0;
            let hasMore = true;
            const fetchLimit = MAX_LIMIT;
            
            while (hasMore) {
              const fetchParams: any = {
                page: Math.floor(currentOffset / fetchLimit)
              };
              
              if (params.query) fetchParams.query = params.query;
              if (params.assignees) fetchParams.assignees = JSON.stringify(params.assignees);
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
            
            // Apply client-side status filtering
            allTasks = filterTasksByStatus(allTasks, params.statuses);
          } else {
            throw error;
          }
        }

        // Apply pagination to results
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

          // Handle summary mode
          if (params.response_mode === ResponseMode.SUMMARY) {
            result = generateTaskSummary(useClientSideFiltering ? allTasks : paginatedTasks);
          } else {
            const totalCount = useClientSideFiltering ? allTasks.length : paginatedTasks.length;
            lines.push(`Found ${totalCount} task(s)`, "");
            if (useClientSideFiltering && params.statuses) {
              lines.push(`*(Using client-side filtering for status: ${params.statuses.join(", ")})*`, "");
            }

            // Handle full vs compact mode
            for (const task of paginatedTasks) {
              if (params.response_mode === ResponseMode.COMPACT) {
                lines.push(formatTaskCompact(task));
              } else {
                lines.push(formatTaskMarkdown(task));
                lines.push("");
                lines.push("---");
                lines.push("");
              }
            }

            if (pagination.has_more) {
              lines.push("");
              lines.push(`More results available. Use offset=${pagination.next_offset} to get next page.`);
            }

            result = lines.join("\n");
          }
        } else {
          result = JSON.stringify({ tasks: paginatedTasks, pagination }, null, 2);
        }

        const { content: finalContent, truncation } = truncateResponse(result, paginatedTasks.length, "tasks");
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

  // ============================================================================
  // Tool: Count Tasks by Status
  // ============================================================================

  server.registerTool(
    "clickup_count_tasks_by_status",
    {
      title: "Count Tasks by Status",
      description: `Count tasks in a list, optionally filtered by status.

This tool handles pagination internally and returns counts efficiently. It's optimized for counting tasks by status, which is useful for lead tracking, status reporting, and analytics.

Args:
  - list_id (string): The list ID to count tasks in
  - statuses (string[], optional): Filter by specific status names. If omitted, returns counts for all statuses
  - archived (boolean): Include archived tasks (default: false)
  - include_closed (boolean): Include closed tasks (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "total": number,
    "by_status": {
      "status_name": count,
      ...
    }
  }

Examples:
  - Use when: "Count all tasks in list 123456"
  - Use when: "How many tasks have status '#1 - phone call' in list 123456?"
  - Use when: "Get counts for all statuses in this list"

Error Handling:
  - Returns "Error: Resource not found" if list_id is invalid (404)`,
      inputSchema: z.object({
        list_id: z.string().min(1).describe("List ID"),
        statuses: z.array(z.string()).optional().describe("Filter by specific status names. If omitted, returns counts for all statuses"),
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
          
          if (params.statuses && params.statuses.length > 0) {
            lines.push(`**Filtering by status**: ${params.statuses.join(", ")}`, "");
          }
          
          lines.push(`**Total tasks**: ${result.total}`, "");
          lines.push("");

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

        return {
          content: [{ type: "text", text: output }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }]
        };
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

This tool handles pagination, status filtering, and custom field extraction automatically. It fetches detailed task information to include all custom fields in the export.

Args:
  - list_id (string): The list to export from
  - statuses (string[], optional): Filter by specific status names. If omitted, exports all tasks
  - archived (boolean): Include archived tasks (default: false)
  - include_closed (boolean): Include closed tasks (default: false)
  - custom_fields (string[], optional): Specific custom field names to include. If omitted, includes all custom fields found
  - include_standard_fields (boolean): Include standard fields like ID, name, status, etc. (default: true)

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
        include_standard_fields: z.boolean().default(true).describe("Include standard fields like ID, name, status, etc.")
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

        return {
          content: [{
            type: "text",
            text: csvContent
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
