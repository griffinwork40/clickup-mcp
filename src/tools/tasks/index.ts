/**
 * @file index.ts
 * @description Barrel export for all task-related MCP tools.
 * This module provides a single entry point for registering all task tools with the MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Re-export schemas for external use
export * from "./schemas.js";

// Import individual tool registration functions
import { registerGetTasksTool } from "./get-tasks.js";
import { registerGetTaskTool } from "./get-task.js";
import { registerCreateTaskTool } from "./create-task.js";
import { registerUpdateTaskTool } from "./update-task.js";
import { registerDeleteTaskTool } from "./delete-task.js";
import { registerSearchTasksTool } from "./search-tasks.js";
import { registerCountTasksTool } from "./count-tasks.js";
import { registerExportTasksTool } from "./export-tasks.js";

// Re-export individual registration functions
export {
  registerGetTasksTool,
  registerGetTaskTool,
  registerCreateTaskTool,
  registerUpdateTaskTool,
  registerDeleteTaskTool,
  registerSearchTasksTool,
  registerCountTasksTool,
  registerExportTasksTool
};

/**
 * Registers all task-related tools with the MCP server.
 * 
 * @description This function registers the following tools:
 * - clickup_get_tasks: Get tasks in a list with filtering and pagination
 * - clickup_get_task: Get details of a single task
 * - clickup_create_task: Create a new task
 * - clickup_update_task: Update an existing task
 * - clickup_delete_task: Delete a task permanently
 * - clickup_search_tasks: Search tasks across a team
 * - clickup_count_tasks_by_status: Count tasks by status
 * - clickup_export_tasks_to_csv: Export tasks to CSV format
 * 
 * @param {McpServer} server - The MCP server instance to register tools on
 * 
 * @example
 * import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
 * import { registerTaskTools } from "./tools/tasks/index.js";
 * 
 * const server = new McpServer({ name: "my-server", version: "1.0.0" });
 * registerTaskTools(server);
 */
export function registerTaskTools(server: McpServer): void {
  registerGetTasksTool(server);
  registerGetTaskTool(server);
  registerCreateTaskTool(server);
  registerUpdateTaskTool(server);
  registerDeleteTaskTool(server);
  registerSearchTasksTool(server);
  registerCountTasksTool(server);
  registerExportTasksTool(server);
}
