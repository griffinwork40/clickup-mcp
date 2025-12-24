/**
 * @file constants.ts
 * @description Constants and enumerations for ClickUp MCP server.
 * This module defines all configuration values, enums, and default settings
 * used throughout the ClickUp MCP server.
 */

/**
 * Base URL for the ClickUp API v2.
 * @constant {string}
 * @see {@link https://clickup.com/api} ClickUp API Documentation
 */
export const API_BASE_URL = "https://api.clickup.com/api/v2";

/**
 * Maximum character limit for API responses.
 * Responses exceeding this limit will be truncated with appropriate messaging.
 * @constant {number}
 */
export const CHARACTER_LIMIT = 100000;

/**
 * Default timeout for API requests in milliseconds.
 * @constant {number}
 * @default 30000 (30 seconds)
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Response format options for tool outputs.
 * Controls how the MCP server formats responses to clients.
 * 
 * @enum {string}
 * @property {string} MARKDOWN - Human-readable markdown formatted output
 * @property {string} JSON - Machine-readable JSON formatted output
 * 
 * @example
 * // Request markdown format
 * { response_format: ResponseFormat.MARKDOWN }
 * 
 * @example
 * // Request JSON format
 * { response_format: ResponseFormat.JSON }
 */
export enum ResponseFormat {
  /** Human-readable markdown formatted output */
  MARKDOWN = "markdown",
  /** Machine-readable JSON formatted output */
  JSON = "json"
}

/**
 * Response mode options for controlling data verbosity.
 * Determines how much detail is included in task-related responses.
 * 
 * @enum {string}
 * @property {string} FULL - Complete task details with all fields and descriptions
 * @property {string} COMPACT - Essential fields only (id, name, status, assignees)
 * @property {string} SUMMARY - Statistical overview without individual task details
 * 
 * @example
 * // Get full task details
 * { response_mode: ResponseMode.FULL }
 * 
 * @example
 * // Get compact list for large result sets
 * { response_mode: ResponseMode.COMPACT }
 * 
 * @example
 * // Get summary statistics only
 * { response_mode: ResponseMode.SUMMARY }
 */
export enum ResponseMode {
  /** Complete task details with all fields */
  FULL = "full",
  /** Essential fields only (id, name, status, assignees) */
  COMPACT = "compact",
  /** Statistical overview without individual task details */
  SUMMARY = "summary"
}

/**
 * ClickUp task priority levels.
 * Lower numbers indicate higher priority.
 * 
 * @enum {number}
 * @property {number} URGENT - Priority level 1 (highest)
 * @property {number} HIGH - Priority level 2
 * @property {number} NORMAL - Priority level 3
 * @property {number} LOW - Priority level 4 (lowest)
 * 
 * @example
 * // Create an urgent task
 * { priority: Priority.URGENT }
 * 
 * @example
 * // Create a low priority task
 * { priority: Priority.LOW }
 */
export enum Priority {
  /** Priority level 1 - Urgent/Critical */
  URGENT = 1,
  /** Priority level 2 - High importance */
  HIGH = 2,
  /** Priority level 3 - Normal/Default */
  NORMAL = 3,
  /** Priority level 4 - Low importance */
  LOW = 4
}

/**
 * Default number of items to return per page in paginated requests.
 * @constant {number}
 * @default 20
 */
export const DEFAULT_LIMIT = 20;

/**
 * Maximum number of items that can be requested per page.
 * ClickUp API enforces this limit on paginated endpoints.
 * @constant {number}
 * @default 100
 */
export const MAX_LIMIT = 100;
