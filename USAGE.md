# ClickUp MCP Server - Usage Guide

## Quick Start

### 1. Get Your ClickUp API Token

1. Go to https://app.clickup.com/settings/apps
2. Click "Generate" under "API Token"
3. Copy the token (starts with `pk_`)

### 2. Set Environment Variable

```bash
export CLICKUP_API_TOKEN="pk_your_token_here"
```

Or create a `.env` file:
```bash
cp .env.example .env
# Edit .env and add your token
```

### 3. Test the Server

You can test that the server starts correctly:

```bash
# The server will run and wait for MCP protocol messages
npm start
```

Press `Ctrl+C` to stop.

## Using with Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "clickup": {
      "command": "node",
      "args": ["/absolute/path/to/clickup-mcp/dist/index.js"],
      "env": {
        "CLICKUP_API_TOKEN": "pk_your_token_here"
      }
    }
  }
}
```

Replace `/absolute/path/to/clickup-mcp` with the actual path to this directory.

## Tool Examples

### Example 1: Explore Your Organization

```
User: "What teams do I have access to in ClickUp?"

Claude will use: clickup_get_teams

User: "Show me the spaces in team 123456"

Claude will use: clickup_get_spaces with team_id="123456"
```

### Example 2: Browse and Create Tasks

```
User: "Show me the lists in space 789"

Claude will use: clickup_get_lists with space_id="789"

User: "Get the first 10 tasks from list abc123"

Claude will use: clickup_get_tasks with list_id="abc123", limit=10

User: "Create a task called 'Fix authentication bug' in list abc123 with high priority"

Claude will use: clickup_create_task with appropriate parameters
```

### Example 3: Search and Update

```
User: "Search for all tasks with 'authentication' in team 123456"

Claude will use: clickup_search_tasks with team_id="123456", query="authentication"

User: "Update task xyz to status 'complete'"

Claude will use: clickup_update_task with task_id="xyz", status="complete"
```

### Example 4: Comments and Collaboration

```
User: "Add a comment 'Great work!' to task xyz"

Claude will use: clickup_add_comment

User: "Show me all comments on task xyz"

Claude will use: clickup_get_comments
```

### Example 5: Time Tracking

```
User: "Start tracking time on task abc in team 123456"

Claude will use: clickup_start_time_entry

User: "Stop time tracking in team 123456"

Claude will use: clickup_stop_time_entry

User: "Show me all time entries for team 123456"

Claude will use: clickup_get_time_entries
```

## Understanding the ClickUp Hierarchy

ClickUp has the following hierarchy:

```
Team/Workspace (Top level organization)
  └── Space (Project area)
      └── Folder (Optional grouping)
          └── List (Task container)
              └── Task (Work item)
```

### Common Workflow

1. **Get Teams** - Find your team ID
2. **Get Spaces** - Browse spaces in the team
3. **Get Lists** - Find lists (either in folders or directly in spaces)
4. **Get Tasks** - Browse tasks in a list
5. **Create/Update Tasks** - Make changes as needed

## Tips

### Pagination

Many tools support pagination with `limit` and `offset` parameters:

```
- limit: Maximum results to return (default: 20, max: 100)
- offset: Number of results to skip (default: 0)
```

Example:
- First page: `limit=20, offset=0`
- Second page: `limit=20, offset=20`
- Third page: `limit=20, offset=40`

### Response Formats

All tools support two formats:

- **markdown** (default): Human-readable formatted text
- **json**: Structured data for further processing

Specify with `response_format` parameter.

### Before Creating Tasks

Always use `clickup_get_list_details` first to see:
- Available statuses (so you know valid status names)
- Custom fields (so you know what fields you can set)

### Rate Limits

ClickUp API has rate limits:
- **Business plan**: 100 requests/minute
- **Business Plus and above**: 1000 requests/minute

The server will return clear error messages if you hit rate limits.

## Troubleshooting

### "CLICKUP_API_TOKEN environment variable is required"

Make sure you've set the environment variable:
```bash
export CLICKUP_API_TOKEN="pk_your_token_here"
```

### "Error: Invalid or missing API token" (401)

Your token may be invalid or expired. Generate a new one at https://app.clickup.com/settings/apps

### "Error: Resource not found" (404)

Double-check the ID you're using. IDs in ClickUp are strings, not numbers.

### "Error: Rate limit exceeded" (429)

You're making too many requests. Wait a minute and try again, or upgrade your ClickUp plan.

## Getting Help

- **ClickUp API Docs**: https://clickup.com/api
- **ClickUp Status**: https://status.clickup.com
- **MCP Protocol**: https://modelcontextprotocol.io

## All Available Tools

1. `clickup_get_teams` - List all teams/workspaces
2. `clickup_get_spaces` - Get spaces in a team
3. `clickup_get_folders` - Get folders in a space
4. `clickup_get_lists` - Get lists in folder/space
5. `clickup_get_list_details` - Get list details with statuses
6. `clickup_get_tasks` - Get tasks in a list (paginated)
7. `clickup_get_task` - Get detailed task information
8. `clickup_create_task` - Create a new task
9. `clickup_update_task` - Update task properties
10. `clickup_delete_task` - Delete a task (destructive!)
11. `clickup_search_tasks` - Search for tasks across a team
12. `clickup_add_comment` - Add a comment to a task
13. `clickup_get_comments` - Get comments on a task
14. `clickup_set_custom_field` - Set custom field values
15. `clickup_start_time_entry` - Start time tracking
16. `clickup_stop_time_entry` - Stop time tracking
17. `clickup_get_time_entries` - Get time tracking entries
