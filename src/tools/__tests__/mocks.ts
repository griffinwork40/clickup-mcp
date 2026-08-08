/**
 * @file mocks.ts
 * @description Shared mock data and helpers for ClickUp MCP server tests.
 * Provides realistic mock data for all ClickUp API response types.
 */

import type {
  ClickUpTeam,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpList,
  ClickUpTask,
  ClickUpComment,
  ClickUpTimeEntry,
  ClickUpUser,
  ClickUpStatus,
  ClickUpCustomField,
  ClickUpTag
} from '../../types.js';

// ============================================================================
// Mock Users
// ============================================================================

export const mockUser1: ClickUpUser = {
  id: 12345,
  username: 'john_doe',
  email: 'john@example.com',
  color: '#7C4DFF'
};

export const mockUser2: ClickUpUser = {
  id: 67890,
  username: 'jane_smith',
  email: 'jane@example.com',
  color: '#00BCD4'
};

// ============================================================================
// Mock Teams
// ============================================================================

export const mockTeam1: ClickUpTeam = {
  id: '123456',
  name: 'Engineering Team',
  color: '#7C4DFF',
  members: [mockUser1, mockUser2]
};

export const mockTeam2: ClickUpTeam = {
  id: '789012',
  name: 'Marketing Team',
  color: '#00BCD4'
};

export const mockTeamsResponse = {
  teams: [mockTeam1, mockTeam2]
};

// ============================================================================
// Mock Statuses
// ============================================================================

export const mockStatuses: ClickUpStatus[] = [
  { id: 'st1', status: 'to do', orderindex: 0, color: '#d3d3d3', type: 'open' },
  { id: 'st2', status: 'in progress', orderindex: 1, color: '#4194f6', type: 'custom' },
  { id: 'st3', status: 'review', orderindex: 2, color: '#f9d900', type: 'custom' },
  { id: 'st4', status: 'complete', orderindex: 3, color: '#6bc950', type: 'closed' }
];

// ============================================================================
// Mock Spaces
// ============================================================================

export const mockSpace1: ClickUpSpace = {
  id: 'space_001',
  name: 'Product Development',
  private: false,
  multiple_assignees: true,
  statuses: mockStatuses,
  features: {
    due_dates: { enabled: true },
    time_tracking: { enabled: true },
    tags: { enabled: true },
    time_estimates: { enabled: false },
    checklists: { enabled: true },
    custom_fields: { enabled: true },
    remap_dependencies: { enabled: false },
    dependency_warning: { enabled: false },
    portfolios: { enabled: false }
  }
};

export const mockSpace2: ClickUpSpace = {
  id: 'space_002',
  name: 'Customer Support',
  private: true,
  multiple_assignees: false
};

export const mockSpacesResponse = {
  spaces: [mockSpace1, mockSpace2]
};

// ============================================================================
// Mock Folders
// ============================================================================

export const mockFolder1: ClickUpFolder = {
  id: 'folder_001',
  name: 'Sprint 1',
  orderindex: 0,
  override_statuses: false,
  hidden: false,
  space: { id: 'space_001', name: 'Product Development' },
  task_count: '25',
  lists: []
};

export const mockFolder2: ClickUpFolder = {
  id: 'folder_002',
  name: 'Sprint 2',
  orderindex: 1,
  override_statuses: true,
  hidden: false,
  space: { id: 'space_001', name: 'Product Development' },
  task_count: '18'
};

export const mockFoldersResponse = {
  folders: [mockFolder1, mockFolder2]
};

// ============================================================================
// Mock Lists
// ============================================================================

export const mockList1: ClickUpList = {
  id: 'list_001',
  name: 'Backlog',
  orderindex: 0,
  task_count: 42,
  archived: false,
  statuses: mockStatuses,
  folder: { id: 'folder_001', name: 'Sprint 1', hidden: false, access: true },
  space: { id: 'space_001', name: 'Product Development', access: true }
};

export const mockList2: ClickUpList = {
  id: 'list_002',
  name: 'In Progress',
  orderindex: 1,
  task_count: 15,
  archived: false,
  statuses: mockStatuses
};

export const mockListsResponse = {
  lists: [mockList1, mockList2]
};

// ============================================================================
// Mock Custom Fields
// ============================================================================

export const mockCustomFields: ClickUpCustomField[] = [
  {
    id: 'cf_001',
    name: 'Email',
    type: 'email',
    value: 'test@example.com'
  },
  {
    id: 'cf_002',
    name: 'Phone',
    type: 'phone',
    value: '+1 412 481 2210'
  },
  {
    id: 'cf_003',
    name: 'Story Points',
    type: 'number',
    value: 5
  },
  {
    id: 'cf_004',
    name: 'Due Date',
    type: 'date',
    value: '1609459200000'
  },
  {
    id: 'cf_005',
    name: 'Priority Level',
    type: 'dropdown',
    value: { id: 'opt1', name: 'High', label: 'High', orderindex: 0 }
  }
];

// ============================================================================
// Mock Tags
// ============================================================================

export const mockTags: ClickUpTag[] = [
  { name: 'bug', tag_fg: '#ffffff', tag_bg: '#ff0000' },
  { name: 'feature', tag_fg: '#ffffff', tag_bg: '#00ff00' },
  { name: 'urgent', tag_fg: '#ffffff', tag_bg: '#ff6600' }
];

// ============================================================================
// Mock Tasks
// ============================================================================

export const mockTask1: ClickUpTask = {
  id: 'task_001',
  custom_id: 'ENG-123',
  name: 'Implement user authentication',
  text_content: 'Add OAuth2 login flow with Google and GitHub providers.',
  description: 'Add OAuth2 login flow with Google and GitHub providers.',
  status: { status: 'in progress', color: '#4194f6', orderindex: 1, type: 'custom' },
  orderindex: '0',
  date_created: '1609459200000',
  date_updated: '1609545600000',
  creator: mockUser1,
  assignees: [mockUser1, mockUser2],
  tags: [mockTags[0], mockTags[2]],
  priority: { id: 'p1', priority: 'high', color: '#f9d900', orderindex: '1' },
  due_date: '1610064000000',
  start_date: '1609459200000',
  time_estimate: 14400000, // 4 hours
  time_spent: 7200000, // 2 hours
  custom_fields: mockCustomFields,
  team_id: '123456',
  url: 'https://app.clickup.com/t/task_001',
  list: { id: 'list_001', name: 'Backlog', access: true },
  project: { id: 'proj_001', name: 'Main Project', hidden: false, access: true },
  folder: { id: 'folder_001', name: 'Sprint 1', hidden: false, access: true },
  space: { id: 'space_001' }
};

export const mockTask2: ClickUpTask = {
  id: 'task_002',
  name: 'Fix login bug',
  status: { status: 'to do', color: '#d3d3d3', orderindex: 0, type: 'open' },
  orderindex: '1',
  date_created: '1609545600000',
  date_updated: '1609632000000',
  creator: mockUser2,
  assignees: [mockUser1],
  tags: [mockTags[0]],
  team_id: '123456',
  url: 'https://app.clickup.com/t/task_002',
  list: { id: 'list_001', name: 'Backlog', access: true },
  project: { id: 'proj_001', name: 'Main Project', hidden: false, access: true },
  folder: { id: 'folder_001', name: 'Sprint 1', hidden: false, access: true },
  space: { id: 'space_001' }
};

export const mockTask3: ClickUpTask = {
  id: 'task_003',
  name: 'Update documentation',
  status: { status: 'complete', color: '#6bc950', orderindex: 3, type: 'closed' },
  orderindex: '2',
  date_created: '1609372800000',
  date_updated: '1609459200000',
  date_closed: '1609459200000',
  creator: mockUser1,
  assignees: [],
  tags: [],
  team_id: '123456',
  url: 'https://app.clickup.com/t/task_003',
  list: { id: 'list_001', name: 'Backlog', access: true },
  project: { id: 'proj_001', name: 'Main Project', hidden: false, access: true },
  folder: { id: 'folder_001', name: 'Sprint 1', hidden: false, access: true },
  space: { id: 'space_001' }
};

export const mockTasksResponse = {
  tasks: [mockTask1, mockTask2, mockTask3]
};

// ============================================================================
// Mock Comments
// ============================================================================

export const mockComment1: ClickUpComment = {
  id: 'comment_001',
  comment: [{ text: 'Great progress on this task!' }],
  comment_text: 'Great progress on this task!',
  user: mockUser1,
  date: '1609545600000',
  resolved: false
};

export const mockComment2: ClickUpComment = {
  id: 'comment_002',
  comment: [{ text: 'Need more details on the implementation.' }],
  comment_text: 'Need more details on the implementation.',
  user: mockUser2,
  date: '1609632000000',
  resolved: true
};

export const mockCommentsResponse = {
  comments: [mockComment1, mockComment2]
};

// ============================================================================
// Mock Time Entries
// ============================================================================

export const mockTimeEntry1: ClickUpTimeEntry = {
  id: 'time_001',
  task: { id: 'task_001', name: 'Implement user authentication', status: { status: 'in progress', color: '#4194f6' } },
  user: mockUser1,
  billable: true,
  start: '1609459200000',
  end: '1609466400000',
  duration: '7200000', // 2 hours
  description: 'Initial implementation'
};

export const mockTimeEntry2: ClickUpTimeEntry = {
  id: 'time_002',
  task: { id: 'task_001', name: 'Implement user authentication' },
  user: mockUser2,
  billable: false,
  start: '1609552800000',
  duration: '3600000', // 1 hour, still running
  description: 'Code review'
};

export const mockTimeEntriesResponse = {
  data: [mockTimeEntry1, mockTimeEntry2]
};

// ============================================================================
// Mock API Error Responses
// ============================================================================

export const mockError401 = {
  response: {
    status: 401,
    data: { err: 'Invalid API token' }
  }
};

export const mockError403 = {
  response: {
    status: 403,
    data: { err: 'Permission denied' }
  }
};

export const mockError404 = {
  response: {
    status: 404,
    data: { err: 'Resource not found' }
  }
};

export const mockError429 = {
  response: {
    status: 429,
    data: { err: 'Rate limit exceeded' }
  }
};

export const mockError500 = {
  response: {
    status: 500,
    data: { err: 'Internal server error' }
  }
};

export const mockNetworkError = {
  code: 'ENOTFOUND'
};

export const mockTimeoutError = {
  code: 'ECONNABORTED'
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a mock axios response object.
 */
export function createMockAxiosResponse<T>(data: T, status = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {}
  };
}

/**
 * Creates a mock axios error object that matches AxiosError structure.
 * The handleApiError function checks for AxiosError using instanceof.
 */
export function createMockAxiosError(status: number, errorMessage: string) {
  // Import AxiosError properly
  const { AxiosError } = require('axios');
  const error = new AxiosError(
    errorMessage,
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      data: { err: errorMessage },
      statusText: 'Error',
      headers: {},
      config: {} as any
    } as any
  );
  return error;
}

/**
 * Generates an array of mock tasks for pagination testing.
 */
export function generateMockTasks(count: number, startIndex = 0): ClickUpTask[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockTask1,
    id: `task_${startIndex + i + 1}`,
    name: `Task ${startIndex + i + 1}`,
    orderindex: String(startIndex + i)
  }));
}

/**
 * Creates a mock task with custom field values.
 */
export function createMockTaskWithCustomFields(
  taskId: string,
  customFields: ClickUpCustomField[]
): ClickUpTask {
  return {
    ...mockTask1,
    id: taskId,
    custom_fields: customFields
  };
}
