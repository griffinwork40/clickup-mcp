/**
 * @file index.ts
 * @description Barrel export for utils module.
 * Re-exports all utilities from sub-modules for backward compatibility.
 */

// API helpers
export { getApiToken, makeApiRequest, handleApiError } from "./api-helpers.js";

// Time formatters
export { formatDate, formatTimeEntryMarkdown } from "./time-formatters.js";

// Comment formatters
export { formatCommentMarkdown } from "./comment-formatters.js";

// Custom field formatters
export {
  escapeCSV,
  normalizePhoneToE164,
  extractCustomFieldValue,
  getCustomField,
  taskToCSVRow,
  type ExportCSVOptions
} from "./custom-field-formatters.js";

// Task formatters
export {
  formatPriority,
  formatTaskMarkdown,
  formatTaskCompact,
  formatListMarkdown,
  formatSpaceMarkdown,
  formatFolderMarkdown,
  getPagination,
  generateTaskSummary,
  formatTruncationInfo
} from "./task-formatters.js";

// Response utilities
export {
  truncateResponse,
  filterTasksByStatus
} from "./response-utils.js";

// Task operations
export {
  countTasksByStatus,
  exportTasksToCSV,
  type CountTasksOptions,
  type CountTasksResult
} from "./task-operations.js";
