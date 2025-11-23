/**
 * TypeScript type definitions for ClickUp API responses.
 */

export interface ClickUpTeam {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
  members?: ClickUpUser[];
}

export interface ClickUpUser {
  id: number;
  username: string;
  email?: string;
  color?: string;
  profilePicture?: string;
}

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

export interface ClickUpStatus {
  id?: string;
  status: string;
  orderindex: number;
  color: string;
  type: string;
}

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

export interface ClickUpChecklist {
  id: string;
  task_id: string;
  name: string;
  orderindex: number;
  resolved: number;
  unresolved: number;
  items: ClickUpChecklistItem[];
}

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

export interface ClickUpTag {
  name: string;
  tag_fg?: string;
  tag_bg?: string;
  creator?: number;
}

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

export interface PaginationInfo {
  total?: number;
  count: number;
  offset: number;
  has_more: boolean;
  next_offset?: number;
}

export interface TruncationInfo {
  truncated: boolean;
  original_count: number;
  returned_count: number;
  truncation_message?: string;
}
