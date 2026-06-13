/**
 * Leantime Constants
 * 
 * Centralized constants for Leantime integration.
 * Following SOLID: Single Responsibility - this file only handles constants.
 */

// ============================================
// STATUS CODES (Leantime Ticket States)
// ============================================
export const LEANTIME_STATUS = {
  NEW: 3,
  IN_PROGRESS: 4,
  DONE: 0,
  ARCHIVED: -1,
} as const;

// Active statuses (exclude Done and Archived)
export const ACTIVE_STATUS_CODES = [3, 4, 5, 6, 7, 8, 9, 10] as const;
export const DONE_STATUS_CODES = [0, -1] as const;

// Status type mapping for filtering
export type LeantimeStatusType = 'NEW' | 'PROGRESS' | 'DONE';

export const STATUS_TYPE_MAP: Record<number, LeantimeStatusType> = {
  3: 'NEW',
  4: 'PROGRESS',
  0: 'DONE',
  [-1]: 'DONE',
};

// ============================================
// PRIORITY CODES (Leantime Priority Levels)
// ============================================
export const LEANTIME_PRIORITY = {
  VERY_HIGH: 5,
  HIGH: 4,
  MEDIUM_HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
} as const;

// Priority order for sorting (higher = more important)
export const PRIORITY_ORDER: Record<string, number> = {
  '5': 5,  // Very High
  '4': 4,  // High
  '3': 3,  // Medium-High
  '2': 2,  // Medium
  '1': 1,  // Low
  '': 0,
};

// ============================================
// TICKET TYPES
// ============================================
export const LEANTIME_TICKET_TYPES = {
  BUG: 'bug',
  TASK: 'task',
  STORY: 'story',
  FEATURE: 'feature',
  IDEA: 'idea',
} as const;

export type LeantimeTicketType = typeof LEANTIME_TICKET_TYPES[keyof typeof LEANTIME_TICKET_TYPES];

// ============================================
// EMOJI MAPPINGS
// ============================================
export const PRIORITY_EMOJI: Record<number, string> = {
  5: '🔴',   // Very High
  4: '🟠',   // High
  3: '🟡',   // Medium-High
  2: '🟡',   // Medium
  1: '🟢',   // Low
  0: '⚪',   // Unknown
};

export const STATUS_EMOJI: Record<number, string> = {
  3: '🆕',   // New
  4: '🔄',   // In Progress
  5: '📌',   // Custom (default)
  0: '✅',   // Done
  [-1]: '📦', // Archived
};

export const STATUS_EMOJI_DEFAULT = '📋';

export const TYPE_EMOJI: Record<string, string> = {
  bug: '🐛',
  task: '📋',
  story: '📖',
  feature: '✨',
  idea: '💡',
};

// ============================================
// DEFAULT LEANTIME URL
// ============================================
export const LEANTIME_DEFAULT_URL = 'https://project.hilab.cloud';

// ============================================
// API ENDPOINTS (JSON-RPC methods)
// ============================================
export const LEANTIME_API_METHODS = {
  // Tickets (Tasks)
  TICKETS_GET_ALL: 'leantime.rpc.tickets.getAll',
  TICKETS_GET: 'leantime.rpc.tickets.getTicket',
  TICKETS_ADD: 'leantime.rpc.tickets.addTicket',
  TICKETS_PATCH: 'leantime.rpc.tickets.patchTicket',
  TICKETS_GET_STATE_LABELS: 'leantime.rpc.tickets.getStateLabels',
  
  // Projects
  PROJECTS_GET_ALL: 'leantime.rpc.projects.projects.getAll',
  PROJECTS_GET: 'leantime.rpc.projects.projects.getProject',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get emoji for priority level
 */
export function getPriorityEmoji(priority: string | number): string {
  const p = typeof priority === 'number' ? priority : parseInt(priority || '0', 10);
  return PRIORITY_EMOJI[p] || PRIORITY_EMOJI[0];
}

/**
 * Get emoji for status code
 */
export function getStatusEmoji(status: string | number): string {
  const s = typeof status === 'number' ? status : parseInt(status || '0', 10);
  return STATUS_EMOJI[s] || STATUS_EMOJI_DEFAULT;
}

/**
 * Get emoji for ticket type
 */
export function getTypeEmoji(type: string): string {
  return TYPE_EMOJI[type?.toLowerCase()] || TYPE_EMOJI.task;
}

/**
 * Check if status is active (not Done or Archived)
 */
export function isActiveStatus(status: string | number): boolean {
  const s = typeof status === 'number' ? status : parseInt(status || '0', 10);
  return !isNaN(s) && !(DONE_STATUS_CODES as readonly number[]).includes(s);
}

/**
 * Get status label from code
 */
export function getStatusLabel(status: string | number): string {
  const s = typeof status === 'number' ? status : parseInt(status || '0', 10);
  switch (s) {
    case 3: return 'New';
    case 4: return 'In Progress';
    case 0: return 'Done';
    case -1: return 'Archived';
    default: return s >= 5 ? `Status${s}` : 'Unknown';
  }
}

/**
 * Get priority label from code
 */
export function getPriorityLabel(priority: string | number): string {
  const p = typeof priority === 'number' ? priority : parseInt(priority || '0', 10);
  switch (p) {
    case 5: return 'Very High';
    case 4: return 'High';
    case 3: return 'Medium-High';
    case 2: return 'Medium';
    case 1: return 'Low';
    default: return 'Unknown';
  }
}
