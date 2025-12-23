# ClickUp MCP Server

[![npm version](https://badge.fury.io/js/%40griffinwork40%2Fclickup-mcp-server.svg)](https://www.npmjs.com/package/@griffinwork40/clickup-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides comprehensive integration with the ClickUp API. This server enables LLMs like Claude to manage tasks, projects, teams, and workflows programmatically.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Running the Server](#running-the-server)
  - [Claude Desktop Integration](#claude-desktop-integration)
  - [Cursor IDE Integration](#cursor-ide-integration)
- [API Reference](#api-reference)
  - [Organization Tools](#organization-tools)
  - [Task Management Tools](#task-management-tools)
  - [Search & Comments Tools](#search--comments-tools)
  - [Advanced Tools](#advanced-tools)
- [Examples](#examples)
- [Response Formats](#response-formats)
- [Rate Limits](#rate-limits)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Links](#links)

## Features

### Organization & Hierarchy
- List teams/workspaces
- Browse spaces, folders, and lists
- Get list details including statuses and custom fields

### Task Management
- Create, read, update, and delete tasks
- Set task status, priority, assignees, and due dates
- Manage task descriptions and details
- Count tasks by status with pagination handling
- Export tasks to CSV format

### Search & Collaboration
- Search tasks across teams with filters
- Add and retrieve comments on tasks

### Advanced Features
- Set custom field values
- Track time on tasks
- Get time entries
- Export to CSV with E.164 phone number normalization

## Installation

### From npm

```bash
npm install -g @griffinwork40/clickup-mcp-server
```

### From source

```bash
git clone https://github.com/griffinwork40/clickup-mcp.git
cd clickup-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLICKUP_API_TOKEN` | Yes | Your ClickUp API token (starts with `pk_`) |

### Getting Your API Token

1. Go to [https://app.clickup.com/settings/apps](https://app.clickup.com/settings/apps)
2. Under "API Token", click "Generate"
3. Copy the token (it starts with `pk_`)
4. Store it securely - you won't be able to see it again!

### Setting the Environment Variable

**Linux/macOS:**
```bash
export CLICKUP_API_TOKEN="pk_your_token_here"
```

**Windows (Command Prompt):**
```cmd
set CLICKUP_API_TOKEN=pk_your_token_here
```

**Windows (PowerShell):**
```powershell
$env:CLICKUP_API_TOKEN="pk_your_token_here"
```

## Usage

### Running the Server

**Standalone mode:**
```bash
# If installed globally
clickup-mcp

# If installed from source
npm start
```

**Development mode with auto-reload:**
```bash
npm run dev
```

### Claude Desktop Integration

Add the following to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

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

**Using npx (no installation required):**
```json
{
  "mcpServers": {
    "clickup": {
      "command": "npx",
      "args": ["-y", "@griffinwork40/clickup-mcp-server"],
      "env": {
        "CLICKUP_API_TOKEN": "pk_your_token_here"
      }
    }
  }
}
```

### Cursor IDE Integration

Add to your Cursor MCP settings (`.cursor/mcp.json` in your project or global settings):

```json
{
  "mcpServers": {
    "clickup": {
      "command": "npx",
      "args": ["-y", "@griffinwork40/clickup-mcp-server"],
      "env": {
        "CLICKUP_API_TOKEN": "pk_your_token_here"
      }
    }
  }
}
```

## API Reference

### Organization Tools

#### `clickup_get_teams`
List all teams/workspaces accessible to the authenticated user.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

**Example:**
```json
{
  "tool": "clickup_get_teams",
  "arguments": {
    "response_format": "json"
  }
}
```

#### `clickup_get_spaces`
Get all spaces in a team/workspace.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `team_id` | string | Yes | Team/workspace ID |
| `archived` | boolean | No | Include archived spaces (default: `false`) |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

**Example:**
```json
{
  "tool": "clickup_get_spaces",
  "arguments": {
    "team_id": "123456",
    "archived": false
  }
}
```

#### `clickup_get_folders`
Get all folders in a space.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `space_id` | string | Yes | Space ID |
| `archived` | boolean | No | Include archived folders (default: `false`) |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

#### `clickup_get_lists`
Get all lists in a folder or space.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `folder_id` | string | No* | Folder ID |
| `space_id` | string | No* | Space ID (for folderless lists) |
| `archived` | boolean | No | Include archived lists (default: `false`) |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

*Must provide either `folder_id` OR `space_id`, but not both.

#### `clickup_get_list_details`
Get detailed information about a specific list, including available statuses and custom fields.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `list_id` | string | Yes | List ID |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

### Task Management Tools

#### `clickup_get_tasks`
Get tasks in a specific list with filtering and pagination.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `list_id` | string | Yes | List ID |
| `archived` | boolean | No | Include archived tasks (default: `false`) |
| `include_closed` | boolean | No | Include closed tasks (default: `false`) |
| `statuses` | string[] | No | Filter by status names |
| `assignees` | number[] | No | Filter by assignee IDs |
| `limit` | number | No | Max results 1-100 (default: `20`) |
| `offset` | number | No | Pagination offset (default: `0`) |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |
| `response_mode` | `"full"` \| `"compact"` \| `"summary"` | No | Detail level (default: `"full"`) |

**Example:**
```json
{
  "tool": "clickup_get_tasks",
  "arguments": {
    "list_id": "123456",
    "statuses": ["in progress", "review"],
    "response_mode": "compact",
    "limit": 50
  }
}
```

#### `clickup_get_task`
Get detailed information about a specific task.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | string | Yes | Task ID |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

#### `clickup_create_task`
Create a new task in a list.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `list_id` | string | Yes | List ID |
| `name` | string | Yes | Task name |
| `description` | string | No | Task description (markdown supported) |
| `status` | string | No | Task status (must match list statuses) |
| `priority` | 1-4 | No | Priority: 1=Urgent, 2=High, 3=Normal, 4=Low |
| `assignees` | number[] | No | Assignee user IDs |
| `due_date` | number | No | Due date (Unix timestamp in milliseconds) |
| `start_date` | number | No | Start date (Unix timestamp in milliseconds) |
| `tags` | string[] | No | Tag names |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

**Example:**
```json
{
  "tool": "clickup_create_task",
  "arguments": {
    "list_id": "123456",
    "name": "Implement user authentication",
    "description": "Add OAuth2 login support for Google and GitHub",
    "priority": 2,
    "status": "to do",
    "assignees": [12345678],
    "tags": ["feature", "security"]
  }
}
```

#### `clickup_update_task`
Update an existing task's properties.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | string | Yes | Task ID |
| `name` | string | No | New task name |
| `description` | string | No | New description |
| `status` | string | No | New status |
| `priority` | 1-4 | No | New priority |
| `assignees_add` | number[] | No | User IDs to add as assignees |
| `assignees_rem` | number[] | No | User IDs to remove from assignees |
| `due_date` | number | No | New due date (Unix timestamp) |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

**Example:**
```json
{
  "tool": "clickup_update_task",
  "arguments": {
    "task_id": "abc123",
    "status": "in progress",
    "priority": 1,
    "assignees_add": [12345678]
  }
}
```

#### `clickup_delete_task`
Delete a task permanently. ⚠️ This action cannot be undone.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | string | Yes | Task ID to delete |

#### `clickup_count_tasks_by_status`
Count tasks in a list by status. Handles pagination internally for accurate counts.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `list_id` | string | Yes | List ID |
| `statuses` | string[] | No | Filter by specific status names |
| `archived` | boolean | No | Include archived tasks (default: `false`) |
| `include_closed` | boolean | No | Include closed tasks (default: `false`) |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

**Example:**
```json
{
  "tool": "clickup_count_tasks_by_status",
  "arguments": {
    "list_id": "123456",
    "statuses": ["#1 - phone call", "#2 - follow up"]
  }
}
```

#### `clickup_export_tasks_to_csv`
Export tasks from a list to CSV format with custom field support.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `list_id` | string | Yes | List ID |
| `statuses` | string[] | No | Filter by status names |
| `archived` | boolean | No | Include archived tasks (default: `false`) |
| `include_closed` | boolean | No | Include closed tasks (default: `false`) |
| `custom_fields` | string[] | No | Specific custom field names to include |
| `include_standard_fields` | boolean | No | Include standard fields (default: `true`) |
| `add_phone_number_column` | boolean | No | Add E.164 formatted phone column (default: `false`) |

**Example:**
```json
{
  "tool": "clickup_export_tasks_to_csv",
  "arguments": {
    "list_id": "123456",
    "statuses": ["#1 - phone call"],
    "custom_fields": ["Email", "Company", "Phone"],
    "add_phone_number_column": true
  }
}
```

### Search & Comments Tools

#### `clickup_search_tasks`
Search for tasks across a team with advanced filtering.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `team_id` | string | Yes | Team ID to search in |
| `query` | string | No | Search query string |
| `statuses` | string[] | No | Filter by status names |
| `assignees` | number[] | No | Filter by assignee IDs |
| `tags` | string[] | No | Filter by tag names |
| `date_created_gt` | number | No | Created after (Unix timestamp) |
| `date_updated_gt` | number | No | Updated after (Unix timestamp) |
| `limit` | number | No | Max results 1-100 (default: `20`) |
| `offset` | number | No | Pagination offset (default: `0`) |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |
| `response_mode` | `"full"` \| `"compact"` \| `"summary"` | No | Detail level (default: `"full"`) |

**Example:**
```json
{
  "tool": "clickup_search_tasks",
  "arguments": {
    "team_id": "123456",
    "query": "authentication",
    "statuses": ["in progress", "to do"],
    "response_mode": "compact"
  }
}
```

#### `clickup_add_comment`
Add a comment to a task.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | string | Yes | Task ID |
| `comment_text` | string | Yes | Comment text (markdown supported) |
| `notify_all` | boolean | No | Notify all task watchers (default: `false`) |

**Example:**
```json
{
  "tool": "clickup_add_comment",
  "arguments": {
    "task_id": "abc123",
    "comment_text": "Great progress! Ready for review.",
    "notify_all": true
  }
}
```

#### `clickup_get_comments`
Get all comments on a task.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | string | Yes | Task ID |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

### Advanced Tools

#### `clickup_set_custom_field`
Set a custom field value on a task.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | string | Yes | Task ID |
| `field_id` | string | Yes | Custom field ID |
| `value` | any | Yes | Value to set (format depends on field type) |

**Value formats by field type:**
- **Text/URL/Email:** `"string value"`
- **Number/Currency:** `123`
- **Date:** Unix timestamp in milliseconds
- **Dropdown:** `"option_uuid"`
- **Checkbox:** `true` or `false`

**Example:**
```json
{
  "tool": "clickup_set_custom_field",
  "arguments": {
    "task_id": "abc123",
    "field_id": "cf_123456",
    "value": "completed"
  }
}
```

#### `clickup_start_time_entry`
Start tracking time on a task.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `team_id` | string | Yes | Team ID |
| `task_id` | string | Yes | Task ID |
| `description` | string | No | Description of work |

#### `clickup_stop_time_entry`
Stop the currently running time entry.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `team_id` | string | Yes | Team ID |

#### `clickup_get_time_entries`
Get time tracking entries for a team.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `team_id` | string | Yes | Team ID |
| `assignee` | number | No | Filter by assignee user ID |
| `start_date` | number | No | Filter after date (Unix timestamp) |
| `end_date` | number | No | Filter before date (Unix timestamp) |
| `response_format` | `"markdown"` \| `"json"` | No | Output format (default: `"markdown"`) |

## Examples

### Get Team Structure

```
"List all my ClickUp teams and their spaces"
```

The assistant will call `clickup_get_teams` followed by `clickup_get_spaces` for each team.

### Create and Assign a Task

```
"Create a task called 'Fix login bug' in list 123456, assign it to user 789, and set it as urgent"
```

```json
{
  "tool": "clickup_create_task",
  "arguments": {
    "list_id": "123456",
    "name": "Fix login bug",
    "priority": 1,
    "assignees": [789]
  }
}
```

### Search for Tasks

```
"Find all in-progress tasks about authentication in team 123456"
```

```json
{
  "tool": "clickup_search_tasks",
  "arguments": {
    "team_id": "123456",
    "query": "authentication",
    "statuses": ["in progress"]
  }
}
```

### Export Leads to CSV

```
"Export all leads with status '#1 - phone call' from list 123456 to CSV with phone numbers"
```

```json
{
  "tool": "clickup_export_tasks_to_csv",
  "arguments": {
    "list_id": "123456",
    "statuses": ["#1 - phone call"],
    "add_phone_number_column": true
  }
}
```

## Response Formats

All tools support two response formats:

| Format | Description | Use Case |
|--------|-------------|----------|
| `markdown` | Human-readable formatted text | Default, best for conversational AI |
| `json` | Structured JSON data | Programmatic processing |

### Response Modes (Task Tools)

Task-related tools also support response modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| `full` | Complete task details with all fields | Individual task inspection |
| `compact` | Essential fields only (id, name, status, assignees) | Large result sets |
| `summary` | Statistical overview by status/assignee | Quick status reports |

## Rate Limits

ClickUp API rate limits vary by plan:

| Plan | Requests/Minute |
|------|-----------------|
| Free/Unlimited | 100 |
| Business | 100 |
| Business Plus | 1,000 |
| Enterprise | 10,000 |

The server includes automatic error handling for rate limit responses (HTTP 429).

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Building

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Test with Coverage

```bash
npm run test:coverage
```

### Clean Build

```bash
npm run clean
npm run build
```

### Project Structure

```
clickup-mcp/
├── src/
│   ├── index.ts      # MCP server entry point and tool definitions
│   ├── constants.ts  # Configuration constants and enums
│   ├── types.ts      # TypeScript type definitions
│   └── utils.ts      # Utility functions for API and formatting
├── dist/             # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with appropriate tests
4. Run lint and tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Coding Standards

- Use TypeScript strict mode
- Include JSDoc comments for all public functions
- Follow existing code style and patterns
- Write tests for new functionality

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [ClickUp API Documentation](https://clickup.com/api)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [npm Package](https://www.npmjs.com/package/@griffinwork40/clickup-mcp-server)
- [GitHub Repository](https://github.com/griffinwork40/clickup-mcp)
