/**
 * ClickUp Lists tool definitions.
 * 
 * Tools for managing lists within folders or spaces.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormatSchema } from "../schemas/index.js";
import { ResponseFormat } from "../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatListMarkdown,
  truncateResponse,
  formatTruncationInfo
} from "../utils.js";
import type { ClickUpList } from "../types.js";

/**
 * Register all list-related tools with the MCP server.
 */
export function registerListTools(server: McpServer): void {
  registerGetLists(server);
  registerGetListDetails(server);
}

/**
 * Tool: Get Lists
 */
function registerGetLists(server: McpServer): void {
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
}

/**
 * Tool: Get List Details
 */
function registerGetListDetails(server: McpServer): void {
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
