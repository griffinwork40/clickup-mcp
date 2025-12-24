/**
 * Barrel export for all ClickUp MCP tool registration functions.
 * 
 * Each domain module exports a register function that adds tools to the MCP server.
 */

export { registerTeamTools } from "./teams.js";
export { registerSpaceTools } from "./spaces.js";
export { registerFolderTools } from "./folders.js";
export { registerListTools } from "./lists.js";
export { registerTaskTools } from "./tasks.js";
export { registerCommentTools } from "./comments.js";
export { registerCustomFieldTools } from "./custom-fields.js";
export { registerTimeTrackingTools } from "./time-tracking.js";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTeamTools } from "./teams.js";
import { registerSpaceTools } from "./spaces.js";
import { registerFolderTools } from "./folders.js";
import { registerListTools } from "./lists.js";
import { registerTaskTools } from "./tasks.js";
import { registerCommentTools } from "./comments.js";
import { registerCustomFieldTools } from "./custom-fields.js";
import { registerTimeTrackingTools } from "./time-tracking.js";

/**
 * Register all ClickUp MCP tools with the server.
 * 
 * This function registers 19 tools across 8 domains:
 * - Teams (1 tool)
 * - Spaces (1 tool)
 * - Folders (1 tool)
 * - Lists (2 tools)
 * - Tasks (8 tools)
 * - Comments (2 tools)
 * - Custom Fields (1 tool)
 * - Time Tracking (3 tools)
 */
export function registerAllTools(server: McpServer): void {
  registerTeamTools(server);
  registerSpaceTools(server);
  registerFolderTools(server);
  registerListTools(server);
  registerTaskTools(server);
  registerCommentTools(server);
  registerCustomFieldTools(server);
  registerTimeTrackingTools(server);
}
