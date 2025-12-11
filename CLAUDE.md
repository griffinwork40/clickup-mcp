# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides comprehensive integration with the ClickUp API. It enables LLMs to manage tasks, projects, teams, and workflows programmatically through 19 MCP tools.

**Technology Stack:**
- TypeScript with ES Modules (Node16 module resolution)
- MCP SDK (@modelcontextprotocol/sdk)
- Axios for HTTP requests
- Zod for input validation
- Jest for testing

## Build and Development Commands

```bash
# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Clean build artifacts
npm run clean

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Architecture

### File Structure

**Core Files:**
- `src/index.ts` - Main MCP server setup with 19 registered tools (1885 lines)
- `src/utils.ts` - Shared utility functions for API calls, formatting, CSV export, pagination
- `src/types.ts` - TypeScript type definitions for ClickUp API responses
- `src/constants.ts` - API URL, limits, enums (ResponseFormat, ResponseMode, Priority)

### Key Architectural Patterns

**Tool Registration Pattern:**
All 19 tools follow a consistent structure in `index.ts`:
1. Zod schema for input validation
2. Tool handler with try/catch error handling
3. Response formatting (Markdown vs JSON based on `response_format` param)
4. Error handling via `handleApiError()`

**Response Modes:**
Tools support three response modes via `response_mode` parameter:
- `FULL` - Complete details with descriptions (default)
- `COMPACT` - Essential fields only (id, name, status, assignees) - use for large result sets
- `SUMMARY` - Statistical overview by status/assignee without individual items

**Pagination:**
- Default limit: 20, max limit: 100
- Offset must be a multiple of limit (validated)
- Tools return `pagination` object with `has_more` and `next_offset`
- Some tools handle pagination internally (`countTasksByStatus`, `exportTasksToCSV`)

**Status Filtering with Fallback:**
`clickup_get_tasks` and `clickup_search_tasks` implement automatic client-side fallback:
1. Try API-based status filtering first
2. If API returns 400 error, fetch all tasks and filter client-side
3. Mark response with "Using client-side filtering" note

**Response Truncation:**
- Character limit: 100,000 characters
- `truncateResponse()` in utils.ts detects format (JSON vs Markdown) and uses appropriate strategy
- JSON truncation: removes array items until under limit
- Markdown truncation: finds good boundaries (headers, horizontal rules)
- Returns `TruncationInfo` with count details

**CSV Export for ElevenLabs Integration:**
`exportTasksToCSV` has special handling for phone numbers:
- `add_phone_number_column` option creates synthetic `phone_number` field
- Priority: Personal Phone > Biz Phone number > first phone field found
- All phone fields normalized to E.164 format via `normalizePhoneToE164()`
- E.164 validation: `^\+?[1-9]\d{1,14}$` (no spaces, extensions removed, country code added if missing)

## Environment Variables

**Required:**
- `CLICKUP_API_TOKEN` - ClickUp API token (get from https://app.clickup.com/settings/apps)

The server validates token presence on startup and exits with error if missing.

## Testing

Tests use Jest with ES Module support:
- Test files: `**/*.test.ts` or `**/*.spec.ts`
- Run with `--experimental-vm-modules` flag (configured in package.json)
- Coverage excludes test files and type definitions

## API Integration Details

**Base URL:** `https://api.clickup.com/api/v2`

**Rate Limits:**
- Business plan: 100 requests/minute
- Business Plus+: 1000 requests/minute
- Server implements automatic error messages for 429 responses

**Authentication:**
Headers sent with every request:
- `Authorization: <CLICKUP_API_TOKEN>`
- `Content-Type: application/json`
- `Accept: application/json`

**Timeout:** 30 seconds (configurable via `DEFAULT_TIMEOUT`)

## ClickUp Hierarchy

Understanding the hierarchy is critical for using tools correctly:

```
Team (Workspace)
└── Space
    └── Folder (optional)
        └── List
            └── Task
```

**Navigation flow:**
1. Get teams with `clickup_get_teams`
2. Get spaces with `clickup_get_spaces` (requires team_id)
3. Get folders with `clickup_get_folders` (requires space_id) OR get folderless lists
4. Get lists with `clickup_get_lists` (requires folder_id OR space_id)
5. Get list details with `clickup_get_list_details` to see available statuses and custom fields
6. Create/get/update tasks (requires list_id for create, task_id for operations)

## Common Patterns

**Before creating tasks:**
Always call `clickup_get_list_details` first to see:
- Available statuses (status names must match exactly)
- Custom fields and their IDs/types
- This prevents 400 errors from invalid status names

**For large result sets:**
Use `response_mode: 'compact'` to reduce token usage while still getting task lists.

**For status reporting:**
Use `response_mode: 'summary'` to get counts by status/assignee without individual task details.

**For lead tracking/phone campaigns:**
Use `clickup_export_tasks_to_csv` with `add_phone_number_column: true` to get E.164-formatted phone numbers.

## Error Handling

`handleApiError()` converts HTTP status codes to user-friendly messages:
- 400: Bad request (check parameters, especially status names)
- 401: Invalid/missing API token
- 403: Permission denied
- 404: Resource not found (check IDs)
- 429: Rate limit exceeded
- 500/502/503: ClickUp server error

## Custom Field Handling

Custom fields are complex in ClickUp:
- Each field has a type (text, number, date, dropdown, phone, etc.)
- `extractCustomFieldValue()` handles type-specific value extraction
- Phone fields are automatically normalized to E.164 format
- Dropdown fields return label/name instead of UUID
- Date fields converted to ISO format

## Publishing

This is published as `@griffinwork40/clickup-mcp-server` on npm.

Build artifacts included in package:
- `dist/` directory (compiled JS)
- `README.md`
- `LICENSE`

Binary entry point: `dist/index.js` (executable as `clickup-mcp`)
