/**
 * Tool registration module for ClickUp MCP server.
 * Registers all available tools with the MCP server.
 */

import { registerHierarchyTools } from "./hierarchy.js";
import { registerTaskTools } from "./tasks.js";
import { registerCommentTools } from "./comments.js";
import { registerCustomFieldTools } from "./custom-fields.js";
import { registerTimeTrackingTools } from "./time-tracking.js";

/**
 * Register all ClickUp tools with the MCP server
 */
export function registerAllTools(): void {
  // Hierarchy tools: Teams, Spaces, Folders, Lists
  registerHierarchyTools();

  // Task tools: CRUD, search, count, export
  registerTaskTools();

  // Comment tools: Add, Get
  registerCommentTools();

  // Custom field tools: Set value
  registerCustomFieldTools();

  // Time tracking tools: Start, Stop, Get entries
  registerTimeTrackingTools();
}
