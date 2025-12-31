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
  formatListMarkdown,
  formatSpaceMarkdown,
  formatFolderMarkdown,
  formatCommentMarkdown,
  formatTimeEntryMarkdown,
  truncateResponse,
  formatTruncationInfo,
  getApiToken
} from "./utils.js";
import { ResponseFormat } from "./constants.js";
import type {
  ClickUpTeam,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpList,
  ClickUpComment,
  ClickUpTimeEntry
} from "./types.js";

// Import task tools from modular structure
import { registerTaskTools, ResponseFormatSchema } from "./tools/tasks/index.js";

// ============================================================================
// Server Initialization
// ============================================================================

const server = new McpServer({
  name: "clickup-mcp-server",
  version: "1.0.0"
});

// ============================================================================
// Register Task Tools (from modular structure)
// ============================================================================

registerTaskTools(server);

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
// Tool 14: Add Comment
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
// Tool 15: Get Comments
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
// Tool 16: Set Custom Field
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
// Tool 17: Start Time Entry
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
// Tool 18: Stop Time Entry
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
// Tool 19: Get Time Entries
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
