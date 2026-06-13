/**
 * Leantime Telegram Message Templates
 * 
 * Centralized messages for Leantime Telegram commands.
 * Following SOLID: Single Responsibility - this file only handles message templates.
 * Following DRY: All messages in one place for easy updates.
 */

/**
 * Escape special characters for Telegram MarkdownV2
 */
export function escapeMarkdown(str: string): string {
  return str.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

// ============================================
// ERROR MESSAGES
// ============================================
export const LEANTIME_MESSAGES = {
  // Login errors
  NOT_LOGGED_IN: '❌ Chưa đăng nhập Leantime\\. Dùng `/leantime_login` trước\\.',
  
  // Command usage errors
  MISSING_PROJECT_ID: 
    '❌ *Thiếu Project ID\\!*\n\n' +
    '📝 Cú pháp: `/lt_tasks <project_id>`\n\n' +
    '💡 Dùng `/lt_projects` để xem danh sách dự án và ID\\.',
  
  INVALID_PROJECT_ID: '❌ Project ID phải là số\\. VD: `/lt_tasks 16`',
  
  MISSING_TASK_ID: '❌ Cú pháp: `/lt_task <task_id>`',
  
  INVALID_TASK_ID: '❌ Task ID phải là số\\.',
  
  MISSING_DEPLOY_TASK_ID: '❌ Cú pháp: `/lt_done <task_id>`',
  
  // Loading messages
  LOADING_TASKS: '🔄 Đang tải tasks \\(Active: New, In Progress\\)\\.\\.\\.',
  LOADING_PROJECTS: '🔄 Đang tải danh sách dự án\\.\\.\\.',
  LOADING_TASK_DETAIL: '🔄 Đang tải chi tiết task\\.\\.\\.',
  LOADING_UPDATE_STATUS: '🔄 Đang cập nhật trạng thái task\\.\\.\\.',
  
  // Empty results
  NO_TASKS: 'ℹ️ Không có task nào\\.',
  NO_PROJECTS: 'ℹ️ Không có dự án nào\\.',
  TASK_NOT_FOUND: '❌ Không tìm thấy task\\.',
  
  // Success messages
  LOGIN_FAILED: '❌ Đăng nhập thất bại\\. Kiểm tra lại email/password\\.',
} as const;

// ============================================
// MESSAGE BUILDER FUNCTIONS
// ============================================

/**
 * Build task marked done message
 */
export function buildTaskMarkedDoneMessage(taskId: number): string {
  return `✅ Task \\#${taskId} đã được chuyển sang trạng thái *Done*\\!`;
}

/**
 * Build task marked in progress message
 */
export function buildTaskMarkedInProgressMessage(taskId: number): string {
  return `🔄 Task \\#${taskId} đã được chuyển sang trạng thái *In Progress*\\!`;
}

/**
 * Build login checking message
 */
export function buildLoginCheckingMessage(email: string, url: string): string {
  return `🔄 Đang đăng nhập Leantime với user ${email} vào ${escapeMarkdown(url)}\\.\\.\\.`;
}

/**
 * Build existing credentials found message
 */
export function buildExistingCredentialsMessage(email: string): string {
  return `ℹ️ Phát hiện tài khoản \`${email}\` đã có thông tin đăng nhập cũ\\. Hệ thống sẽ cập nhật session mới\\.`;
}

/**
 * Build login success message
 */
export function buildLoginSuccessMessage(email: string, url: string, projectCount: number): string {
  return (
    `✅ *Đăng nhập Leantime thành công\\!*\n` +
    `👤 User: \`${email}\`\n` +
    `🔗 URL: ${escapeMarkdown(url)}\n` +
    `📂 Projects: ${projectCount}`
  );
}

/**
 * Build login success without projects message
 */
export function buildLoginSuccessNoProjectsMessage(email: string): string {
  return (
    `✅ *Đăng nhập Leantime thành công\\!*\n` +
    `👤 User: \`${email}\`\n` +
    `⚠️ Không thể lấy danh sách projects ngay lúc này\\.`
  );
}

// ============================================
// HEADER TEMPLATES
// ============================================
export function createTaskListHeader(
  projectId: number, 
  userId: string, 
  activeCount: number, 
  totalCount: number,
  typeFilter?: string
): string {
  let header = `📋 *TASKS \\- PROJECT ${projectId}*\n`;
  header += `👤 User: \`${userId}\`\n`;
  header += `📊 Active: ${activeCount} / Total: ${totalCount} tasks\n`;
  if (typeFilter) {
    header += `🔍 Filter: ${escapeMarkdown(typeFilter)}\n`;
  }
  header += '\n';
  return header;
}

export function createProjectListHeader(userId: string): string {
  return (
    `📂 *DANH SÁCH DỰ ÁN LEANTIME*\n` +
    `👤 User: \`${userId}\`\n\n`
  );
}

export function createTaskDetailHeader(): string {
  return `📋 *CHI TIẾT TASK*\n\n`;
}

// ============================================
// FOOTER TEMPLATES
// ============================================
export function createTaskListFooter(remainingCount?: number): string {
  let footer = '';
  if (remainingCount && remainingCount > 0) {
    footer += `\\.\\.\\. và ${remainingCount} tasks khác\n`;
  }
  footer += '\n💡 _Dùng_ /lt\\_task \\<id\\> _để xem chi tiết_';
  return footer;
}

export function createProjectListFooter(remainingCount?: number): string {
  let footer = '';
  if (remainingCount && remainingCount > 0) {
    footer += `\n\\.\\.\\. và ${remainingCount} dự án khác`;
  }
  return footer;
}

// ============================================
// COMMAND HELP
// ============================================
export const LEANTIME_HELP = {
  LT_TASKS: '/lt_tasks <project_id> [type] - Xem tasks (type: bug/task)',
  LT_TASK: '/lt_task <task_id> - Chi tiết task',
  LT_PROJECTS: '/lt_projects - Xem danh sách dự án',
  LT_DONE: '/lt_done <task_id> - Đánh dấu task hoàn thành',
  LT_LOGIN: '/leantime_login <email> <password> [url] - Đăng nhập',
} as const;
