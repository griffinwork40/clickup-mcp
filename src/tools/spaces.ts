/**
 * ClickUp Spaces tool definitions.
 * 
 * Tools for managing spaces within teams/workspaces.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormatSchema } from "../schemas/index.js";
import { ResponseFormat } from "../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatSpaceMarkdown,
  truncateResponse,
  formatTruncationInfo
} from "../utils.js";
import type { ClickUpSpace } from "../types.js";

/**
 * Register all space-related tools with the MCP server.
 */
export function registerSpaceTools(server: McpServer): void {
  registerGetSpaces(server);
}

/**
 * Tool: Get Spaces
 */
function registerGetSpaces(server: McpServer): void {
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
}
