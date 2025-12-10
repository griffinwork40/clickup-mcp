/**
 * ClickUp workspace tools: Teams and Spaces
 */

import { z } from "zod";
import { server, ResponseFormatSchema } from "../server.js";
import { ResponseFormat } from "../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatSpaceMarkdown,
  truncateResponse,
  formatTruncationInfo
} from "../utils/index.js";
import type { ClickUpTeam, ClickUpSpace } from "../types.js";

/**
 * Register workspace tools (Teams, Spaces)
 */
export function registerWorkspaceTools(): void {
  // ============================================================================
  // Tool: Get Teams/Workspaces
  // ============================================================================

  server.registerTool(
    "clickup_get_teams",
    {
      title: "Get ClickUp Teams",
      description: `Get all teams/workspaces accessible to the authenticated user.

Each team represents a top-level organizational unit.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "teams": [
      { "id": "string", "name": "string", "color": "string", "avatar": "string" }
    ]
  }

Examples:
  - Use when: "What teams do I have access to?"
  - Use when: "List all my workspaces"`,
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
            if (team.color) lines.push(`- Color: ${team.color}`);
            lines.push("");
          }

          result = lines.join("\n");
        } else {
          result = JSON.stringify({ teams }, null, 2);
        }

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
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

Spaces are the second level in hierarchy (Team → Space → Folder → List → Task).

Args:
  - team_id (string): The team/workspace ID
  - archived (boolean): Include archived spaces (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "spaces": [
      { "id": "string", "name": "string", "private": boolean, ... }
    ]
  }

Examples:
  - Use when: "Show me all spaces in team 123456"
  - Use when: "List the spaces in my workspace"`,
      inputSchema: z.object({
        team_id: z.string().min(1).describe("Team/workspace ID"),
        archived: z.boolean().default(false).describe("Include archived spaces"),
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
          `team/${params.team_id}/space`, "GET", undefined, { archived: params.archived }
        );
        const spaces = data.spaces || [];

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = [`# Spaces in Team ${params.team_id}`, ""];
          lines.push(`Found ${spaces.length} space(s)`, "");

          for (const space of spaces) {
            lines.push(formatSpaceMarkdown(space), "");
          }

          result = lines.join("\n");
        } else {
          result = JSON.stringify({ spaces }, null, 2);
        }

        const { content: finalContent, truncation } = truncateResponse(result, spaces.length, "spaces");
        result = finalContent + formatTruncationInfo(truncation);

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
