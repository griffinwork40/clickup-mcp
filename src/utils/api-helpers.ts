/**
 * @file api-helpers.ts
 * @description API communication utilities for ClickUp MCP server.
 * This module provides functions for authentication, API requests, and error handling.
 */

import axios, { AxiosError } from "axios";
import { API_BASE_URL, DEFAULT_TIMEOUT } from "../constants.js";

/**
 * Retrieves the ClickUp API token from environment variables.
 * 
 * @description Checks for the CLICKUP_API_TOKEN environment variable and returns it.
 * This token is required for authenticating all ClickUp API requests.
 * 
 * @returns {string} The ClickUp API token
 * @throws {Error} If CLICKUP_API_TOKEN environment variable is not set
 * 
 * @example
 * try {
 *   const token = getApiToken();
 *   console.log("Token retrieved successfully");
 * } catch (error) {
 *   console.error("API token not configured");
 * }
 */
export function getApiToken(): string {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error("CLICKUP_API_TOKEN environment variable is required");
  }
  return token;
}

/**
 * Makes an authenticated request to the ClickUp API.
 * 
 * @description Sends an HTTP request to the ClickUp API v2 with automatic
 * authentication using the configured API token. Supports all HTTP methods
 * and handles request/response serialization.
 * 
 * @template T - The expected response type
 * @param {string} endpoint - API endpoint path (without base URL)
 * @param {"GET" | "POST" | "PUT" | "DELETE"} [method="GET"] - HTTP method
 * @param {any} [data] - Request body data for POST/PUT requests
 * @param {any} [params] - URL query parameters
 * @returns {Promise<T>} The parsed API response
 * @throws {AxiosError} If the API request fails
 * 
 * @example
 * // GET request
 * const teams = await makeApiRequest<{ teams: ClickUpTeam[] }>("team");
 * 
 * @example
 * // POST request with data
 * const task = await makeApiRequest<ClickUpTask>(
 *   "list/123/task",
 *   "POST",
 *   { name: "New Task", description: "Task description" }
 * );
 * 
 * @example
 * // GET request with query parameters
 * const tasks = await makeApiRequest<{ tasks: ClickUpTask[] }>(
 *   "list/123/task",
 *   "GET",
 *   undefined,
 *   { archived: false, page: 0 }
 * );
 */
export async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any
): Promise<T> {
  try {
    const token = getApiToken();
    const response = await axios({
      method,
      url: `${API_BASE_URL}/${endpoint}`,
      data,
      params,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Converts API errors to user-friendly error messages.
 * 
 * @description Analyzes error responses from the ClickUp API and returns
 * appropriate human-readable error messages. Handles common HTTP status codes,
 * network errors, and timeout conditions.
 * 
 * @param {unknown} error - The error object to handle
 * @returns {string} A user-friendly error message
 * 
 * @example
 * try {
 *   await makeApiRequest("team/invalid");
 * } catch (error) {
 *   const message = handleApiError(error);
 *   // Returns: "Error: Resource not found. Please check the ID is correct."
 * }
 */
export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return `Error: Bad request. ${data?.err || "Check your parameters and try again."}`;
        case 401:
          return "Error: Invalid or missing API token. Please check your CLICKUP_API_TOKEN environment variable.";
        case 403:
          return "Error: Permission denied. You don't have access to this resource.";
        case 404:
          return `Error: Resource not found. ${data?.err || "Please check the ID is correct."}`;
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests. ClickUp allows 100 requests/minute (Business) or 1000/minute (Business Plus+).";
        case 500:
        case 502:
        case 503:
          return "Error: ClickUp server error. Please try again later or check https://status.clickup.com";
        default:
          return `Error: API request failed with status ${status}. ${data?.err || ""}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return "Error: Cannot connect to ClickUp API. Please check your internet connection.";
    }
  }

  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}
