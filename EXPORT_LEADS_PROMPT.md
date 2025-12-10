# Prompt: Export "#1 - phone call" Leads to CSV

Use the ClickUp MCP to export all leads with status "#1 - phone call" to CSV format. The phone numbers will be automatically normalized to E.164 format for ElevenLabs batch calling.

## Steps:

1. First, get my teams to find the team ID:
   - Use `clickup_get_teams` to list all available teams/workspaces

2. Get the spaces in the team:
   - Use `clickup_get_spaces` with the team_id from step 1

3. Get the lists in the space (or folder):
   - Use `clickup_get_lists` with either `space_id` or `folder_id` to find the leads list

4. Export the leads with "#1 - phone call" status to CSV:
   - Use `clickup_export_tasks_to_csv` with:
     - `list_id`: The ID of the list containing the leads
     - `statuses`: `["#1 - phone call"]`
     - `include_closed`: `false`
     - `archived`: `false`
     - `include_standard_fields`: `true` (to include standard fields like Task ID, Name, Status, etc.)
     - `add_phone_number_column`: `true` (automatically creates a combined phone_number column for ElevenLabs)

5. Save the CSV output to a file named `phone-call-leads.csv`

## Expected Result:

A CSV file with all leads that have status "#1 - phone call", with:
- Phone numbers automatically normalized to E.164 format (e.g., `+14124812210` instead of `+1 412 481 2210`)
- A `phone_number` column ready for ElevenLabs batch calling

---

## Quick Copy-Paste Prompt:

```
Use the ClickUp MCP to export all leads with status "#1 - phone call" to CSV format.

1. Get my teams using clickup_get_teams
2. Get spaces in the team using clickup_get_spaces
3. Get lists in the space using clickup_get_lists to find the leads list
4. Export leads using clickup_export_tasks_to_csv with:
   - list_id: [the list ID from step 3]
   - statuses: ["#1 - phone call"]
   - include_closed: false
   - archived: false
   - add_phone_number_column: true
5. Save the CSV output to a file named phone-call-leads.csv

The phone numbers will be automatically normalized to E.164 format and a phone_number column will be created for ElevenLabs batch calling.
```



