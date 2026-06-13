/**
 * Application Constants
 * 
 * Centralized constants for the application.
 */

/**
 * Shift types
 */
export type ShiftType = 'morning' | 'afternoon';

/**
 * Attendance action types
 */
export type AttendanceType = 'clock_in' | 'clock_out';

/**
 * Attendance status
 */
export type AttendanceStatus = 'success' | 'failed' | 'pending';

/**
 * Default shift times
 */
export const SHIFT_TIMES = {
  MORNING: {
    START: '08:00',
    END: '12:00',
  },
  AFTERNOON: {
    START: '13:30',
    END: '17:30',
  },
} as const;

/**
 * Microsoft Teams API constants
 */
export const MS_TEAMS = {
  CLIENT_PLATFORM: 'TeamsWeb',
  CLIENT_VERSION: 'TEAMS_FLW_WEB_release_20260107.1.42438617',
  API_VERSION: '20',
  ENDPOINTS: {
    CLOCK_IN: (teamId: string) => `/svc-apac1/api/v2/teams/${teamId}/timeclock/clockin`,
    CLOCK_OUT: (teamId: string, timecardId: string) => 
      `/svc-apac1/api/v2/teams/${teamId}/timeclock/${timecardId}/clockout`,
    STATUS: (teamId: string) => `/svc-apac1/api/v2/teams/${teamId}/timeclock`,
  },
} as const;

/**
 * Telegram message templates
 */
export const TELEGRAM_TEMPLATES = {
  ERROR: (code: string, message: string, time: string, details?: string) => `
🚨 *ERROR* \\- ToolTeams

*Code:* \`${code}\`
*Message:* ${escapeMarkdown(message)}
*Time:* ${time}
${details ? `\n*Details:*\n\`\`\`\n${details}\n\`\`\`` : ''}
`,
  SUCCESS_CLOCK_IN: (user: string, time: string, shift: string, timecardId: string) => `
✅ *CLOCK IN SUCCESS*

*User:* ${escapeMarkdown(user)}
*Time:* ${time}
*Shift:* ${shift}
*Timecard:* \`${timecardId}\`
`,
  SUCCESS_CLOCK_OUT: (user: string, time: string, shift: string, timecardId: string) => `
✅ *CLOCK OUT SUCCESS*

*User:* ${escapeMarkdown(user)}
*Time:* ${time}
*Shift:* ${shift}
*Timecard:* \`${timecardId}\`
`,
  STATUS: (isRunning: boolean, hasCredentials: boolean, config: object) => `
📊 *SYSTEM STATUS*

*Scheduler:* ${isRunning ? '🟢 Running' : '🔴 Stopped'}
*Credentials:* ${hasCredentials ? '🟢 Configured' : '🔴 Not configured'}

*Schedule:*
\`\`\`
${JSON.stringify(config, null, 2)}
\`\`\`
`,
} as const;

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/**
 * Application info
 */
export const APP_INFO = {
  NAME: 'ToolTeams Microshop',
  VERSION: '2.0.0',
  DESCRIPTION: 'Auto attendance tool for Microsoft Teams Shifts',
} as const;
