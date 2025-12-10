/**
 * ClickUp comment tools: Add and Get comments
 */

import { z } from "zod";
import { server, ResponseFormatSchema } from "../server.js";
import { ResponseFormat } from "../constants.js";
import {
  makeApiRequest,
  handleApiError,
  formatCommentMarkdown,
  truncateResponse,
  formatTruncationInfo
} from "../utils/index.js";
import type { ClickUpComment } from "../types.js";

/**
 * Register all comment-related tools
 */
export function registerCommentTools(): void {
  // ============================================================================
  // Tool: Add Comment
  // ============================================================================

  server.registerTool(
    "clickup_add_comment",
    {
      title: "Add Comment to Task",
      description: `Add a comment to a task.

This tool posts a comment on a specific task. The comment will be attributed to the authenticated user.

Args:
  - task_id (string): The task ID
  - comment_text (string): The comment text (supports markdown)
  - notify_all (boolean): Notify all task watchers (default: false)

Returns:
  The created comment with metadata.

Examples:
  - Use when: "Add comment 'Great work!' to task abc123"
  - Use when: "Comment on task xyz with update"

Error Handling:
  - Returns "Error: Resource not found" if task_id is invalid (404)`,
      inputSchema: z.object({
        task_id: z.string().min(1).describe("Task ID"),
        comment_text: z.string().min(1).describe("Comment text (markdown supported)"),
        notify_all: z.boolean().default(false).describe("Notify all task watchers")
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const comment = await makeApiRequest<ClickUpComment>(
          `task/${params.task_id}/comment`,
          "POST",
          {
            comment_text: params.comment_text,
            notify_all: params.notify_all
          }
        );

        return {
          content: [{
            type: "text",
            text: `Comment added successfully to task ${params.task_id}\n\n${formatCommentMarkdown(comment)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }]
        };
      }
    }
  );

  // ============================================================================
  // Tool: Get Comments
  // ============================================================================

  server.registerTool(
    "clickup_get_comments",
    {
      title: "Get Task Comments",
      description: `Get all comments on a task.

This tool retrieves all comments posted on a specific task.

Args:
  - task_id (string): The task ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of comments with author, date, and text.

Examples:
  - Use when: "Show me comments on task abc123"
  - Use when: "Get all comments for this task"

Error Handling:
  - Returns "Error: Resource not found" if task_id is invalid (404)`,
      inputSchema: z.object({
        task_id: z.string().min(1).describe("Task ID"),
        response_format: ResponseFormatSchema
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const data = await makeApiRequest<{ comments: ClickUpComment[] }>(
          `task/${params.task_id}/comment`
        );
        const comments = data.comments || [];

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = [`# Comments on Task ${params.task_id}`, ""];
          lines.push(`Found ${comments.length} comment(s)`, "");
          lines.push("");

          for (const comment of comments) {
            lines.push(formatCommentMarkdown(comment));
            lines.push("");
            lines.push("---");
            lines.push("");
          }

          result = lines.join("\n");
        } else {
          result = JSON.stringify({ comments }, null, 2);
        }

        const { content: finalContent, truncation } = truncateResponse(result, comments.length, "comments");
        result = finalContent + formatTruncationInfo(truncation);

        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }]
        };
      }
    }
  );
}
