#!/usr/bin/env node
/**
 * ClickUp MCP Server
 *
 * A Model Context Protocol server that provides comprehensive integration with the ClickUp API.
 * Enables LLMs to manage tasks, projects, teams, and workflows programmatically.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server.js";
import { registerAllTools } from "./tools/index.js";
import { getApiToken } from "./utils/index.js";

/**
 * Main entry point for the ClickUp MCP server
 */
async function main(): Promise<void> {
  // Verify API token is set
  try {
    getApiToken();
  } catch (error) {
    console.error("ERROR: CLICKUP_API_TOKEN environment variable is required");
    console.error("Get your token at: https://app.clickup.com/settings/apps");
    process.exit(1);
  }

  // Register all tools
  registerAllTools();

  // Create stdio transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error("ClickUp MCP server running via stdio");
}

// Run the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
