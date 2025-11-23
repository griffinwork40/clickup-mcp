#!/usr/bin/env node
/**
 * ClickUp MCP Server
 *
 * A Model Context Protocol server that provides comprehensive integration with the ClickUp API.
 * Enables LLMs to manage tasks, projects, teams, and workflows programmatically.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  makeApiRequest,
  handleApiError,
  formatTaskMarkdown,
  formatTaskCompact,
  generateTaskSummary,
  formatListMarkdown,
  formatSpaceMarkdown,
  formatFolderMarkdown,
  formatCommentMarkdown,
  formatTimeEntryMarkdown,
  getPagination,
  truncateResponse,
  formatTruncationInfo,
  getApiToken
} from "./utils.js";
import { ResponseFormat, ResponseMode, Priority, DEFAULT_LIMIT, MAX_LIMIT } from "./constants.js";
import type {
  ClickUpTeam,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpList,
  ClickUpTask,
  ClickUpComment,
  ClickUpTimeEntry
} from "./types.js";

// ============================================================================
// Server Initialization
// ============================================================================

const server = new McpServer({
  name: "clickup-mcp-server",
  version: "1.0.0"
});

// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================

const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

const ResponseModeSchema = z.nativeEnum(ResponseMode)
  .default(ResponseMode.FULL)
  .describe("Response detail level: 'full' for complete task details, 'compact' for essential fields only (id, name, status, assignees), 'summary' for statistical overview");

const PaginationSchema = z.object({
  limit: z.number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe(`Maximum results to return (1-${MAX_LIMIT})`),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination")
});

// ============================================================================
// Tool 1: Get Teams/Workspaces
// ============================================================================

server.registerTool(
  "clickup_get_teams",
  {
    title: "Get ClickUp Teams",
    description: `Get all teams/workspaces accessible to the authenticated user.

This tool retrieves the list of teams (also called workspaces) that the user has access to in ClickUp. Each team represents a top-level organizational unit.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "teams": [
      {
        "id": "string",         // Team ID
        "name": "string",       // Team name
        "color": "string",      // Team color (optional)
        "avatar": "string"      // Team avatar URL (optional)
      }
    ]
  }

Examples:
  - Use when: "What teams do I have access to?"
  - Use when: "List all my workspaces"
  - Don't use when: You need to list spaces or folders (use clickup_get_spaces instead)

Error Handling:
  - Returns "Error: Invalid or missing API token" if authentication fails (401)
  - Returns "Error: Rate limit exceeded" if too many requests (429)`,
    inputSchema: z.object({
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
      const data = await makeApiRequest<{ teams: ClickUpTeam[] }>("team");
      const teams = data.teams || [];

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = ["# ClickUp Teams", ""];
        lines.push(`Found ${teams.length} team(s)`, "");

        for (const team of teams) {
          lines.push(`## ${team.name} (${team.id})`);
          if (team.color) {
            lines.push(`- Color: ${team.color}`);
          }
          lines.push("");
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify({ teams }, null, 2);
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
// Tool 2: Get Spaces
// ============================================================================

server.registerTool(
  "clickup_get_spaces",
  {
    title: "Get ClickUp Spaces",
    description: `Get all spaces in a team/workspace.

Spaces are the second level in the ClickUp hierarchy (Team → Space → Folder → List → Task). This tool retrieves all spaces within a specific team.

Args:
  - team_id (string): The team/workspace ID
  - archived (boolean): Include archived spaces (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "spaces": [
      {
        "id": "string",
        "name": "string",
        "private": boolean,
        "multiple_assignees": boolean,
        "features": { ... }
      }
    ]
  }

Examples:
  - Use when: "Show me all spaces in team 123456"
  - Use when: "List the spaces in my workspace"
  - Don't use when: You need to list teams (use clickup_get_teams)

Error Handling:
  - Returns "Error: Resource not found" if team_id is invalid (404)`,
    inputSchema: z.object({
      team_id: z.string()
        .min(1)
        .describe("Team/workspace ID"),
      archived: z.boolean()
        .default(false)
        .describe("Include archived spaces"),
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
      const data = await makeApiRequest<{ spaces: ClickUpSpace[] }>(
        `team/${params.team_id}/space`,
        "GET",
        undefined,
        { archived: params.archived }
      );
      const spaces = data.spaces || [];

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [`# Spaces in Team ${params.team_id}`, ""];
        lines.push(`Found ${spaces.length} space(s)`, "");

        for (const space of spaces) {
          lines.push(formatSpaceMarkdown(space));
          lines.push("");
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify({ spaces }, null, 2);
      }

      const { content: finalContent, truncation } = truncateResponse(result, spaces.length, "spaces");
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
// Tool 3: Get Folders
// ============================================================================

server.registerTool(
  "clickup_get_folders",
  {
    title: "Get ClickUp Folders",
    description: `Get all folders in a space.

Folders are optional groupings within spaces (Team → Space → Folder → List → Task). This tool retrieves all folders in a specific space.

Args:
  - space_id (string): The space ID
  - archived (boolean): Include archived folders (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "folders": [
      {
        "id": "string",
        "name": "string",
        "hidden": boolean,
        "task_count": "string",
        "lists": [...]
      }
    ]
  }

Examples:
  - Use when: "Show me folders in space 123456"
  - Use when: "List all folders in this space"

Error Handling:
  - Returns "Error: Resource not found" if space_id is invalid (404)`,
    inputSchema: z.object({
      space_id: z.string()
        .min(1)
        .describe("Space ID"),
      archived: z.boolean()
        .default(false)
        .describe("Include archived folders"),
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
      const data = await makeApiRequest<{ folders: ClickUpFolder[] }>(
        `space/${params.space_id}/folder`,
        "GET",
        undefined,
        { archived: params.archived }
      );
      const folders = data.folders || [];

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [`# Folders in Space ${params.space_id}`, ""];
        lines.push(`Found ${folders.length} folder(s)`, "");

        for (const folder of folders) {
          lines.push(formatFolderMarkdown(folder));
          lines.push("");
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify({ folders }, null, 2);
      }

      const { content: finalContent, truncation } = truncateResponse(result, folders.length, "folders");
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
// Tool 4: Get Lists
// ============================================================================

server.registerTool(
  "clickup_get_lists",
  {
    title: "Get ClickUp Lists",
    description: `Get all lists in a folder or space.

Lists are containers for tasks (Team → Space → Folder → List → Task). This tool retrieves lists from either a folder or directly from a space (folderless lists).

Args:
  - folder_id (string, optional): Folder ID to get lists from
  - space_id (string, optional): Space ID to get folderless lists from
  - archived (boolean): Include archived lists (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Note: You must provide either folder_id OR space_id, but not both.

Returns:
  For JSON format:
  {
    "lists": [
      {
        "id": "string",
        "name": "string",
        "task_count": number,
        "statuses": [...]
      }
    ]
  }

Examples:
  - Use when: "Show me lists in folder 123456"
  - Use when: "Get folderless lists in space 789"

Error Handling:
  - Returns error if neither folder_id nor space_id provided
  - Returns "Error: Resource not found" if ID is invalid (404)`,
    inputSchema: z.object({
      folder_id: z.string().optional().describe("Folder ID"),
      space_id: z.string().optional().describe("Space ID"),
      archived: z.boolean().default(false).describe("Include archived lists"),
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
      if (!params.folder_id && !params.space_id) {
        return {
          content: [{
            type: "text",
            text: "Error: Must provide either folder_id or space_id"
          }]
        };
      }

      if (params.folder_id && params.space_id) {
        return {
          content: [{
            type: "text",
            text: "Error: Provide only one of folder_id or space_id, not both"
          }]
        };
      }

      const endpoint = params.folder_id
        ? `folder/${params.folder_id}/list`
        : `space/${params.space_id}/list`;

      const data = await makeApiRequest<{ lists: ClickUpList[] }>(
        endpoint,
        "GET",
        undefined,
        { archived: params.archived }
      );
      const lists = data.lists || [];

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const parent = params.folder_id ? `Folder ${params.folder_id}` : `Space ${params.space_id}`;
        const lines: string[] = [`# Lists in ${parent}`, ""];
        lines.push(`Found ${lists.length} list(s)`, "");

        for (const list of lists) {
          lines.push(formatListMarkdown(list));
          lines.push("");
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify({ lists }, null, 2);
      }

      const { content: finalContent, truncation } = truncateResponse(result, lists.length, "lists");
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
// Tool 5: Get List Details
// ============================================================================

server.registerTool(
  "clickup_get_list_details",
  {
    title: "Get ClickUp List Details",
    description: `Get detailed information about a specific list, including available statuses and custom fields.

This tool is essential for understanding what statuses and custom fields are available before creating or updating tasks in a list.

Args:
  - list_id (string): The list ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Detailed list information including:
  - Available statuses (for setting task status)
  - Custom fields (for setting custom field values)
  - Task count and other metadata

Examples:
  - Use when: "What statuses are available in list 123456?"
  - Use when: "Show me custom fields for this list"
  - Use before: Creating tasks to know valid statuses

Error Handling:
  - Returns "Error: Resource not found" if list_id is invalid (404)`,
    inputSchema: z.object({
      list_id: z.string().min(1).describe("List ID"),
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
      const list = await makeApiRequest<ClickUpList>(`list/${params.list_id}`);

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        result = formatListMarkdown(list);
      } else {
        result = JSON.stringify(list, null, 2);
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
// Tool 6: Get Tasks
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
  - offset (number): Pagination offset (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')
  - response_mode ('full' | 'compact' | 'summary'): Detail level (default: 'full')
    * 'full': Complete task details with descriptions
    * 'compact': Essential fields only (id, name, status, assignees) - use for large result sets
    * 'summary': Statistical overview by status/assignee without individual task details

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

      const queryParams: any = {
        archived: params.archived,
        include_closed: params.include_closed,
        page: Math.floor(offset / limit)
      };

      if (params.statuses && params.statuses.length > 0) {
        queryParams.statuses = JSON.stringify(params.statuses);
      }

      if (params.assignees && params.assignees.length > 0) {
        queryParams.assignees = JSON.stringify(params.assignees);
      }

      const data = await makeApiRequest<{ tasks: ClickUpTask[] }>(
        `list/${params.list_id}/task`,
        "GET",
        undefined,
        queryParams
      );
      const tasks = data.tasks || [];

      const pagination = getPagination(undefined, tasks.length, offset, limit);

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [`# Tasks in List ${params.list_id}`, ""];

        // Handle summary mode
        if (params.response_mode === ResponseMode.SUMMARY) {
          result = generateTaskSummary(tasks);
        } else {
          lines.push(`Found ${tasks.length} task(s) (offset: ${offset})`, "");

          // Handle full vs compact mode
          for (const task of tasks) {
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
        // JSON format always returns full data
        result = JSON.stringify({ tasks, pagination }, null, 2);
      }

      const { content: finalContent, truncation } = truncateResponse(result, tasks.length, "tasks");
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
// Tool 7: Get Task
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
// Tool 8: Create Task
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
// Tool 9: Update Task
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
// Tool 10: Delete Task
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
// Tool 11: Search Tasks
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
  - offset (number): Pagination offset (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')
  - response_mode ('full' | 'compact' | 'summary'): Detail level (default: 'full')
    * 'full': Complete task details with descriptions
    * 'compact': Essential fields only (id, name, status, assignees) - use for large result sets
    * 'summary': Statistical overview by status/assignee without individual task details

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

      const queryParams: any = {
        page: Math.floor(offset / limit)
      };

      if (params.query) queryParams.query = params.query;
      if (params.statuses) queryParams.statuses = JSON.stringify(params.statuses);
      if (params.assignees) queryParams.assignees = JSON.stringify(params.assignees);
      if (params.tags) queryParams.tags = JSON.stringify(params.tags);
      if (params.date_created_gt) queryParams.date_created_gt = params.date_created_gt;
      if (params.date_updated_gt) queryParams.date_updated_gt = params.date_updated_gt;

      const data = await makeApiRequest<{ tasks: ClickUpTask[] }>(
        `team/${params.team_id}/task`,
        "GET",
        undefined,
        queryParams
      );
      const tasks = data.tasks || [];

      const pagination = getPagination(undefined, tasks.length, offset, limit);

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = ["# Task Search Results", ""];

        // Handle summary mode
        if (params.response_mode === ResponseMode.SUMMARY) {
          result = generateTaskSummary(tasks);
        } else {
          lines.push(`Found ${tasks.length} task(s)`, "");

          // Handle full vs compact mode
          for (const task of tasks) {
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
        // JSON format always returns full data
        result = JSON.stringify({ tasks, pagination }, null, 2);
      }

      const { content: finalContent, truncation } = truncateResponse(result, tasks.length, "tasks");
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
// Tool 12: Add Comment
// ============================================================================

server.registerTool(
  "clickup_add_comment",
  {
    title: "Add Comment to Task",
    description: `Add a comment to a task.

This tool posts a comment on a specific task. The comment will be attributed to the authenticated user.

Args:
  - task_id (string): The task ID
  - comment_text (string): The comment text (supports markdown)
  - notify_all (boolean): Notify all task watchers (default: false)

Returns:
  The created comment with metadata.

Examples:
  - Use when: "Add comment 'Great work!' to task abc123"
  - Use when: "Comment on task xyz with update"

Error Handling:
  - Returns "Error: Resource not found" if task_id is invalid (404)`,
    inputSchema: z.object({
      task_id: z.string().min(1).describe("Task ID"),
      comment_text: z.string().min(1).describe("Comment text (markdown supported)"),
      notify_all: z.boolean().default(false).describe("Notify all task watchers")
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
      const comment = await makeApiRequest<ClickUpComment>(
        `task/${params.task_id}/comment`,
        "POST",
        {
          comment_text: params.comment_text,
          notify_all: params.notify_all
        }
      );

      return {
        content: [{
          type: "text",
          text: `Comment added successfully to task ${params.task_id}\n\n${formatCommentMarkdown(comment)}`
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
// Tool 13: Get Comments
// ============================================================================

server.registerTool(
  "clickup_get_comments",
  {
    title: "Get Task Comments",
    description: `Get all comments on a task.

This tool retrieves all comments posted on a specific task.

Args:
  - task_id (string): The task ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of comments with author, date, and text.

Examples:
  - Use when: "Show me comments on task abc123"
  - Use when: "Get all comments for this task"

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
      const data = await makeApiRequest<{ comments: ClickUpComment[] }>(
        `task/${params.task_id}/comment`
      );
      const comments = data.comments || [];

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [`# Comments on Task ${params.task_id}`, ""];
        lines.push(`Found ${comments.length} comment(s)`, "");
        lines.push("");

        for (const comment of comments) {
          lines.push(formatCommentMarkdown(comment));
          lines.push("");
          lines.push("---");
          lines.push("");
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify({ comments }, null, 2);
      }

      const { content: finalContent, truncation } = truncateResponse(result, comments.length, "comments");
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
// Tool 14: Set Custom Field
// ============================================================================

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

// ============================================================================
// Tool 15: Start Time Entry
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
// Tool 16: Stop Time Entry
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
// Tool 17: Get Time Entries
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

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  // Verify API token is set
  try {
    getApiToken();
  } catch (error) {
    console.error("ERROR: CLICKUP_API_TOKEN environment variable is required");
    console.error("Get your token at: https://app.clickup.com/settings/apps");
    process.exit(1);
  }

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error("ClickUp MCP server running via stdio");
}

// Run the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
