/**
 * ClickUp folder and list tools
 */

import { z } from "zod";
import { server, ResponseFormatSchema } from "../server.js";
import { ResponseFormat } from "../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatFolderMarkdown,
  formatListMarkdown,
  truncateResponse,
  formatTruncationInfo
} from "../utils/index.js";
import type { ClickUpFolder, ClickUpList } from "../types.js";

/**
 * Register folder and list tools
 */
export function registerFolderListTools(): void {
  // ============================================================================
  // Tool: Get Folders
  // ============================================================================

  server.registerTool(
    "clickup_get_folders",
    {
      title: "Get ClickUp Folders",
      description: `Get all folders in a space.

Folders are optional groupings within spaces (Team → Space → Folder → List → Task).

Args:
  - space_id (string): The space ID
  - archived (boolean): Include archived folders (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "folders": [
      { "id": "string", "name": "string", "hidden": boolean, "task_count": "string", "lists": [...] }
    ]
  }

Examples:
  - Use when: "Show me folders in space 123456"
  - Use when: "List all folders in this space"`,
      inputSchema: z.object({
        space_id: z.string().min(1).describe("Space ID"),
        archived: z.boolean().default(false).describe("Include archived folders"),
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
          `space/${params.space_id}/folder`, "GET", undefined, { archived: params.archived }
        );
        const folders = data.folders || [];

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = [`# Folders in Space ${params.space_id}`, ""];
          lines.push(`Found ${folders.length} folder(s)`, "");

          for (const folder of folders) {
            lines.push(formatFolderMarkdown(folder), "");
          }

          result = lines.join("\n");
        } else {
          result = JSON.stringify({ folders }, null, 2);
        }

        const { content: finalContent, truncation } = truncateResponse(result, folders.length, "folders");
        result = finalContent + formatTruncationInfo(truncation);

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
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

Lists are containers for tasks. Provide either folder_id OR space_id, but not both.

Args:
  - folder_id (string, optional): Folder ID to get lists from
  - space_id (string, optional): Space ID to get folderless lists from
  - archived (boolean): Include archived lists (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "lists": [
      { "id": "string", "name": "string", "task_count": number, "statuses": [...] }
    ]
  }

Examples:
  - Use when: "Show me lists in folder 123456"
  - Use when: "Get folderless lists in space 789"`,
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
            content: [{ type: "text", text: "Error: Must provide either folder_id or space_id" }]
          };
        }

        if (params.folder_id && params.space_id) {
          return {
            content: [{ type: "text", text: "Error: Provide only one of folder_id or space_id, not both" }]
          };
        }

        const endpoint = params.folder_id
          ? `folder/${params.folder_id}/list`
          : `space/${params.space_id}/list`;

        const data = await makeApiRequest<{ lists: ClickUpList[] }>(
          endpoint, "GET", undefined, { archived: params.archived }
        );
        const lists = data.lists || [];

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const parent = params.folder_id ? `Folder ${params.folder_id}` : `Space ${params.space_id}`;
          const lines: string[] = [`# Lists in ${parent}`, ""];
          lines.push(`Found ${lists.length} list(s)`, "");

          for (const list of lists) {
            lines.push(formatListMarkdown(list), "");
          }

          result = lines.join("\n");
        } else {
          result = JSON.stringify({ lists }, null, 2);
        }

        const { content: finalContent, truncation } = truncateResponse(result, lists.length, "lists");
        result = finalContent + formatTruncationInfo(truncation);

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
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

Essential for understanding what statuses/custom fields are available before creating or updating tasks.

Args:
  - list_id (string): The list ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Detailed list information including available statuses and custom fields.

Examples:
  - Use when: "What statuses are available in list 123456?"
  - Use when: "Show me custom fields for this list"
  - Use before: Creating tasks to know valid statuses`,
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

        const result = params.response_format === ResponseFormat.MARKDOWN
          ? formatListMarkdown(list)
          : JSON.stringify(list, null, 2);

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
