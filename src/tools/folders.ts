/**
 * ClickUp Folders tool definitions.
 * 
 * Tools for managing folders within spaces.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormatSchema } from "../schemas/index.js";
import { ResponseFormat } from "../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatFolderMarkdown,
  truncateResponse,
  formatTruncationInfo
} from "../utils.js";
import type { ClickUpFolder } from "../types.js";

/**
 * Register all folder-related tools with the MCP server.
 */
export function registerFolderTools(server: McpServer): void {
  registerGetFolders(server);
}

/**
 * Tool: Get Folders
 */
function registerGetFolders(server: McpServer): void {
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
}
