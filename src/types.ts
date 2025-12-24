/**
 * @file types.ts
 * @description TypeScript type definitions for ClickUp API responses.
 * This module contains all interfaces used to type ClickUp API data structures,
 * ensuring type safety throughout the MCP server implementation.
 */

/**
 * Represents a ClickUp team/workspace.
 * Teams are the top-level organizational unit in ClickUp.
 * 
 * @interface ClickUpTeam
 * @property {string} id - Unique identifier for the team
 * @property {string} name - Display name of the team
 * @property {string} [color] - Optional hex color code for the team
 * @property {string} [avatar] - Optional URL to the team's avatar image
 * @property {ClickUpUser[]} [members] - Optional array of team members
 * 
 * @example
 * const team: ClickUpTeam = {
 *   id: "123456",
 *   name: "Engineering Team",
 *   color: "#7C4DFF",
 *   members: [{ id: 1, username: "john_doe" }]
 * };
 */
export interface ClickUpTeam {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
  members?: ClickUpUser[];
}

/**
 * Represents a ClickUp user.
 * Users can be team members, assignees, watchers, or creators of tasks.
 * 
 * @interface ClickUpUser
 * @property {number} id - Unique numeric identifier for the user
 * @property {string} username - User's display name/handle
 * @property {string} [email] - Optional email address
 * @property {string} [color] - Optional hex color code associated with the user
 * @property {string} [profilePicture] - Optional URL to the user's profile picture
 * 
 * @example
 * const user: ClickUpUser = {
 *   id: 12345,
 *   username: "jane_smith",
 *   email: "jane@example.com"
 * };
 */
export interface ClickUpUser {
  id: number;
  username: string;
  email?: string;
  color?: string;
  profilePicture?: string;
}

/**
 * Represents a ClickUp space.
 * Spaces are the second level in the ClickUp hierarchy (Team → Space → Folder → List → Task).
 * 
 * @interface ClickUpSpace
 * @property {string} id - Unique identifier for the space
 * @property {string} name - Display name of the space
 * @property {boolean} private - Whether the space is private
 * @property {ClickUpStatus[]} [statuses] - Optional array of available statuses
 * @property {boolean} multiple_assignees - Whether tasks can have multiple assignees
 * @property {object} [features] - Optional feature flags for the space
 * 
 * @example
 * const space: ClickUpSpace = {
 *   id: "789",
 *   name: "Product Development",
 *   private: false,
 *   multiple_assignees: true
 * };
 */
export interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses?: ClickUpStatus[];
  multiple_assignees: boolean;
  features?: {
    due_dates: { enabled: boolean };
    time_tracking: { enabled: boolean };
    tags: { enabled: boolean };
    time_estimates: { enabled: boolean };
    checklists: { enabled: boolean };
    custom_fields: { enabled: boolean };
    remap_dependencies: { enabled: boolean };
    dependency_warning: { enabled: boolean };
    portfolios: { enabled: boolean };
  };
}

/**
 * Represents a ClickUp folder.
 * Folders are optional groupings within spaces (Team → Space → Folder → List → Task).
 * 
 * @interface ClickUpFolder
 * @property {string} id - Unique identifier for the folder
 * @property {string} name - Display name of the folder
 * @property {number} orderindex - Position of the folder within the space
 * @property {boolean} override_statuses - Whether folder overrides space statuses
 * @property {boolean} hidden - Whether the folder is hidden
 * @property {object} space - Parent space information
 * @property {string} task_count - Total number of tasks in the folder
 * @property {ClickUpList[]} [lists] - Optional array of lists in the folder
 * 
 * @example
 * const folder: ClickUpFolder = {
 *   id: "456",
 *   name: "Sprint 1",
 *   orderindex: 0,
 *   override_statuses: false,
 *   hidden: false,
 *   space: { id: "789", name: "Development" },
 *   task_count: "25"
 * };
 */
export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex: number;
  override_statuses: boolean;
  hidden: boolean;
  space: {
    id: string;
    name: string;
  };
  task_count: string;
  lists?: ClickUpList[];
}

/**
 * Represents a ClickUp list.
 * Lists are containers for tasks (Team → Space → Folder → List → Task).
 * 
 * @interface ClickUpList
 * @property {string} id - Unique identifier for the list
 * @property {string} name - Display name of the list
 * @property {number} orderindex - Position of the list within its parent
 * @property {object} [status] - Optional list-level status
 * @property {object} [priority] - Optional list-level priority
 * @property {ClickUpUser} [assignee] - Optional default assignee
 * @property {number} task_count - Total number of tasks in the list
 * @property {string} [due_date] - Optional list-level due date (Unix timestamp)
 * @property {string} [start_date] - Optional list-level start date (Unix timestamp)
 * @property {object} [folder] - Parent folder information
 * @property {object} [space] - Parent space information
 * @property {boolean} archived - Whether the list is archived
 * @property {boolean} [override_statuses] - Whether list overrides inherited statuses
 * @property {ClickUpStatus[]} [statuses] - Available statuses for tasks in this list
 * @property {string} [permission_level] - User's permission level on this list
 * 
 * @example
 * const list: ClickUpList = {
 *   id: "123",
 *   name: "Backlog",
 *   orderindex: 0,
 *   task_count: 42,
 *   archived: false,
 *   statuses: [
 *     { status: "to do", orderindex: 0, color: "#d3d3d3", type: "open" }
 *   ]
 * };
 */
export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  status?: {
    status: string;
    color: string;
    hide_label: boolean;
  };
  priority?: {
    priority: string;
    color: string;
  };
  assignee?: ClickUpUser;
  task_count: number;
  due_date?: string;
  start_date?: string;
  folder?: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  space?: {
    id: string;
    name: string;
    access: boolean;
  };
  archived: boolean;
  override_statuses?: boolean;
  statuses?: ClickUpStatus[];
  permission_level?: string;
}

/**
 * Represents a task status configuration in ClickUp.
 * 
 * @interface ClickUpStatus
 * @property {string} [id] - Optional unique identifier for the status
 * @property {string} status - Display name of the status
 * @property {number} orderindex - Position in the status workflow
 * @property {string} color - Hex color code for the status
 * @property {string} type - Status type: "open", "custom", "closed", or "done"
 * 
 * @example
 * const status: ClickUpStatus = {
 *   status: "in progress",
 *   orderindex: 1,
 *   color: "#4194f6",
 *   type: "custom"
 * };
 */
export interface ClickUpStatus {
  id?: string;
  status: string;
  orderindex: number;
  color: string;
  type: string;
}

/**
 * Represents a ClickUp task.
 * Tasks are the core work items in ClickUp, containing all task details and metadata.
 * 
 * @interface ClickUpTask
 * @property {string} id - Unique identifier for the task
 * @property {string} [custom_id] - Optional custom task ID
 * @property {string} name - Task title/name
 * @property {string} [text_content] - Plain text content of the description
 * @property {string} [description] - Full description (may include markdown)
 * @property {object} status - Current status of the task
 * @property {string} orderindex - Position of the task
 * @property {string} date_created - Creation timestamp (Unix milliseconds)
 * @property {string} date_updated - Last update timestamp (Unix milliseconds)
 * @property {string} [date_closed] - Closed timestamp (Unix milliseconds)
 * @property {ClickUpUser} creator - User who created the task
 * @property {ClickUpUser[]} assignees - Users assigned to the task
 * @property {ClickUpUser[]} [watchers] - Users watching the task
 * @property {ClickUpChecklist[]} [checklists] - Task checklists
 * @property {ClickUpTag[]} tags - Tags applied to the task
 * @property {string} [parent] - Parent task ID for subtasks
 * @property {object} [priority] - Task priority configuration
 * @property {string} [due_date] - Due date timestamp (Unix milliseconds)
 * @property {string} [start_date] - Start date timestamp (Unix milliseconds)
 * @property {number} [time_estimate] - Estimated time in milliseconds
 * @property {number} [time_spent] - Time spent in milliseconds
 * @property {ClickUpCustomField[]} [custom_fields] - Custom field values
 * @property {string[]} [dependencies] - Task IDs this task depends on
 * @property {string[]} [linked_tasks] - IDs of linked tasks
 * @property {string} team_id - Parent team/workspace ID
 * @property {string} url - Direct URL to the task in ClickUp
 * @property {string} [permission_level] - User's permission level on this task
 * @property {object} list - Parent list information
 * @property {object} project - Parent project information
 * @property {object} folder - Parent folder information
 * @property {object} space - Parent space information
 * 
 * @example
 * const task: ClickUpTask = {
 *   id: "abc123",
 *   name: "Implement feature X",
 *   status: { status: "in progress", color: "#4194f6", orderindex: 1, type: "custom" },
 *   creator: { id: 1, username: "john" },
 *   assignees: [{ id: 2, username: "jane" }],
 *   tags: [{ name: "feature" }],
 *   team_id: "123456",
 *   url: "https://app.clickup.com/t/abc123",
 *   // ... other required fields
 * };
 */
export interface ClickUpTask {
  id: string;
  custom_id?: string;
  name: string;
  text_content?: string;
  description?: string;
  status: {
    status: string;
    color: string;
    orderindex: number;
    type: string;
  };
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed?: string;
  creator: ClickUpUser;
  assignees: ClickUpUser[];
  watchers?: ClickUpUser[];
  checklists?: ClickUpChecklist[];
  tags: ClickUpTag[];
  parent?: string;
  priority?: {
    id: string;
    priority: string;
    color: string;
    orderindex: string;
  };
  due_date?: string;
  start_date?: string;
  time_estimate?: number;
  time_spent?: number;
  custom_fields?: ClickUpCustomField[];
  dependencies?: string[];
  linked_tasks?: string[];
  team_id: string;
  url: string;
  permission_level?: string;
  list: {
    id: string;
    name: string;
    access: boolean;
  };
  project: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  space: {
    id: string;
  };
}

/**
 * Represents a checklist on a ClickUp task.
 * 
 * @interface ClickUpChecklist
 * @property {string} id - Unique identifier for the checklist
 * @property {string} task_id - Parent task ID
 * @property {string} name - Checklist title
 * @property {number} orderindex - Position of the checklist
 * @property {number} resolved - Number of completed items
 * @property {number} unresolved - Number of incomplete items
 * @property {ClickUpChecklistItem[]} items - Checklist items
 * 
 * @example
 * const checklist: ClickUpChecklist = {
 *   id: "cl123",
 *   task_id: "abc123",
 *   name: "QA Checklist",
 *   orderindex: 0,
 *   resolved: 2,
 *   unresolved: 3,
 *   items: []
 * };
 */
export interface ClickUpChecklist {
  id: string;
  task_id: string;
  name: string;
  orderindex: number;
  resolved: number;
  unresolved: number;
  items: ClickUpChecklistItem[];
}

/**
 * Represents an item within a ClickUp checklist.
 * 
 * @interface ClickUpChecklistItem
 * @property {string} id - Unique identifier for the item
 * @property {string} name - Item text/description
 * @property {number} orderindex - Position within the checklist
 * @property {ClickUpUser} [assignee] - Optional assigned user
 * @property {boolean} resolved - Whether the item is completed
 * @property {string} [parent] - Parent item ID for nested items
 * @property {string} date_created - Creation timestamp
 * @property {ClickUpChecklistItem[]} [children] - Nested sub-items
 */
export interface ClickUpChecklistItem {
  id: string;
  name: string;
  orderindex: number;
  assignee?: ClickUpUser;
  resolved: boolean;
  parent?: string;
  date_created: string;
  children?: ClickUpChecklistItem[];
}

/**
 * Represents a tag in ClickUp.
 * Tags can be applied to tasks for categorization and filtering.
 * 
 * @interface ClickUpTag
 * @property {string} name - Tag name/label
 * @property {string} [tag_fg] - Optional foreground (text) color
 * @property {string} [tag_bg] - Optional background color
 * @property {number} [creator] - Optional creator user ID
 * 
 * @example
 * const tag: ClickUpTag = {
 *   name: "bug",
 *   tag_fg: "#ffffff",
 *   tag_bg: "#ff0000"
 * };
 */
export interface ClickUpTag {
  name: string;
  tag_fg?: string;
  tag_bg?: string;
  creator?: number;
}

/**
 * Represents a custom field definition and value in ClickUp.
 * Custom fields allow for flexible, user-defined data on tasks.
 * 
 * @interface ClickUpCustomField
 * @property {string} id - Unique identifier for the custom field
 * @property {string} name - Display name of the field
 * @property {string} type - Field type (text, number, dropdown, date, etc.)
 * @property {object} [type_config] - Type-specific configuration
 * @property {string} [date_created] - When the field was created
 * @property {boolean} [hide_from_guests] - Whether hidden from guests
 * @property {boolean} [required] - Whether the field is required
 * @property {any} [value] - Current value of the field
 * 
 * @example
 * const field: ClickUpCustomField = {
 *   id: "cf123",
 *   name: "Story Points",
 *   type: "number",
 *   value: 5
 * };
 */
export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  type_config?: {
    default?: number;
    placeholder?: string;
    options?: Array<{
      id: string;
      name: string;
      color?: string;
      orderindex: number;
    }>;
  };
  date_created?: string;
  hide_from_guests?: boolean;
  required?: boolean;
  value?: any;
}

/**
 * Represents a comment on a ClickUp task.
 * 
 * @interface ClickUpComment
 * @property {string} id - Unique identifier for the comment
 * @property {Array<{text: string}>} comment - Structured comment content
 * @property {string} comment_text - Plain text content of the comment
 * @property {ClickUpUser} user - User who posted the comment
 * @property {string} date - Timestamp when comment was posted
 * @property {boolean} [resolved] - Whether the comment thread is resolved
 * @property {ClickUpUser} [assignee] - Optional assigned user for comment
 * @property {ClickUpUser} [assigned_by] - User who made the assignment
 * @property {Array<{reaction: string, users: ClickUpUser[]}>} [reactions] - Emoji reactions
 * 
 * @example
 * const comment: ClickUpComment = {
 *   id: "cm123",
 *   comment: [{ text: "Great work!" }],
 *   comment_text: "Great work!",
 *   user: { id: 1, username: "john" },
 *   date: "1609459200000"
 * };
 */
export interface ClickUpComment {
  id: string;
  comment: Array<{
    text: string;
  }>;
  comment_text: string;
  user: ClickUpUser;
  date: string;
  resolved?: boolean;
  assignee?: ClickUpUser;
  assigned_by?: ClickUpUser;
  reactions?: Array<{
    reaction: string;
    users: ClickUpUser[];
  }>;
}

/**
 * Represents a time tracking entry in ClickUp.
 * 
 * @interface ClickUpTimeEntry
 * @property {string} id - Unique identifier for the time entry
 * @property {object} [task] - Associated task information
 * @property {ClickUpUser} user - User who logged the time
 * @property {boolean} billable - Whether the time is billable
 * @property {string} start - Start timestamp
 * @property {string} [end] - End timestamp (undefined if still running)
 * @property {string} duration - Duration in milliseconds as string
 * @property {string} [description] - Optional description of work done
 * @property {ClickUpTag[]} [tags] - Optional tags for categorization
 * @property {string} [source] - Source of the time entry
 * 
 * @example
 * const entry: ClickUpTimeEntry = {
 *   id: "te123",
 *   user: { id: 1, username: "john" },
 *   billable: true,
 *   start: "1609459200000",
 *   end: "1609462800000",
 *   duration: "3600000"
 * };
 */
export interface ClickUpTimeEntry {
  id: string;
  task?: {
    id: string;
    name: string;
    status?: {
      status: string;
      color: string;
    };
  };
  user: ClickUpUser;
  billable: boolean;
  start: string;
  end?: string;
  duration: string;
  description?: string;
  tags?: ClickUpTag[];
  source?: string;
}

/**
 * Pagination information returned with list responses.
 * Used to navigate through large result sets.
 * 
 * @interface PaginationInfo
 * @property {number} [total] - Total number of items available
 * @property {number} count - Number of items in current response
 * @property {number} offset - Current offset position
 * @property {boolean} has_more - Whether more items are available
 * @property {number} [next_offset] - Offset to use for next page
 * 
 * @example
 * const pagination: PaginationInfo = {
 *   total: 150,
 *   count: 20,
 *   offset: 0,
 *   has_more: true,
 *   next_offset: 20
 * };
 */
export interface PaginationInfo {
  total?: number;
  count: number;
  offset: number;
  has_more: boolean;
  next_offset?: number;
}

/**
 * Information about response truncation.
 * Provided when responses exceed character limits.
 * 
 * @interface TruncationInfo
 * @property {boolean} truncated - Whether the response was truncated
 * @property {number} original_count - Original number of items
 * @property {number} returned_count - Number of items after truncation
 * @property {string} [truncation_message] - Human-readable truncation message
 * 
 * @example
 * const truncation: TruncationInfo = {
 *   truncated: true,
 *   original_count: 500,
 *   returned_count: 42,
 *   truncation_message: "Response truncated from 500 to 42 tasks due to size limits."
 * };
 */
export interface TruncationInfo {
  truncated: boolean;
  original_count: number;
  returned_count: number;
  truncation_message?: string;
}
