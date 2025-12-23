/**
 * Date formatting utilities for ClickUp MCP server.
 * Handles timestamp conversion and date display.
 */

/**
 * Format a timestamp as human-readable date
 * @param timestamp - Unix timestamp in milliseconds (as string or number) or undefined
 * @returns Formatted date string in "YYYY-MM-DD HH:MM:SS UTC" format, or "Not set" if undefined
 */
export function formatDate(timestamp: string | number | undefined): string {
  if (!timestamp) return "Not set";

  const date = new Date(typeof timestamp === "string" ? parseInt(timestamp) : timestamp);
  return date.toISOString().replace("T", " ").substring(0, 19) + " UTC";
}
