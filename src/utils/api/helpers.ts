/**
 * API helper utilities for ClickUp MCP server.
 * Handles authentication and HTTP requests to the ClickUp API.
 */

import axios from "axios";
import { API_BASE_URL, DEFAULT_TIMEOUT } from "../../constants.js";

/**
 * Get ClickUp API token from environment
 * @returns The API token string
 * @throws Error if CLICKUP_API_TOKEN environment variable is not set
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
 * @param endpoint - API endpoint (without base URL)
 * @param method - HTTP method
 * @param data - Request body data
 * @param params - Query parameters
 * @returns Promise resolving to the response data
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
