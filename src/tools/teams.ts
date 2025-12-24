/**
 * ClickUp Teams/Workspaces tool definitions.
 * 
 * Tools for managing teams and workspaces in ClickUp.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormatSchema } from "../schemas/index.js";
import { ResponseFormat } from "../constants.js";
import { makeApiRequest, handleApiError } from "../utils.js";
import type { ClickUpTeam } from "../types.js";

/**
 * Register all team-related tools with the MCP server.
 */
export function registerTeamTools(server: McpServer): void {
  registerGetTeams(server);
}

/**
 * Tool: Get Teams/Workspaces
 */
function registerGetTeams(server: McpServer): void {
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
}
