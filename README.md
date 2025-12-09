# ClickUp MCP Server

A Model Context Protocol (MCP) server that provides comprehensive integration with the ClickUp API. This server enables LLMs to manage tasks, projects, teams, and workflows programmatically.

## Features

### Organization & Hierarchy
- List teams/workspaces
- Browse spaces, folders, and lists
- Get list details including statuses and custom fields

### Task Management
- Create, read, update, and delete tasks
- Set task status, priority, assignees, and due dates
- Manage task descriptions and details

### Search & Collaboration
- Search tasks across teams with filters
- Add and retrieve comments on tasks

### Advanced Features
- Set custom field values
- Track time on tasks
- Get time entries

## Installation

```bash
npm install
npm run build
```

## Configuration

Set your ClickUp API token as an environment variable:

```bash
export CLICKUP_API_TOKEN="pk_your_token_here"
```

To obtain an API token:
1. Go to https://app.clickup.com/settings/apps
2. Click "Generate" under "API Token"
3. Copy the token (starts with `pk_`)

## Usage

### Run the server

```bash
npm start
```

### Development mode with auto-reload

```bash
npm run dev
```

### With Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "clickup": {
      "command": "node",
      "args": ["/path/to/clickup-mcp-server/dist/index.js"],
      "env": {
        "CLICKUP_API_TOKEN": "pk_your_token_here"
      }
    }
  }
}
```

## Available Tools

### Organization Tools
- `clickup_get_teams` - List all teams/workspaces
- `clickup_get_spaces` - Get spaces in a team
- `clickup_get_folders` - Get folders in a space
- `clickup_get_lists` - Get lists in folder/space
- `clickup_get_list_details` - Get list details with statuses and custom fields

### Task Tools
- `clickup_get_tasks` - Get tasks in a list (paginated, with status filtering)
- `clickup_get_task` - Get detailed task information
- `clickup_create_task` - Create a new task
- `clickup_update_task` - Update task properties
- `clickup_delete_task` - Delete a task
- `clickup_count_tasks_by_status` - Count tasks by status (handles pagination internally)
- `clickup_export_tasks_to_csv` - Export tasks to CSV format (handles pagination, filtering, and custom fields)

### Search & Comments
- `clickup_search_tasks` - Search for tasks across a team
- `clickup_add_comment` - Add a comment to a task
- `clickup_get_comments` - Get comments on a task

### Advanced Tools
- `clickup_set_custom_field` - Set custom field values
- `clickup_start_time_entry` - Start time tracking
- `clickup_stop_time_entry` - Stop time tracking
- `clickup_get_time_entries` - Get time tracking entries

## Status Filtering

Status filtering has been improved with automatic client-side fallback:
- `clickup_get_tasks` and `clickup_search_tasks` now automatically fall back to client-side filtering if API filtering fails
- `clickup_count_tasks_by_status` is a dedicated tool optimized for counting tasks by status
- `clickup_export_tasks_to_csv` exports tasks to CSV with automatic status filtering and custom field extraction
- All tools handle pagination correctly with status filtering

## CSV Export

The `clickup_export_tasks_to_csv` tool makes it easy to export tasks:
- Automatically handles pagination for large lists
- Fetches detailed task information to include custom fields
- Supports status filtering
- Returns CSV content that can be saved to a file
- Includes all standard fields (ID, name, status, dates, etc.) and custom fields

## Response Formats

All tools support two response formats:

- **JSON** (`response_format: "json"`): Structured data for programmatic processing
- **Markdown** (`response_format: "markdown"`): Human-readable formatted text (default)

## Rate Limits

ClickUp API rate limits:
- 100 requests/minute (Business plan)
- 1000 requests/minute (Business Plus and above)

The server implements automatic error handling for rate limit responses.

## Examples

### Create a task

```typescript
{
  "tool": "clickup_create_task",
  "arguments": {
    "list_id": "123456",
    "name": "Implement new feature",
    "description": "Add user authentication to the app",
    "priority": 2,
    "status": "to do",
    "assignees": [123456]
  }
}
```

### Search for tasks

```typescript
{
  "tool": "clickup_search_tasks",
  "arguments": {
    "team_id": "123456",
    "query": "authentication",
    "statuses": ["in progress", "to do"]
  }
}
```

## Development

### Build

```bash
npm run build
```

### Clean

```bash
npm run clean
```

## License

MIT

## Links

- [ClickUp API Documentation](https://clickup.com/api)
- [MCP Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
