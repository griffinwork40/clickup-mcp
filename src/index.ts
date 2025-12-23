#!/usr/bin/env node
/**
 * ClickUp MCP Server
 *
 * A Model Context Protocol server that provides comprehensive integration with the ClickUp API.
 * Enables LLMs to manage tasks, projects, teams, and workflows programmatically.
 * 
 * Architecture:
 * - Entry point: This file (boots server, registers tools)
 * - Tools: src/tools/*.ts (domain-specific tool definitions)
 * - Schemas: src/schemas/*.ts (Zod validation schemas)
 * - Types: src/types.ts (TypeScript interfaces)
 * - Utils: src/utils.ts (shared utilities)
 * - Constants: src/constants.ts (configuration values)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";
import { getApiToken } from "./utils.js";

// ============================================================================
// Server Initialization
// ============================================================================

const server = new McpServer({
  name: "clickup-mcp-server",
  version: "1.0.0"
});

// Register all tools from domain modules
registerAllTools(server);

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  // Verify API token is set
  try {
    getApiToken();
  } catch (error) {
    console.error("ERROR: CLICKUP_API_TOKEN environment variable is required");
    console.error("Get your token at: https://app.clickup.com/settings/apps");
    process.exit(1);
  }

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error("ClickUp MCP server running via stdio");
}

// Run the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
