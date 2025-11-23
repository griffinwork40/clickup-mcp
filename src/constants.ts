/**
 * Constants and enumerations for ClickUp MCP server.
 */

export const API_BASE_URL = "https://api.clickup.com/api/v2";
export const CHARACTER_LIMIT = 100000;
export const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Response format options for tool outputs
 */
export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

/**
 * Response mode options for controlling data verbosity
 */
export enum ResponseMode {
  FULL = "full",        // Complete task details with all fields
  COMPACT = "compact",  // Essential fields only (id, name, status, assignees)
  SUMMARY = "summary"   // Statistical overview without individual task details
}

/**
 * ClickUp task priority levels
 */
export enum Priority {
  URGENT = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4
}

/**
 * Standard pagination defaults
 */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
