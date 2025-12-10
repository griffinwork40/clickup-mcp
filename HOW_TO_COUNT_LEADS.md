# How to Count Leads by Status in ClickUp

This document explains step-by-step how to count leads with a specific status (e.g., "#1 - phone call") in the ClickUp "Atlas Free Website Lead Board".

## Overview

**NEW**: The ClickUp MCP server now includes a dedicated `clickup_count_tasks_by_status` tool that handles pagination internally and returns counts efficiently. This is the recommended approach.

### Recommended Method: Use the Counting Tool

The easiest way to count tasks by status is to use the `clickup_count_tasks_by_status` tool:

```json
{
  "tool": "clickup_count_tasks_by_status",
  "arguments": {
    "list_id": "901308085746",
    "statuses": ["#1 - phone call"],
    "response_format": "json"
  }
}
```

This tool:
- Handles pagination automatically (fetches all pages)
- Filters by status client-side (works even when API filtering fails)
- Returns counts in both markdown and JSON formats
- Is optimized for counting use cases

### Legacy Method: Manual Counting

If you need to count tasks manually (for example, in a script), the process is:
1. Fetch all tasks from the list (with pagination)
2. Filter them by status
3. Count the matching tasks

## Step-by-Step Process

### Step 1: Identify the List/Board

First, we need to find the correct list ID for the board we want to query.

1. **Get the team ID:**
   - Use `clickup_get_teams` to get all teams
   - In this case, the team ID is `9013707459` (Atlas Digital Usa)

2. **Find the space:**
   - Use `clickup_get_spaces` with the team ID
   - Look for "Atlas Digital (Leads Dashboard)" - space ID: `90132853967`

3. **Find the folder:**
   - Use `clickup_get_folders` with the space ID
   - Look for "Leads Folder" - folder ID: `90134512748`

4. **Find the list:**
   - The folder details show the list "Atlas Free Website Lead Board"
   - List ID: `901308085746`

### Step 2: Using the Counting Tool

The `clickup_count_tasks_by_status` tool automatically handles:
- Pagination (fetches all pages internally)
- Status filtering (uses client-side filtering as fallback when API filtering fails)
- Counting and aggregation

**Example usage:**
```json
{
  "tool": "clickup_count_tasks_by_status",
  "arguments": {
    "list_id": "901308085746",
    "statuses": ["#1 - phone call"],
    "response_format": "json"
  }
}
```

**Response:**
```json
{
  "total": 65,
  "by_status": {
    "#1 - phone call": 65
  }
}
```

### Step 2 (Legacy): Understanding API Limitations

**Note**: The status filtering in `clickup_get_tasks` and `clickup_search_tasks` has been improved with client-side fallback. However, for counting use cases, the dedicated counting tool is recommended.

The tools now:
- Try API filtering first
- Automatically fall back to client-side filtering if API returns 400 errors
- Handle pagination correctly in both cases

### Step 3: Create a Counting Script

Since the MCP tools don't support direct status filtering, we create a Node.js script that:

1. **Reads the API token from `.env`:**
   ```javascript
   const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
   ```

2. **Defines constants:**
   ```javascript
   const LIST_ID = '901308085746';
   const TARGET_STATUS = '#1 - phone call';
   const API_BASE_URL = 'https://api.clickup.com/api/v2';
   ```

3. **Implements pagination:**
   - ClickUp API returns tasks in pages (max 100 per page)
   - We need to loop through all pages until we've fetched all tasks
   - Use `offset` and `limit` parameters for pagination

4. **Filter and count:**
   - For each batch of tasks, filter by `task.status.status === TARGET_STATUS`
   - Accumulate the count across all pages

### Step 4: Execute the Script

Run the script:
```bash
node count-leads.js
```

The script will:
- Fetch tasks in batches of 100
- Count how many have the target status in each batch
- Display progress as it goes
- Show the final count

### Step 5: Clean Up

After getting the result, delete the temporary script file:
```bash
rm count-leads.js
```

## Example Script Structure

```javascript
async function countLeadsWithStatus() {
  let count = 0;
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    // Fetch tasks from ClickUp API
    const response = await axios.get(
      `${API_BASE_URL}/list/${LIST_ID}/task`,
      {
        headers: {
          'Authorization': CLICKUP_API_TOKEN,
          'Content-Type': 'application/json'
        },
        params: {
          archived: false,
          page: Math.floor(offset / limit),
          limit: limit
        }
      }
    );

    const tasks = response.data.tasks || [];
    
    // Filter by status
    const matchingTasks = tasks.filter(task => 
      task.status && task.status.status === TARGET_STATUS
    );
    
    count += matchingTasks.length;
    
    // Check if there are more tasks
    hasMore = tasks.length === limit;
    offset += limit;
  }

  return count;
}
```

## Results

For the "Atlas Free Website Lead Board":
- **Total leads:** 1,091
- **Leads with "#1 - phone call" status:** 65

## Exporting Leads to CSV

To export all leads with "#1 - phone call" status to a CSV file, create a script that:

1. **Fetches all matching leads** (same pagination approach as counting)
2. **Extracts relevant fields** from each task
3. **Writes to a CSV file** using Node.js `fs` module or a CSV library

### Complete CSV Export Script

Create a file `export-leads-to-csv.js`:

```javascript
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || 'pk_111954600_2DJHUTAN8ZYRZBQC1K60ONEXW9SJ3C6X';
const LIST_ID = '901308085746'; // Atlas Free Website Lead Board
const TARGET_STATUS = '#1 - phone call';
const API_BASE_URL = 'https://api.clickup.com/api/v2';
const OUTPUT_FILE = 'phone-call-leads.csv';

// Helper function to escape CSV fields
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Extract custom field value by name
function getCustomField(task, fieldName) {
  const field = task.custom_fields?.find(f => f.name === fieldName);
  if (!field) return '';
  
  // Handle different field types
  if (field.type === 'email' || field.type === 'phone_number' || field.type === 'url' || field.type === 'text') {
    return field.value || '';
  } else if (field.type === 'number' || field.type === 'currency') {
    return field.value || '';
  } else if (field.type === 'date') {
    return field.value ? new Date(parseInt(field.value)).toISOString().split('T')[0] : '';
  } else if (field.type === 'dropdown') {
    return field.value?.label || field.value?.name || '';
  } else if (field.type === 'checklist') {
    return field.value?.map(item => item.name).join('; ') || '';
  }
  return '';
}

// Convert task to CSV row
function taskToCSVRow(task) {
  return [
    escapeCSV(task.id),
    escapeCSV(task.name),
    escapeCSV(task.status?.status || ''),
    escapeCSV(task.date_created ? new Date(parseInt(task.date_created)).toISOString() : ''),
    escapeCSV(task.date_updated ? new Date(parseInt(task.date_updated)).toISOString() : ''),
    escapeCSV(task.url || ''),
    escapeCSV(task.assignees?.map(a => a.username || a.email).join('; ') || ''),
    escapeCSV(task.creator?.username || task.creator?.email || ''),
    escapeCSV(task.due_date ? new Date(parseInt(task.due_date)).toISOString() : ''),
    escapeCSV(task.priority?.priority || ''),
    escapeCSV(task.description || ''),
    // Add custom fields - adjust these based on your actual custom fields
    escapeCSV(getCustomField(task, 'Email')),
    escapeCSV(getCustomField(task, 'Phone')),
    escapeCSV(getCustomField(task, 'Company')),
    escapeCSV(getCustomField(task, 'Website')),
    escapeCSV(task.tags?.map(t => t.name).join('; ') || ''),
  ].join(',');
}

async function exportLeadsToCSV() {
  console.log(`Exporting leads with status "${TARGET_STATUS}" to ${OUTPUT_FILE}...`);

  const leads = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  // CSV Headers
  const headers = [
    'Task ID',
    'Name',
    'Status',
    'Date Created',
    'Date Updated',
    'URL',
    'Assignees',
    'Creator',
    'Due Date',
    'Priority',
    'Description',
    'Email',
    'Phone',
    'Company',
    'Website',
    'Tags'
  ];

  while (hasMore) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/list/${LIST_ID}/task`,
        {
          headers: {
            'Authorization': CLICKUP_API_TOKEN,
            'Content-Type': 'application/json'
          },
          params: {
            archived: false,
            page: Math.floor(offset / limit),
            limit: limit
          }
        }
      );

      const tasks = response.data.tasks || [];
      
      // Filter by status
      const matchingTasks = tasks.filter(task => 
        task.status && task.status.status === TARGET_STATUS
      );
      
      leads.push(...matchingTasks);
      
      console.log(`Fetched ${tasks.length} tasks (offset ${offset}), found ${matchingTasks.length} with status "${TARGET_STATUS}" (total so far: ${leads.length})`);

      hasMore = tasks.length === limit;
      offset += limit;
    } catch (error) {
      console.error('Error fetching tasks:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      break;
    }
  }

  // Write to CSV
  const csvRows = [headers.join(',')];
  leads.forEach(task => {
    csvRows.push(taskToCSVRow(task));
  });

  fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'), 'utf8');
  
  console.log(`\n✅ Exported ${leads.length} leads to ${OUTPUT_FILE}`);
  console.log(`📁 File location: ${path.resolve(OUTPUT_FILE)}`);
}

exportLeadsToCSV().catch(console.error);
```

### Running the Export Script

1. **Dependencies**: `axios` is already installed in this project, so no installation needed!

2. **Run the script**:
   ```bash
   node export-leads-to-csv.js
   ```

3. **Open the CSV file**:
   - The file `phone-call-leads.csv` will be created in the current directory
   - Open it in Excel, Google Sheets, or any CSV viewer
   - The file contains all 65 leads with "#1 - phone call" status

### Customizing the CSV Fields

To include different fields or custom fields:

1. **Check available custom fields** in your list:
   - Use `clickup_get_list_details` with the list ID
   - This shows all custom fields and their IDs

2. **Update the `taskToCSVRow` function**:
   - Add or remove fields from the array
   - Update the `headers` array to match
   - Use `getCustomField(task, 'Field Name')` for custom fields

3. **Example: Adding more custom fields**:
   ```javascript
   // In headers array:
   'Email', 'Phone', 'Company', 'Website', 'LinkedIn', 'Notes'
   
   // In taskToCSVRow function:
   escapeCSV(getCustomField(task, 'Email')),
   escapeCSV(getCustomField(task, 'Phone')),
   escapeCSV(getCustomField(task, 'Company')),
   escapeCSV(getCustomField(task, 'Website')),
   escapeCSV(getCustomField(task, 'LinkedIn')),
   escapeCSV(getCustomField(task, 'Notes')),
   ```

### Using the MCP Tools Instead

Alternatively, you can use the ClickUp MCP tools to fetch tasks and then convert to CSV:

```javascript
import { mcp_clickup_clickup_get_tasks } from './mcp-tools';

async function exportWithMCP() {
  const allLeads = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const result = await mcp_clickup_clickup_get_tasks({
      list_id: LIST_ID,
      limit: limit,
      offset: offset,
      response_format: 'json'
    });
    
    const tasks = result.tasks || [];
    const matching = tasks.filter(t => t.status?.status === TARGET_STATUS);
    allLeads.push(...matching);
    
    if (tasks.length < limit) break;
    offset += limit;
  }
  
  // Convert to CSV (same as above)
}
```

## Alternative Approaches

If you need to do this regularly, consider:

1. **Create a reusable utility function** in the MCP server codebase
2. **Add a new MCP tool** that supports status filtering and counting
3. **Use ClickUp's native filtering** in the UI and export the count
4. **Set up a scheduled script** that runs periodically and logs counts

## Notes

- The ClickUp API has rate limits (100 requests/minute for Business plan)
- Add delays between requests if processing large lists
- The status name must match exactly (case-sensitive, including special characters like "#")
- Closed/archived tasks are excluded by default (use `archived: true` if needed)

