# How to Export ClickUp Leads to CSV by Status

This guide explains how to export all leads with a specific status from ClickUp to a CSV file, including all custom field data.

## Overview

**NEW**: The ClickUp MCP server now includes a dedicated `clickup_export_tasks_to_csv` tool that handles all the complexity automatically. This is the recommended approach.

### Recommended Method: Use the Export Tool

The easiest way to export tasks to CSV is to use the `clickup_export_tasks_to_csv` tool:

```json
{
  "tool": "clickup_export_tasks_to_csv",
  "arguments": {
    "list_id": "901308085746",
    "statuses": ["#1 - phone call"],
    "include_standard_fields": true
  }
}
```

This tool:
- Handles pagination automatically (fetches all pages)
- Filters by status (with client-side fallback)
- Fetches detailed task information for custom fields
- Formats everything as CSV
- Returns CSV content that can be saved to a file

### Legacy Method: Manual Script

If you need to export using a custom script (for example, for automation or custom processing), see the script template below.

## Prerequisites

- Node.js installed (v18 or higher) - only needed for manual script method
- ClickUp API token
- Access to the ClickUp workspace

## Step 1: Find Your List ID

First, you need to identify the ClickUp list/board you want to export from.

### Option A: Using ClickUp MCP Tools

1. **Get your team ID:**
   ```bash
   # Use the MCP tool: clickup_get_teams
   # Look for your team/workspace ID
   ```

2. **Find the space:**
   ```bash
   # Use: clickup_get_spaces with team_id
   # Note the space ID you need
   ```

3. **Find the folder (if applicable):**
   ```bash
   # Use: clickup_get_folders with space_id
   # Note the folder ID if your list is in a folder
   ```

4. **Find the list:**
   ```bash
   # Use: clickup_get_lists with folder_id or space_id
   # Note the list ID - this is what you'll use in the script
   ```

### Option B: From ClickUp URL

1. Open your ClickUp list/board in a web browser
2. Look at the URL - it will contain the list ID
3. Example: `https://app.clickup.com/123456/v/li/901308085746`
   - The list ID is `901308085746`

## Step 2: Identify the Status Name

1. **Check available statuses:**
   ```bash
   # Use: clickup_get_list_details with list_id
   # This shows all available statuses in the list
   ```

2. **Note the exact status name** (case-sensitive, including special characters)
   - Example: `"#1 - phone call"` (not `"#1 - Phone Call"`)

## Step 3: Set Up the Export Script

### Create the Script File

Create a file named `export-leads-to-csv.js` in your project directory.

### Install Dependencies (if needed)

```bash
npm install axios
```

Note: If you're in the `clickup-mcp` project, `axios` is already installed.

### Script Template

Copy this template and customize it:

```javascript
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || 'YOUR_API_TOKEN_HERE';
const LIST_ID = 'YOUR_LIST_ID_HERE'; // e.g., '901308085746'
const TARGET_STATUS = 'YOUR_STATUS_NAME_HERE'; // e.g., '#1 - phone call'
const API_BASE_URL = 'https://api.clickup.com/api/v2';
const OUTPUT_FILE = 'exported-leads.csv'; // Output filename

// ============================================
// HELPER FUNCTIONS
// ============================================

// Escape CSV fields to handle commas, quotes, and newlines
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Extract custom field value by name (prefers field with value if multiple exist)
function getCustomField(task, fieldName, preferredType = null) {
  if (!task.custom_fields) return '';
  
  // Find all fields with matching name
  const matchingFields = task.custom_fields.filter(f => f.name === fieldName);
  if (matchingFields.length === 0) return '';
  
  // If preferred type specified, try that first
  if (preferredType) {
    const typedField = matchingFields.find(f => f.type === preferredType && f.value);
    if (typedField) {
      return extractFieldValue(typedField);
    }
  }
  
  // Prefer field with a value
  const fieldWithValue = matchingFields.find(f => f.value !== null && f.value !== undefined && f.value !== '');
  const field = fieldWithValue || matchingFields[0];
  
  return extractFieldValue(field);
}

// Extract value from a custom field based on its type
function extractFieldValue(field) {
  if (!field || !field.value) return '';
  
  // Handle different field types
  if (field.type === 'email' || field.type === 'phone' || field.type === 'url' || field.type === 'text' || field.type === 'short_text') {
    return String(field.value).trim();
  } else if (field.type === 'phone_number') {
    return String(field.value).trim();
  } else if (field.type === 'number' || field.type === 'currency') {
    return String(field.value);
  } else if (field.type === 'date') {
    return new Date(parseInt(field.value)).toISOString().split('T')[0];
  } else if (field.type === 'dropdown') {
    return field.value?.label || field.value?.name || String(field.value || '');
  } else if (field.type === 'labels') {
    return Array.isArray(field.value) ? field.value.map(v => v.label || v.name || v).join('; ') : '';
  } else if (field.type === 'checklist') {
    return Array.isArray(field.value) ? field.value.map(item => item.name).join('; ') : '';
  } else if (field.type === 'checkbox') {
    return field.value ? 'Yes' : 'No';
  }
  return String(field.value || '').trim();
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
    escapeCSV(task.description || task.text_content || ''),
    // ============================================
    // CUSTOM FIELDS - UPDATE THESE BASED ON YOUR LIST
    // ============================================
    // Replace these with your actual custom field names
    escapeCSV(getCustomField(task, 'Email', 'email')),
    escapeCSV(getCustomField(task, 'Personal Phone', 'phone') || getCustomField(task, 'Biz Phone number')),
    escapeCSV(getCustomField(task, 'Company Name', 'short_text')),
    escapeCSV(getCustomField(task, 'Website', 'url')),
    escapeCSV(getCustomField(task, 'Lead Source')),
    escapeCSV(getCustomField(task, 'Date Entered', 'date')),
    escapeCSV(getCustomField(task, 'Deal Value', 'currency')),
    escapeCSV(task.tags?.map(t => t.name).join('; ') || ''),
  ].join(',');
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

async function exportLeadsToCSV() {
  console.log(`Exporting leads with status "${TARGET_STATUS}" to ${OUTPUT_FILE}...`);

  const leads = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  // CSV Headers - UPDATE THESE TO MATCH YOUR CUSTOM FIELDS
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
    'Company Name',
    'Website',
    'Lead Source',
    'Date Entered',
    'Deal Value',
    'Tags'
  ];

  // Step 1: Fetch all tasks with matching status
  console.log('Step 1: Fetching tasks from list...');
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
      
      console.log(`  Fetched ${tasks.length} tasks (offset ${offset}), found ${matchingTasks.length} with status "${TARGET_STATUS}" (total so far: ${leads.length})`);

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

  if (leads.length === 0) {
    console.log(`\n⚠️  No leads found with status "${TARGET_STATUS}"`);
    return;
  }

  // Step 2: Fetch detailed task information for each lead to get custom fields
  console.log(`\nStep 2: Fetching detailed information for ${leads.length} leads...`);
  const detailedLeads = [];
  
  for (let i = 0; i < leads.length; i++) {
    const task = leads[i];
    try {
      const detailResponse = await axios.get(
        `${API_BASE_URL}/task/${task.id}`,
        {
          headers: {
            'Authorization': CLICKUP_API_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );
      
      detailedLeads.push(detailResponse.data);
      
      if ((i + 1) % 10 === 0) {
        console.log(`  Fetched details for ${i + 1}/${leads.length} leads...`);
      }
    } catch (error) {
      console.error(`  Error fetching details for task ${task.id}:`, error.message);
      // Use the basic task data if detail fetch fails
      detailedLeads.push(task);
    }
  }

  // Step 3: Write to CSV
  console.log(`\nStep 3: Writing to CSV file...`);
  const csvRows = [headers.join(',')];
  detailedLeads.forEach(task => {
    csvRows.push(taskToCSVRow(task));
  });

  fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'), 'utf8');
  
  console.log(`\n✅ Successfully exported ${detailedLeads.length} leads to ${OUTPUT_FILE}`);
  console.log(`📁 File location: ${path.resolve(OUTPUT_FILE)}`);
}

// Run the export
exportLeadsToCSV().catch(console.error);
```

## Step 4: Customize the Script

### Update Configuration Section

1. **Set your API token:**
   ```javascript
   const CLICKUP_API_TOKEN = 'pk_your_token_here';
   ```
   Or use environment variable:
   ```bash
   export CLICKUP_API_TOKEN='pk_your_token_here'
   ```

2. **Set your list ID:**
   ```javascript
   const LIST_ID = '901308085746'; // Your list ID from Step 1
   ```

3. **Set your target status:**
   ```javascript
   const TARGET_STATUS = '#1 - phone call'; // Exact status name from Step 2
   ```

4. **Set output filename:**
   ```javascript
   const OUTPUT_FILE = 'my-leads-export.csv';
   ```

### Identify Your Custom Fields

1. **Get list details to see custom fields:**
   ```bash
   # Use: clickup_get_list_details with list_id
   # Or fetch one task: clickup_get_task with task_id
   ```

2. **Note the custom field names** you want to include in the CSV

3. **Update the `taskToCSVRow` function:**
   - Add or remove custom field extractions
   - Match the field names exactly as they appear in ClickUp
   - Example:
     ```javascript
     escapeCSV(getCustomField(task, 'Your Field Name', 'field_type')),
     ```

4. **Update the headers array** to match:
   ```javascript
   const headers = [
     'Task ID',
     'Name',
     // ... add your custom field headers here
     'Your Field Name',
   ];
   ```

### Common Custom Field Types

- `'email'` - Email fields
- `'phone'` or `'phone_number'` - Phone number fields
- `'url'` - Website/URL fields
- `'text'` or `'short_text'` - Text fields
- `'date'` - Date fields
- `'currency'` - Money/deal value fields
- `'dropdown'` - Dropdown selection fields
- `'labels'` - Multi-select label fields
- `'checkbox'` - Yes/No checkbox fields

## Step 5: Run the Script

```bash
node export-leads-to-csv.js
```

The script will:
1. Fetch all tasks from your list
2. Filter by the specified status
3. Fetch detailed information for each matching task
4. Export everything to a CSV file

## Step 6: Verify the Export

1. **Check the console output:**
   - Should show how many leads were found
   - Should show progress as details are fetched
   - Should confirm successful export

2. **Open the CSV file:**
   - Open in Excel, Google Sheets, or any CSV viewer
   - Verify all expected fields are present
   - Check that custom field data is populated

## Troubleshooting

### No Leads Found

- **Check the status name:** Must match exactly (case-sensitive, including special characters)
- **Verify the list ID:** Make sure you're using the correct list
- **Check for archived tasks:** The script excludes archived tasks by default

### Missing Custom Field Data

- **Verify field names:** Must match exactly as they appear in ClickUp
- **Check field types:** Some fields might have different types (e.g., `'text'` vs `'short_text'`)
- **Fetch a sample task:** Use `clickup_get_task` to see the exact field structure

### API Rate Limits

- ClickUp API has rate limits (typically 100 requests/minute)
- If you get rate limit errors, add a delay:
  ```javascript
  // Add after fetching each task detail
  await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
  ```

### Empty Fields in CSV

- Some fields may be empty if they weren't filled in ClickUp
- Check if the field exists in your list's custom fields
- Verify the field name matches exactly (including spaces and capitalization)

## Example: Exporting Different Statuses

To export leads with a different status, simply change the `TARGET_STATUS`:

```javascript
// Export "#2 - phone call" leads
const TARGET_STATUS = '#2 - phone call';

// Export "proposal sent" leads
const TARGET_STATUS = 'proposal sent';

// Export "won - fully paid" leads
const TARGET_STATUS = 'won - fully paid';
```

## Advanced: Export Multiple Statuses

To export leads with multiple statuses, modify the filter:

```javascript
const TARGET_STATUSES = ['#1 - phone call', '#2 - phone call', '#3 - phone call'];

// In the filter:
const matchingTasks = tasks.filter(task => 
  task.status && TARGET_STATUSES.includes(task.status.status)
);
```

## Tips

1. **Test with a small list first** to verify the script works correctly
2. **Save your script** with a descriptive name for future use
3. **Use environment variables** for API tokens to keep them secure
4. **Add error handling** for production use
5. **Document your custom fields** so you remember what each one is

## Quick Reference

- **List ID:** Found in ClickUp URL or via `clickup_get_lists`
- **Status Name:** Found via `clickup_get_list_details`
- **Custom Fields:** Found via `clickup_get_task` on a sample task
- **API Token:** Found in ClickUp Settings → Apps → API

## Next Steps

After exporting:
- Import the CSV into your CRM
- Use it for email campaigns
- Analyze lead data in Excel/Google Sheets
- Create reports and dashboards
- Share with your team

---

**Need help?** Check the ClickUp API documentation or review the example script in `export-leads-to-csv.js`.

