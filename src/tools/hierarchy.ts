/**
 * ClickUp hierarchy tools: Teams, Spaces, Folders, Lists
 */

import { z } from "zod";
import { server, ResponseFormatSchema } from "../server.js";
import { ResponseFormat } from "../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatSpaceMarkdown,
  formatFolderMarkdown,
  formatListMarkdown,
  truncateResponse,
  formatTruncationInfo
} from "../utils/index.js";
import type {
  ClickUpTeam,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpList
} from "../types.js";

/**
 * Register all hierarchy-related tools
 */
export function registerHierarchyTools(): void {
  // ============================================================================
  // Tool: Get Teams/Workspaces
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
        "id": "string",
        "name": "string",
        "color": "string",
        "avatar": "string"
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
  // Tool: Get Spaces
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
  // Tool: Get Folders
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
  // Tool: Get Lists
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
  // Tool: Get List Details
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
}
