# ClickUp MCP Server - Evaluation Questions

This document contains evaluation questions to test the effectiveness of the ClickUp MCP server. These questions require multiple tool calls and realistic workflows.

## Prerequisites

Before running these evaluations:

1. Set up your ClickUp API token: `export CLICKUP_API_TOKEN="pk_your_token_here"`
2. Have at least one team/workspace with spaces, lists, and tasks
3. Ensure you have read access to the data

## Evaluation Questions

### Question 1: Organization Discovery
**Question**: "How many spaces are in my first team, and what is the name of the space with the most tasks?"

**Expected approach**:
1. Use `clickup_get_teams` to get team list
2. Use `clickup_get_spaces` with first team ID
3. For each space, count tasks or analyze metadata
4. Identify space with most tasks

**Skills tested**: Multi-step workflow, data aggregation, comparison

---

### Question 2: Status Analysis
**Question**: "In list [list_id], how many tasks are in 'to do' status versus 'in progress' status?"

**Expected approach**:
1. Use `clickup_get_tasks` with list_id
2. Filter or count tasks by status
3. Compare counts

**Skills tested**: Filtering, data analysis, counting

---

### Question 3: Task Creation Workflow
**Question**: "Create a task called 'Review Q4 metrics' in list [list_id] with high priority, due date next Friday, and tag it with 'quarterly-review'"

**Expected approach**:
1. Use `clickup_get_list_details` to see available statuses
2. Calculate next Friday's Unix timestamp
3. Use `clickup_create_task` with all parameters
4. Verify creation was successful

**Skills tested**: Data preparation, task creation, parameter handling

---

### Question 4: Search and Update
**Question**: "Find all tasks containing the word 'bug' in team [team_id] that are assigned to user [user_id], and list their current statuses"

**Expected approach**:
1. Use `clickup_search_tasks` with query="bug" and assignee filter
2. Extract status information from results
3. Present summary

**Skills tested**: Search filtering, data extraction, summarization

---

### Question 5: Time Tracking Workflow
**Question**: "Start tracking time on task [task_id] in team [team_id], then immediately stop it. How long was the entry?"

**Expected approach**:
1. Use `clickup_start_time_entry` with task and team IDs
2. Use `clickup_stop_time_entry` with team ID
3. Extract duration from stopped entry
4. Report duration

**Skills tested**: Sequential operations, state management, data extraction

---

### Question 6: Comment Analysis
**Question**: "What was the most recent comment on task [task_id], and who posted it?"

**Expected approach**:
1. Use `clickup_get_comments` with task_id
2. Sort by date (or identify most recent)
3. Extract author and text

**Skills tested**: Data sorting, information extraction

---

### Question 7: Hierarchy Navigation
**Question**: "Starting from team [team_id], navigate to the first space, find a list (folderless or in first folder), and show me the name of the first task in that list"

**Expected approach**:
1. Use `clickup_get_spaces` with team_id
2. Use `clickup_get_lists` with first space (or first folder if exists)
3. Use `clickup_get_tasks` with first list
4. Extract first task name

**Skills tested**: Multi-level navigation, hierarchy understanding, data extraction

---

### Question 8: Task Update Chain
**Question**: "Get task [task_id], change its status to 'in progress', add yourself as an assignee, and then add a comment saying 'Started work on this'"

**Expected approach**:
1. Use `clickup_get_task` to retrieve current state
2. Use `clickup_update_task` to change status and assignees
3. Use `clickup_add_comment` to add comment
4. Verify all operations succeeded

**Skills tested**: Sequential operations, state modification, verification

---

### Question 9: Priority Filtering
**Question**: "In team [team_id], how many tasks have 'urgent' priority (priority 1) versus 'high' priority (priority 2)?"

**Expected approach**:
1. Use `clickup_search_tasks` with team_id
2. Filter or count tasks by priority field
3. Compare counts

**Skills tested**: Filtering, counting, data analysis

---

### Question 10: Custom Field Discovery
**Question**: "What custom fields are available in list [list_id], and what are their types?"

**Expected approach**:
1. Use `clickup_get_list_details` with list_id
2. Extract custom fields information
3. List field names and types

**Skills tested**: Metadata extraction, information presentation

---

## Running Evaluations

To test these questions:

1. **Manual Testing**: Use Claude Desktop with the MCP server configured and ask these questions
2. **Automated Testing**: Create test scripts that verify expected tool calls and responses
3. **Integration Testing**: Run in a live ClickUp environment with real data

## Success Criteria

A successful evaluation means:

- ✅ The MCP server provides all necessary tools to answer the question
- ✅ Tool descriptions are clear enough for the LLM to select correct tools
- ✅ Tool responses contain sufficient information to answer the question
- ✅ Error handling provides helpful guidance when issues occur
- ✅ The LLM can chain multiple tool calls to achieve complex goals

## Notes

- Replace `[list_id]`, `[task_id]`, `[team_id]`, `[user_id]` with actual IDs from your ClickUp workspace
- Some questions require existing data (tasks, comments, etc.)
- Time-based questions (Question 3) need current date calculation
- Destructive operations (create, update) should be tested in a non-production environment
