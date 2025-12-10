/**
 * API utilities for ClickUp MCP server.
 * Handles authentication, requests, and error handling.
 */

import axios, { AxiosError } from "axios";
import { API_BASE_URL, DEFAULT_TIMEOUT } from "../constants.js";

/**
 * Get ClickUp API token from environment
 */
export function getApiToken(): string {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error("CLICKUP_API_TOKEN environment variable is required");
  }
  return token;
}

/**
 * Make an authenticated request to the ClickUp API
 */
export async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any
): Promise<T> {
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
}

/**
 * Convert API errors to user-friendly messages
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
