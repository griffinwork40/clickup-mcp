# Exporting ClickUp Leads to ElevenLabs Batch Calling

## Overview

This guide explains how to export leads from ClickUp with phone numbers automatically normalized to E.164 format for use with ElevenLabs batch calling.

## Problem: Phone Number Format Requirements

ElevenLabs batch calling requires phone numbers in **E.164 format** with the following rules:

- **Regex pattern**: `^\+?[1-9]\d{1,14}$`
- **Optional** `+` at the start
- **Must start** with digit 1-9 (not 0)
- **Followed by** 1-14 digits only
- **NO spaces, dashes, parentheses, dots, or other characters**
- **NO extensions** (e.g., `x206`)

### Invalid Formats (Will Not Work)
- `+1 412 481 2210` ❌ (has spaces)
- `817.527.9708` ❌ (no country code, has dots)
- `(623) 258-3673` ❌ (has parentheses and dashes)
- `518-434-8128 x206` ❌ (has dashes and extension)

### Valid Formats (E.164)
- `+14124812210` ✅
- `+13025306667` ✅
- `+18175279708` ✅
- `+441922722723` ✅ (international)

## Solution: ClickUp MCP Export Tool

The ClickUp MCP server includes an export tool that **automatically normalizes phone numbers** to E.164 format during CSV export.

### Features

1. **Automatic Phone Number Normalization**
   - Removes all formatting (spaces, dashes, parentheses, dots)
   - Removes extensions (x, ext, extension)
   - Adds `+1` country code for 10-digit US/Canada numbers
   - Preserves existing country codes for international numbers
   - Validates final format matches E.164 regex

2. **Smart Phone Field Detection**
   - Detects phone fields by type (`phone`, `phone_number`)
   - Detects phone fields by name (case-insensitive "phone" keyword)
   - Works with both dedicated phone fields and text fields containing phone numbers

3. **Flexible Field Selection**
   - Export all fields or specify custom fields
   - Include/exclude standard fields
   - Filter by status

## Step-by-Step Export Process

### Step 1: Get Your Teams

```json
{
  "tool": "clickup_get_teams",
  "response_format": "json"
}
```

**Result**: List of teams/workspaces with IDs.

### Step 2: Get Spaces in Team

```json
{
  "tool": "clickup_get_spaces",
  "team_id": "9013707459",
  "response_format": "json"
}
```

**Result**: List of spaces in the team. Look for your leads dashboard space.

### Step 3: Get Lists in Space (or Folder)

If lists are in a folder:
```json
{
  "tool": "clickup_get_folders",
  "space_id": "90132853967",
  "response_format": "json"
}
```

Then get lists in the folder:
```json
{
  "tool": "clickup_get_lists",
  "folder_id": "90134512748",
  "response_format": "json"
}
```

Or get folderless lists:
```json
{
  "tool": "clickup_get_lists",
  "space_id": "90132853967",
  "response_format": "json"
}
```

**Result**: List of lists with IDs. Find your leads list (e.g., "Atlas Free Website Lead Board").

### Step 4: Export Leads to CSV

```json
{
  "tool": "clickup_export_tasks_to_csv",
  "list_id": "901308085746",
  "statuses": ["#1 - phone call"],
  "include_closed": false,
  "archived": false,
  "include_standard_fields": true,
  "add_phone_number_column": true,
  "custom_fields": [
    "Email",
    "Personal Phone",
    "Biz Phone number",
    "Company Name",
    "Website",
    "Lead Source"
  ]
}
```

**Parameters**:
- `list_id`: The ID of the list containing leads
- `statuses`: Array of status names to filter (e.g., `["#1 - phone call"]`)
- `include_closed`: Set to `false` to exclude closed tasks
- `archived`: Set to `false` to exclude archived tasks
- `include_standard_fields`: Set to `true` to include standard fields (Task ID, Name, Status, etc.)
- **`add_phone_number_column`**: Set to `true` to automatically create a combined `phone_number` column (recommended for ElevenLabs)
- `custom_fields`: Array of custom field names to include (optional - if omitted, includes all custom fields)

**Result**: CSV content with all phone numbers normalized to E.164 format and a `phone_number` column ready for ElevenLabs.

### Step 5: (Optional) Manual `phone_number` Column Creation

If you set `add_phone_number_column: false` (or omit it), you can manually add the `phone_number` column using the script below. However, **it's recommended to use `add_phone_number_column: true`** to have the MCP tool handle this automatically.

**Python Script** (run after export):

```python
import csv

# Read the CSV
with open('phone-call-leads.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

# Find column indices
header = rows[0]
email_idx = header.index('Email')
personal_phone_idx = header.index('Personal Phone')
biz_phone_idx = header.index('Biz Phone number')

# Insert phone_number column after Email
header.insert(email_idx + 1, 'phone_number')

# Process each data row
for row in rows[1:]:
    # Get phone number (Personal Phone first, then Biz Phone number)
    personal_phone = row[personal_phone_idx] if personal_phone_idx < len(row) else ''
    biz_phone = row[biz_phone_idx] if biz_phone_idx < len(row) else ''
    phone_number = personal_phone if personal_phone else biz_phone
    
    # Insert phone_number value after Email
    row.insert(email_idx + 1, phone_number)

# Write back
with open('phone-call-leads.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(rows)
```

**Or use this one-liner**:

```bash
cd /path/to/clickup-mcp && python3 -c "
import csv
with open('phone-call-leads.csv', 'r', encoding='utf-8') as f:
    rows = list(csv.reader(f))
header = rows[0]
email_idx = header.index('Email')
personal_phone_idx = header.index('Personal Phone')
biz_phone_idx = header.index('Biz Phone number')
header.insert(email_idx + 1, 'phone_number')
for row in rows[1:]:
    personal_phone = row[personal_phone_idx] if personal_phone_idx < len(row) else ''
    biz_phone = row[biz_phone_idx] if biz_phone_idx < len(row) else ''
    phone_number = personal_phone if personal_phone else biz_phone
    row.insert(email_idx + 1, phone_number)
with open('phone-call-leads.csv', 'w', encoding='utf-8', newline='') as f:
    csv.writer(f).writerows(rows)
print('Added phone_number column successfully')
"
```

## Phone Number Normalization Examples

The export tool automatically transforms phone numbers:

| Original Format | Normalized E.164 |
|----------------|------------------|
| `+1 412 481 2210` | `+14124812210` |
| `+1 302 530 6667` | `+13025306667` |
| `817.527.9708` | `+18175279708` |
| `(623) 258-3673` | `+16232583673` |
| `404.931.7899` | `+14049317899` |
| `518-434-8128 x206` | `+15184348128` |
| `+44.1922.722723` | `+441922722723` |

## Final CSV Structure

Your final CSV should have these columns (at minimum):

- `Task ID` - ClickUp task identifier
- `Name` - Lead name
- `Status` - Current status
- `Email` - Lead email address
- **`phone_number`** - **REQUIRED** - Normalized E.164 phone number
- `Company Name` - Company name
- `Website` - Company website
- (Other fields as needed)

## Quick Reference: Complete Export Command

```json
{
  "tool": "clickup_export_tasks_to_csv",
  "list_id": "YOUR_LIST_ID",
  "statuses": ["#1 - phone call"],
  "include_closed": false,
  "archived": false,
  "include_standard_fields": true,
  "add_phone_number_column": true,
  "custom_fields": [
    "Email",
    "Personal Phone",
    "Biz Phone number",
    "Company Name",
    "Website",
    "Lead Source"
  ]
}
```

**Note**: With `add_phone_number_column: true`, the CSV will automatically include a `phone_number` column ready for ElevenLabs. No additional processing needed!

## Troubleshooting

### Issue: Phone numbers not normalized

**Solution**: Ensure you're using the latest version of the ClickUp MCP server. Phone normalization was added in version 1.1.0+.

### Issue: Missing phone_number column

**Solution**: Set `add_phone_number_column: true` in the export parameters. The MCP tool will automatically create the column. If you prefer manual creation, use the Python script in Step 5.

### Issue: Empty phone numbers

**Solution**: Some leads may not have phone numbers. Filter these out before uploading to ElevenLabs, or handle them separately.

### Issue: Invalid phone number format

**Solution**: The normalization function validates E.164 format. If a number can't be normalized, it will be empty. Check the original data in ClickUp.

## Notes

- Phone numbers are normalized **during export**, so the CSV always contains E.164 format
- The normalization function handles US/Canada numbers (adds +1) and international numbers (preserves country code)
- Extensions are automatically removed
- Numbers starting with 0 are invalid and will be empty
- Numbers that are too short (< 10 digits) or too long (> 15 digits) will be empty

## Related Files

- `EXPORT_LEADS_PROMPT.md` - Quick prompt for exporting leads
- `HOW_TO_EXPORT_LEADS_TO_CSV.md` - Detailed export guide
- `HOW_TO_COUNT_LEADS.md` - Guide for counting leads by status


