/**
 * Tool registration module for ClickUp MCP server.
 * Registers all available tools with the MCP server.
 */

import { registerWorkspaceTools } from "./workspaces.js";
import { registerFolderListTools } from "./folders-lists.js";
import { registerTaskReadTools } from "./tasks-read.js";
import { registerTaskMutateTools } from "./tasks-mutate.js";
import { registerTaskSearchTools } from "./tasks-search.js";
import { registerTaskAnalyticsTools } from "./tasks-analytics.js";
import { registerCommentTools } from "./comments.js";
import { registerCustomFieldTools } from "./custom-fields.js";
import { registerTimeTrackingTools } from "./time-tracking.js";

/**
 * Register all ClickUp tools with the MCP server
 */
export function registerAllTools(): void {
  // Workspace tools: Teams, Spaces
  registerWorkspaceTools();

  // Folder/List tools: Folders, Lists, List details
  registerFolderListTools();

  // Task tools (split into logical groups)
  registerTaskReadTools();      // Get tasks, Get task
  registerTaskMutateTools();    // Create, Update, Delete
  registerTaskSearchTools();    // Search across team
  registerTaskAnalyticsTools(); // Count, Export CSV

  // Comment tools: Add, Get
  registerCommentTools();

  // Custom field tools: Set value
  registerCustomFieldTools();

  // Time tracking tools: Start, Stop, Get entries
  registerTimeTrackingTools();
}
