/**
 * Utility modules for ClickUp MCP server.
 * Re-exports all utility functions from sub-modules for backward compatibility.
 */

// API utilities
export { getApiToken, makeApiRequest } from "./api/index.js";

// Error handling utilities
export { handleApiError } from "./errors/index.js";

// Formatting utilities
export {
  formatDate,
  formatPriority,
  formatTaskMarkdown,
  formatTaskCompact,
  formatListMarkdown,
  formatSpaceMarkdown,
  formatFolderMarkdown,
  formatCommentMarkdown,
  formatTimeEntryMarkdown,
  formatTruncationInfo
} from "./formatters/index.js";

// Data transformation utilities
export {
  getPagination,
  generateTaskSummary,
  truncateResponse,
  escapeCSV,
  normalizePhoneToE164,
  extractCustomFieldValue,
  getCustomField,
  taskToCSVRow,
  exportTasksToCSV,
  countTasksByStatus
} from "./transforms/index.js";
export type { ExportCSVOptions, CountTasksOptions, CountTasksResult } from "./transforms/index.js";

// Validation utilities
export { filterTasksByStatus } from "./validation/index.js";
