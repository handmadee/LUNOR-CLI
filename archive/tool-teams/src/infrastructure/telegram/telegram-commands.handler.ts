import { telegramBot } from './telegram-bot.service';
import { attendanceService } from '../../modules/attendance/services/attendance.service';
import { schedulerService } from '../../modules/attendance/services/scheduler.service';
import { authService } from '../../modules/auth/services/auth.service';
import { teamsLoginService } from '../../modules/auth/services/teams-login.service';
import { leantimeAuthService } from '../../modules/leantime/services/leantime-auth.service';
import { leantimeCredentialsRepository } from '../../modules/leantime/repositories/leantime-credentials.repository';
import { LeantimeProjectsService } from '../../modules/leantime/services/leantime-projects.service';
import { LeantimeTasksService } from '../../modules/leantime/services/leantime-tasks.service';
import { LeantimeUsersService } from '../../modules/leantime/services/leantime-users.service';
import { telegramPolling, TelegramCommand } from './telegram-polling.service';
import { telegramTemplates } from './telegram.templates';
// Leantime constants (SOLID - Single Responsibility)
import {
  LEANTIME_STATUS,
  DONE_STATUS_CODES,
  PRIORITY_ORDER,
  getPriorityEmoji,
  getStatusEmoji,
  getTypeEmoji,
  isActiveStatus,
  getStatusLabel,
} from '../../modules/leantime/constants/leantime.constants';
import {
  LEANTIME_MESSAGES,
  createTaskListHeader,
  createTaskListFooter,
} from '../../modules/leantime/constants/leantime.messages';
// SOLID: Text utilities (Single Responsibility)
import { escapeMarkdown, cleanHtmlDescription } from './text-utils';

/**
 * Telegram Commands Handler
 * 
 * Processes incoming commands and triggers appropriate actions.
 */
class TelegramCommandsHandler {
  constructor() {
    this.registerCommands();
    this.registerMenuCommands();
  }

  /**
   * Register command handler with polling service
   */
  private registerCommands(): void {
    telegramPolling.setCommandHandler(this.handleCommand.bind(this));
  }

  /**
   * Register menu commands with Telegram
   */
  private async registerMenuCommands(): Promise<void> {
    const success = await telegramBot.setMyCommands([
      { command: 'status', description: 'Kiểm tra trạng thái hệ thống' },
      { command: 'account', description: 'Xem thông tin account chi tiết' },
      { command: 'logs', description: 'Xem lịch sử chấm công hôm nay' },
      { command: 'errors', description: 'Xem log lỗi hệ thống' },
      { command: 'login', description: 'Đăng nhập MS Teams (Auto)' },
      { command: 'leantime_login', description: 'Login Leantime (Auto URL)' },
      { command: 'lt_projects', description: 'Xem danh sách dự án Leantime' },
      { command: 'lt_tasks', description: 'Xem tasks (VD: /lt_tasks 16 bug)' },
      { command: 'lt_task', description: 'Chi tiết task (VD: /lt_task 123)' },
      { command: 'lt_done', description: 'Đánh dấu task hoàn thành' },
      { command: 'lt_users', description: 'Xem danh sách users trong dự án' },
      { command: 'lt_today', description: 'Xem tasks đã done trong ngày' },
      { command: 'clockin', description: 'Chấm công vào (Manual)' },
      { command: 'clockout', description: 'Chấm công ra (Manual)' },
      { command: 'scheduler', description: 'Xem cấu hình lịch tự động' },
      { command: 'help', description: 'Hướng dẫn sử dụng' },
    ]);

    if (success) {
      console.log('[TelegramCommands] Menu commands registered successfully');
    } else {
      console.warn('[TelegramCommands] Failed to register menu commands');
    }
  }

  /**
   * Handle incoming command
   */
  async handleCommand({ command, args }: TelegramCommand): Promise<void> {
    switch (command) {
      case '/start':
      case '/help':
        await this.sendHelp();
        break;
      
      case '/status':
        await this.handleStatus();
        break;

      case '/account':
        await this.handleAccount();
        break;

      case '/logs':
        await this.handleLogs();
        break;

      case '/errors':
        await this.handleErrors();
        break;

      case '/login':
        await this.handleLogin(args);
        break;

      case '/leantime_login':
        await this.handleLeantimeLogin(args);
        break;

      case '/clockin':
        await this.handleClockIn();
        break;

      case '/clockout':
        await this.handleClockOut();
        break;

      case '/scheduler':
        await this.handleSchedulerStatus();
        break;

      case '/lt_projects':
        await this.handleLeantimeProjects();
        break;

      case '/lt_tasks':
        await this.handleLeantimeTasks(args);
        break;

      case '/lt_task':
        await this.handleLeantimeTaskDetail(args);
        break;

      case '/lt_done':
        await this.handleLeantimeMarkDone(args);
        break;

      case '/lt_users':
        await this.handleLeantimeUsers(args);
        break;

      case '/lt_today':
        await this.handleLeantimeToday(args);
        break;

      default:
        await telegramBot.sendMessage(telegramTemplates.commandUnknown);
    }
  }

  /**
   * Handle /leantime_login
   */
  private async handleLeantimeLogin(args: string[]): Promise<void> {
    if (args.length < 2) {
      // Assuming user needs help format
      await telegramBot.sendMessage('❌ Cú pháp: `/leantime_login email password [url]`');
      return;
    }

    const [email, password, url] = args;
    const leantimeUrl = url || 'https://project.hilab.cloud'; // Default to known working URL

    await telegramBot.sendMessage(`🔄 Đang đăng nhập Leantime với user ${email} vào ${leantimeUrl}...`);

    // Check for existing credentials and notify user if found
    const existing = leantimeCredentialsRepository.findById(email);
    if (existing) {
        await telegramBot.sendMessage(`ℹ️ Phát hiện tài khoản \`${email}\` đã có thông tin đăng nhập cũ\\. Hệ thống sẽ cập nhật session mới\\.`);
    }

    try {
      const success = await leantimeAuthService.login({
        email,
        password,
        leantimeUrl
      });

      if (success) {
        // Instantiate service with specific user context to get correct URL/Creds
        const leantimeProjectsService = new LeantimeProjectsService(email);
        try {
            const projects = await leantimeProjectsService.getMyProjects();
            await telegramBot.sendMessage(
                `✅ *Đăng nhập Leantime thành công\\!*\n` +
                `👤 User: \`${email}\`\n` +
                `🔗 URL: ${leantimeUrl}\n` +
                `Zw📂 Projects: ${projects.length}`
            );
        } catch (e) {
             await telegramBot.sendMessage(
                `✅ *Đăng nhập Leantime thành công\\!*\n` +
                `👤 User: \`${email}\`\n` +
                `⚠️ Không thể lấy danh sách projects ngay lúc này\\.`
            );
        }
      } else {
        await telegramBot.sendMessage('❌ Đăng nhập thất bại\\. Kiểm tra lại email/password\\.');
      }
    } catch (error) {
      await telegramBot.sendMessage(`❌ Lỗi hệ thống: ${(error as Error).message}`);
    }
  }

  /**
   * Send help message
   */
  private async sendHelp(): Promise<void> {
    await telegramBot.sendMessage(telegramTemplates.helpCommand());
  }

  /**
   * Handle /status
   */
  private async handleStatus(): Promise<void> {
    const credentials = authService.getCredentialsInfo();
    const scheduler = schedulerService.getStatus();
    
    // If no credentials, show limited status but don't error out entirely
    const userId = (credentials as any)?.userId || 'N/A';
    const hasToken = (credentials as any)?.hasToken || false;
    const hasCookies = (credentials as any)?.hasCookies || false;

    const text = telegramTemplates.systemStatus(
      userId,
      hasToken,
      hasCookies,
      scheduler.isRunning
    );
    await telegramBot.sendMessage(text);
  }

  /**
   * Handle /account
   */
  private async handleAccount(): Promise<void> {
    const credentials = authService.getCredentialsInfo();
    
    if (!credentials) {
      await telegramBot.sendMessage(telegramTemplates.errorNoCredentials);
      return;
    }

    await telegramBot.sendMessage(telegramTemplates.accountInfo(credentials));
  }

  /**
   * Handle /logs
   */
  private async handleLogs(): Promise<void> {
    const logs = attendanceService.getTodayLogs();
    
    if (logs.length === 0) {
      await telegramBot.sendMessage(telegramTemplates.logEmpty);
      return;
    }

    const text = telegramTemplates.logsList(logs);
    await telegramBot.sendMessage(text);
  }

  /**
   * Handle /login
   */
  private async handleLogin(args: string[]): Promise<void> {
    if (args.length < 2) {
      await telegramBot.sendMessage(telegramTemplates.loginHelp());
      return;
    }

    const [email, password, teamId] = args;

    await telegramBot.sendMessage(telegramTemplates.loginStart(email));

    // Perform login
    const result = await teamsLoginService.login(email, password);

    if (result.success && result.accessToken) {
      // Save credentials
      authService.saveCredentials({
        accessToken: result.accessToken,
        teamId: result.teamId || teamId || 'UNKNOWN_TEAM',
        userId: email, // Use email as userId
        deviceId: result.deviceId,
        sessionId: result.sessionId,
        userObjectId: result.userObjectId,
        tenantId: result.tenantId,
        cookies: result.cookies,
        displayName: result.displayName,
      });

      await telegramBot.sendMessage(telegramTemplates.loginSuccess(email));
    } else {
      await telegramBot.sendMessage(telegramTemplates.loginFailed(result.error || 'Unknown error'));
    }
  }

  /**
   * Handle /clockin
   */
  private async handleClockIn(): Promise<void> {
    await telegramBot.sendMessage(telegramTemplates.processingClockIn);
    const result = await attendanceService.clockIn();
    
    // Success/Error messages are handled by LoggerService -> TelegramBotService
    if (!result.success) {
      // Optional: Add specific handling if needed, but logger usually covers it
    }
  }

  /**
   * Handle /clockout
   */
  private async handleClockOut(): Promise<void> {
    await telegramBot.sendMessage(telegramTemplates.processingClockOut);
    
    const hour = new Date().getHours();
    const shift = hour < 12 ? 'morning' : 'afternoon';
    const timecardId = attendanceService.getLatestTimecardId(shift);

    if (!timecardId) {
       await telegramBot.sendMessage(telegramTemplates.errorNoTimecard);
       return;
    }

    await attendanceService.clockOut({ timecardId });
  }

  /**
   * Handle /scheduler
   */
  private async handleSchedulerStatus(): Promise<void> {
    const status = schedulerService.getStatus();
    const config = status.config;
    
    if (!config) {
      await telegramBot.sendMessage(telegramTemplates.errorNoConfig);
      return;
    }

    await telegramBot.sendSchedulerStatus(status.isRunning, {
      morningIn: config.morning_clock_in,
      morningOut: config.morning_clock_out,
      afternoonIn: config.afternoon_clock_in,
      afternoonOut: config.afternoon_clock_out,
    });
  }

  private async handleErrors(): Promise<void> {
    const db = require('../database/sqlite.connection').db;
    const logs = db.prepare(`
      SELECT error_code, error_message, created_at
      FROM error_logs
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    if (logs.length === 0) {
      await telegramBot.sendMessage('✅ Không có lỗi nào được ghi nhận\\.');
      return;
    }

    let text = '❌ *LOG LỖI HỆ THỐNG*\n\n';
    logs.forEach((log: any) => {
      const time = new Date(log.created_at).toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit'
      });
      const escapeMarkdown = (str: string) => str.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
      text += `🔸 *${escapeMarkdown(log.error_code)}*\n`;
      text += `   ${escapeMarkdown(log.error_message.slice(0, 60))}\n`;
      text += `   ⏰ ${escapeMarkdown(time)}\n\n`;
    });

    await telegramBot.sendMessage(text);
  }

  /**
   * Handle /lt_projects - List Leantime projects
   */
  private async handleLeantimeProjects(): Promise<void> {
    // Get default Leantime user (first one found)
    const allCreds = leantimeCredentialsRepository.findAll();
    if (allCreds.length === 0) {
      await telegramBot.sendMessage('❌ Chưa đăng nhập Leantime\\. Dùng `/leantime_login` trước\\.');
      return;
    }

    const userId = allCreds[0].user_id;
    const service = new LeantimeProjectsService(userId);
    
    try {
      await telegramBot.sendMessage('🔄 Đang tải danh sách dự án\\.\\.\\.');
      const projects = await service.getMyProjects();

      if (projects.length === 0) {
        await telegramBot.sendMessage('ℹ️ Không có dự án nào\\.');
        return;
      }

      let text = `📂 *DANH SÁCH DỰ ÁN LEANTIME*\n`;
      text += `👤 User: \`${userId}\`\n\n`;

      projects.slice(0, 10).forEach((p: any, i: number) => {
        const name = this.escapeMarkdownLocal(p.name || 'Unnamed');
        text += `${i + 1}\\. *${name}* \\(ID: ${p.id}\\)\n`;
      });

      if (projects.length > 10) {
        text += `\n\\.\\.\\. và ${projects.length - 10} dự án khác`;
      }

      await telegramBot.sendMessage(text);
    } catch (error) {
      await telegramBot.sendMessage(`❌ Lỗi: ${(error as Error).message}`);
    }
  }

  /**
   * Handle /lt_tasks - List Leantime tasks with smart filtering
   * Usage: /lt_tasks <projectId> (REQUIRED)
   * 
   * Features:
   * - Requires project ID (use /lt_projects first to get IDs)
   * - Filters by active statuses: NEW, INPROCESS, REOPEN
   * - Sorts by priority: VERYHIGH > HIGH > MEDIUM > LOW
   * - Shows user context (logged-in account)
   */
  private async handleLeantimeTasks(args: string[]): Promise<void> {
    // Project ID is REQUIRED
    if (args.length === 0 || !args[0]) {
      await telegramBot.sendMessage(
        '❌ *Thiếu Project ID\\!*\n\n' +
        '📝 Cú pháp: `/lt_tasks <project_id> [type] [@userId|all]`\n\n' +
        '🔍 Type: `bug`, `task`, `story`, `feature`\n' +
        '👤 User: `@17` hoặc `all` \\(mặc định: tasks của bạn\\)\n\n' +
        '💡 VD: `/lt_tasks 5 bug @26` hoặc `/lt_tasks 5 all`'
      );
      return;
    }

    const projectId = parseInt(args[0], 10);
    if (isNaN(projectId)) {
      await telegramBot.sendMessage('❌ Project ID phải là số\\. VD: `/lt_tasks 16 bug`');
      return;
    }

    // Parse type filter and user filter from args
    let typeFilter: string | null = null;
    let userFilter: number | 'all' | null = null; // null = current user, 'all' = all users, number = specific user

    for (let i = 1; i < args.length; i++) {
      const arg = args[i]?.toLowerCase() || '';
      
      if (arg === 'all') {
        userFilter = 'all';
      } else if (arg.startsWith('@')) {
        const targetUserId = parseInt(arg.slice(1), 10);
        if (!isNaN(targetUserId)) {
          userFilter = targetUserId;
        }
      } else if (['bug', 'task', 'story', 'feature', 'idea'].includes(arg)) {
        typeFilter = arg;
      }
    }

    const allCreds = leantimeCredentialsRepository.findAll();
    if (allCreds.length === 0) {
      await telegramBot.sendMessage('❌ Chưa đăng nhập Leantime\\. Dùng `/leantime_login` trước\\.');
      return;
    }

    const userId = allCreds[0].user_id;
    const service = new LeantimeTasksService(userId);

    // Done status codes to exclude
    const DONE_STATUSES = [0, -1];

    try {
      // Build loading message
      let loadingMsg = '🔄 Đang tải tasks';
      if (typeFilter) loadingMsg += ` \\(type: ${typeFilter}\\)`;
      loadingMsg += '\\.\\.\\.'
      await telegramBot.sendMessage(loadingMsg);
      
      // Fetch all tasks for this project
      const filters: any = { projectId };
      const allTasks = await service.getAllTasks(filters);

      if (allTasks.length === 0) {
        await telegramBot.sendMessage('ℹ️ Không có task nào trong project này\\.');
        return;
      }

      // Step 1: Filter by active status (exclude Done/Archived)
      let filteredTasks = allTasks.filter((t: any) => {
        const statusNum = typeof t.status === 'number' ? t.status : parseInt(t.status, 10);
        return !isNaN(statusNum) && !DONE_STATUSES.includes(statusNum);
      });

      // Step 2: Filter by type if specified
      if (typeFilter) {
        filteredTasks = filteredTasks.filter((t: any) => {
          const taskType = (t.type || '').toLowerCase();
          return taskType === typeFilter;
        });
      }

      // Step 3: Filter by assigned user based on userFilter
      // userFilter: null = current user, 'all' = no filter, number = specific user ID
      const usersService = new LeantimeUsersService(userId);
      const leantimeUserId = await usersService.getUserIdByEmail(userId);
      
      let targetUserId: number | null = null;
      if (userFilter === 'all') {
        // Show all users - no filtering
        targetUserId = null;
      } else if (typeof userFilter === 'number') {
        // Specific user ID
        targetUserId = userFilter;
      } else {
        // Default: current logged-in user
        targetUserId = leantimeUserId;
      }

      if (targetUserId !== null) {
        filteredTasks = filteredTasks.filter((t: any) => {
          const editorId = typeof t.editorId === 'number' ? t.editorId : parseInt(t.editorId, 10);
          return editorId === targetUserId;
        });
      }

      // Step 4: Sort by priority (highest first)
      const sortedTasks = filteredTasks.sort((a: any, b: any) => {
        const priorityA = parseInt(a.priority || '0', 10);
        const priorityB = parseInt(b.priority || '0', 10);
        return priorityB - priorityA;
      });

      if (sortedTasks.length === 0) {
        const msg = typeFilter 
          ? `ℹ️ Không có ${typeFilter} nào đang active trong project ${projectId}\\.`
          : `ℹ️ Không có task active nào trong project ${projectId}\\.`;
        await telegramBot.sendMessage(msg);
        return;
      }

      // Get project name from first task (all tasks have same projectName)
      const projectName = sortedTasks[0]?.projectName || `Project ${projectId}`;

      // Build output message in HTML mode
      let text = `📋 <b>TASKS - ${this.escapeHtml(projectName)}</b>\n`;
      
      // Show user filter info
      if (userFilter === 'all') {
        text += `👤 Filter: ALL users\n`;
      } else if (typeof userFilter === 'number') {
        text += `👤 Filter: User ID @${userFilter}\n`;
      } else {
        text += `👤 User: <code>${this.escapeHtml(userId)}</code> (ID: ${leantimeUserId || 'N/A'})\n`;
      }
      
      if (typeFilter) {
        text += `🔍 Type: ${getTypeEmoji(typeFilter)} ${typeFilter}\n`;
      }
      text += `📊 Showing: ${Math.min(sortedTasks.length, 50)} / ${sortedTasks.length} active tasks\n\n`;

      // Display tasks (max 50)
      const MAX_TASKS = 50;
      sortedTasks.slice(0, MAX_TASKS).forEach((t: any, i: number) => {
        const headline = this.escapeHtml((t.headline || 'Untitled').slice(0, 45));
        const priorityEmoji = getPriorityEmoji(t.priority);
        const statusEmoji = getStatusEmoji(t.status);
        const typeEmoji = getTypeEmoji(t.type);
        const deadline = t.dateToFinish && t.dateToFinish !== '0000-00-00 00:00:00' 
          ? ` 📅${t.dateToFinish.slice(0, 10)}` 
          : '';

        text += `${i + 1}. ${typeEmoji}${statusEmoji}${priorityEmoji} <b>${headline}</b>${deadline}\n`;
        text += `   ID:<code>${t.id}</code> /lt_task ${t.id} /lt_done ${t.id}\n`;
      });

      if (sortedTasks.length > MAX_TASKS) {
        text += `\n... và ${sortedTasks.length - MAX_TASKS} tasks khác`;
      }

      text += `\n\n💡 Tip: /lt_done &lt;id&gt; để đánh dấu hoàn thành`;

      await telegramBot.sendMessage(text, { parseMode: 'HTML' });
    } catch (error) {
      await telegramBot.sendMessage(`❌ Lỗi: ${(error as Error).message}`);
    }
  }

  /**
   * Handle /lt_task <id> - Get task details
   */
  private async handleLeantimeTaskDetail(args: string[]): Promise<void> {
    if (args.length === 0) {
      await telegramBot.sendMessage('❌ Cú pháp: `/lt_task <task_id>`');
      return;
    }

    const allCreds = leantimeCredentialsRepository.findAll();
    if (allCreds.length === 0) {
      await telegramBot.sendMessage('❌ Chưa đăng nhập Leantime\\. Dùng `/leantime_login` trước\\.');
      return;
    }

    const taskId = parseInt(args[0], 10);
    if (isNaN(taskId)) {
      await telegramBot.sendMessage('❌ Task ID phải là số\\.');
      return;
    }

    const userId = allCreds[0].user_id;
    const service = new LeantimeTasksService(userId);

    try {
      await telegramBot.sendMessage('🔄 Đang tải chi tiết task\\.\\.\\.');
      const task = await service.getTask(taskId);

      if (!task) {
        await telegramBot.sendMessage('❌ Không tìm thấy task\\.');
        return;
      }

      const headline = this.escapeMarkdownLocal(task.headline || 'Untitled');
      const statusLabel = getStatusLabel(task.status || 0);
      const statusEmoji = getStatusEmoji(task.status || 0);
      const priorityLabel = task.priority ? `Priority ${task.priority}` : 'N/A';
      const priorityEmoji = getPriorityEmoji(task.priority || 0);
      const typeEmoji = getTypeEmoji((task as any).type || 'task');
      const projectName = (task as any).projectName || `Project ${task.projectId}`;
      
      // Clean description: remove HTML tags, JSON data, and decode entities
      const cleanedDesc = cleanHtmlDescription(task.description || '');

      // ═══════════════════════════════════════════
      // CLEAN MINIMAL LAYOUT (UI Styling Skill)
      // Principles: Visual hierarchy, Consistent spacing, Minimal clutter
      // ═══════════════════════════════════════════
      
      // ▸ TITLE
      let text = `${typeEmoji} *${headline}*\n\n`;
      
      // ▸ META INFO (key: value pairs, minimal)
      text += `📂 ${this.escapeMarkdownLocal(projectName)}  •  🆔 \`${task.id}\`\n`;
      text += `${statusEmoji} ${statusLabel}  •  ${priorityEmoji} ${priorityLabel}`;
      if (task.editorId) text += `  •  👤 @${task.editorId}`;
      text += `\n`;
      
      // ▸ DEADLINE (if exists)
      if (task.dateToFinish && task.dateToFinish !== '0000-00-00 00:00:00') {
        const deadline = task.dateToFinish.slice(0, 10);
        const isOverdue = new Date(deadline) < new Date();
        const deadlineEmoji = isOverdue ? '⏰' : '📅';
        const deadlineStyle = isOverdue ? '*QUÁH HẠN*' : '';
        text += `${deadlineEmoji} ${deadline} ${deadlineStyle}\n`;
      }
      
      // ▸ SEPARATOR
      text += `\n─────────────────────\n\n`;
      
      // ▸ DESCRIPTION
      text += `📝 *Mô tả:*\n`;
      if (cleanedDesc.text && cleanedDesc.text !== 'Không có mô tả chi tiết') {
        // Show description as plain text (not code block for better readability)
        const escapedDesc = this.escapeMarkdownLocal(cleanedDesc.text);
        text += `${escapedDesc}\n`;
      } else {
        text += `_Không có mô tả_\n`;
      }
      
      // ▸ ATTACHMENTS (if any)
      if (cleanedDesc.attachments.length > 0) {
        text += `\n🖼️ ${cleanedDesc.attachments.length} file đính kèm\n`;
      }
      
      // ▸ ACTIONS (compact inline)
      text += `\n─────────────────────\n`;
      text += `✅ /lt\\_done ${task.id}  •  📋 /lt\\_tasks ${task.projectId}`;

      await telegramBot.sendMessage(text);
    } catch (error) {
      await telegramBot.sendMessage(`❌ Lỗi: ${(error as Error).message}`);
    }
  }

  /**
   * Handle /lt_done <task_id> - Mark task as Done
   * Changes task status to 0 (Done)
   */
  private async handleLeantimeMarkDone(args: string[]): Promise<void> {
    if (args.length === 0) {
      await telegramBot.sendMessage(LEANTIME_MESSAGES.MISSING_DEPLOY_TASK_ID);
      return;
    }

    const taskId = parseInt(args[0], 10);
    if (isNaN(taskId)) {
      await telegramBot.sendMessage(LEANTIME_MESSAGES.INVALID_TASK_ID);
      return;
    }

    const allCreds = leantimeCredentialsRepository.findAll();
    if (allCreds.length === 0) {
      await telegramBot.sendMessage(LEANTIME_MESSAGES.NOT_LOGGED_IN);
      return;
    }

    const userId = allCreds[0].user_id;
    const service = new LeantimeTasksService(userId);

    try {
      await telegramBot.sendMessage(LEANTIME_MESSAGES.LOADING_UPDATE_STATUS);
      
      // Update task status to Done (0)
      await service.updateTaskStatus(taskId, LEANTIME_STATUS.DONE.toString());
      
      // Send success message
      const successMsg = `✅ Task \\#${taskId} đã được chuyển sang trạng thái *Done*\\!\n\n` +
        `💡 Xem lại chi tiết: /lt\\_task ${taskId}`;
      await telegramBot.sendMessage(successMsg);
      
    } catch (error) {
      await telegramBot.sendMessage(`❌ Lỗi khi cập nhật task: ${(error as Error).message}`);
    }
  }

  /**
   * Handle /lt_users - List users (from Leantime)
   * Usage: /lt_users
   */
  private async handleLeantimeUsers(args: string[]): Promise<void> {
    const allCreds = leantimeCredentialsRepository.findAll();
    if (allCreds.length === 0) {
      await telegramBot.sendMessage(LEANTIME_MESSAGES.NOT_LOGGED_IN);
      return;
    }

    const userId = allCreds[0].user_id;
    const usersService = new LeantimeUsersService(userId);

    try {
      await telegramBot.sendMessage('🔄 Đang tải danh sách users\\.\\.\\.');
      
      const users = await usersService.getAllUsers();
      
      if (users.length === 0) {
        await telegramBot.sendMessage('ℹ️ Không có user nào\\.');
        return;
      }

      // Get current user's Leantime ID
      const myLeantimeId = await usersService.getUserIdByEmail(userId);

      let text = `👥 *DANH SÁCH USERS LEANTIME*\n`;
      text += `📊 Tổng: ${users.length} users\n\n`;

      // Display users (max 30)
      const MAX_USERS = 30;
      users.slice(0, MAX_USERS).forEach((u: any, i: number) => {
        const name = this.escapeMarkdownLocal(
          `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.username || 'Unknown'
        );
        const email = u.username || u.email || '';
        const isMe = u.id === myLeantimeId;
        const meIndicator = isMe ? ' ⭐' : '';
        
        text += `${i + 1}\\. *${name}*${meIndicator}\n`;
        text += `   ID: \`${u.id}\` \\| ${this.escapeMarkdownLocal(email)}\n`;
      });

      if (users.length > MAX_USERS) {
        text += `\n\\.\\.\\. và ${users.length - MAX_USERS} users khác`;
      }

      text += `\n\n💡 Dùng ID để filter tasks: \`/lt_tasks 5 bug @17\``;

      await telegramBot.sendMessage(text);
    } catch (error) {
      await telegramBot.sendMessage(`❌ Lỗi: ${(error as Error).message}`);
    }
  }

  /**
   * Handle /lt_today - Show tasks completed today
   * Usage: /lt_today [projectId]
   */
  private async handleLeantimeToday(args: string[]): Promise<void> {
    const allCreds = leantimeCredentialsRepository.findAll();
    if (allCreds.length === 0) {
      await telegramBot.sendMessage(LEANTIME_MESSAGES.NOT_LOGGED_IN);
      return;
    }

    const userId = allCreds[0].user_id;
    const service = new LeantimeTasksService(userId);
    const usersService = new LeantimeUsersService(userId);

    // Optional project filter
    const projectId = args[0] ? parseInt(args[0], 10) : undefined;
    console.log(`[LT_TODAY] Started for user ${userId}, projectId: ${projectId}`);
    
    try {
      await telegramBot.sendMessage('🔄 Đang tải tasks done hôm nay\\.\\.\\.');
      
      // Get logged-in user's Leantime ID
      const leantimeUserId = await usersService.getUserIdByEmail(userId);
      console.log(`[LT_TODAY] Leantime User ID: ${leantimeUserId}`);
      
      // projectId is required for getAllTasks API - if not provided, use default project
      let targetProjectId = projectId;
      if (!targetProjectId) {
        console.log('[LT_TODAY] No project ID provided, fetching all projects...');
        const projectsService = new LeantimeProjectsService(userId);
        const projects = await projectsService.getAllProjects();
        console.log(`[LT_TODAY] Found ${projects.length} projects`);

        if (projects.length === 0) {
          await telegramBot.sendMessage('❌ Không có project nào\\. Cần tham gia project trước\\.');
          return;
        }
        await telegramBot.sendMessage(
          `💡 *Tip:* Dùng \`/lt\\_today projectId\` để filter\\.\n` +
          `VD: \`/lt\\_today 5\`\n\n` +
          `📂 Đang load từ ${projects.length} projects\\.\\.\\.`
        );
        
        // Get tasks from all projects
        const allTasks: any[] = [];
        for (const project of projects.slice(0, 5)) {
          try {
            console.log(`[LT_TODAY] Fetching tasks for project ${project.id}...`);
            const tasks = await service.getAllTasks({ projectId: project.id });
            console.log(`[LT_TODAY] Project ${project.id} returned ${tasks.length} tasks`);
            allTasks.push(...tasks);
          } catch (e) {
            console.error(`[LT_TODAY] Failed to fetch project ${project.id}:`, e);
          }
        }
        
        console.log(`[LT_TODAY] Total tasks fetched: ${allTasks.length}`);
        return await this.processLtTodayTasks(allTasks, leantimeUserId, userId);
      }
      
      // Fetch tasks from specific project
      console.log(`[LT_TODAY] Fetching tasks for specific project ${targetProjectId}...`);
      const allTasks = await service.getAllTasks({ projectId: targetProjectId });
      console.log(`[LT_TODAY] Specific project returned ${allTasks.length} tasks`);
      await this.processLtTodayTasks(allTasks, leantimeUserId, userId);
      
    } catch (error) {
      console.error('[LT_TODAY] Error:', error);
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        await telegramBot.sendMessage('❌ Session hết hạn\\. Vui lòng `/leantime\\_login` lại\\.');
      } else {
        await telegramBot.sendMessage(`❌ Lỗi: ${escapeMarkdown(errorMsg)}`);
      }
    }
  }

  /**
   * Process and display tasks done today
   */
  /**
   * Process and display tasks done today
   */
  private async processLtTodayTasks(allTasks: any[], leantimeUserId: number | null, userId: string): Promise<void> {
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    
    console.log(`[LT_TODAY] Processing ${allTasks.length} tasks for user ${leantimeUserId} (${userId})`);

    // Check if 'dateModified' exists in the first task to decide if we can filter by date
    const hasDateModified = allTasks.length > 0 && ('dateModified' in allTasks[0] || 'modified' in allTasks[0]);
    console.log(`[LT_TODAY] API provides modification date? ${hasDateModified ? 'YES' : 'NO'}`);
    
    // Filter tasks
    const relevantTasks = allTasks.filter((t: any) => {
      // 1. Check Status (Done = 0, or label contains 'Done'/'Finish'/'Complete')
      // Note: Leantime status 0 is typically 'Done' or 'Finished' depending on config.
      const statusNum = typeof t.status === 'number' ? t.status : parseInt(t.status, 10);
      
      // Fallback: Check status label if available
      const statusLabel = (t.statusLabel || '').toLowerCase();
      const isDone = statusNum === 0 || 
                     statusLabel.includes('done') || 
                     statusLabel.includes('finish') ||
                     statusLabel.includes('complete') ||
                     statusLabel.includes('deploy'); // User sample showed 'Deployed'

      // 2. Check User (Helper)
      // editorId is String in API usually
      const editorId = typeof t.editorId === 'number' ? t.editorId : parseInt(t.editorId, 10);
      const isMine = !leantimeUserId || editorId === leantimeUserId;

      // 3. Check Date (Only if available)
      let isToday = true;
      if (hasDateModified) {
        const modified = (t.dateModified || t.modified || '').slice(0, 10);
        isToday = modified === todayStr;
      }

      return isDone && isMine && isToday;
    });

    console.log(`[LT_TODAY] Found ${relevantTasks.length} matched tasks.`);

    // Build output in HTML mode (simpler escaping)
    let text = hasDateModified ? `✅ <b>TASKS DONE HÔM NAY</b>\n` : `✅ <b>TASKS HOÀN THÀNH (Mới nhất)</b>\n`;
    text += `📅 ${todayStr}\n`;
    text += `👤 ${this.escapeHtml(userId)}\n`;
    if (!hasDateModified) text += `⚠️ <i>API không trả về ngày sửa, hiển thị tasks mới nhất</i>\n`;
    text += `\n`;
    
    if (relevantTasks.length === 0) {
      text += `<i>Chưa tìm thấy task nào phù hợp</i>\n\n`;
      text += `💡 Tip: Kiểm tra lại status hoặc assignment\n`;
      text += `💪 Cố lên nhé!`;
    } else {
      text += `🎉 <b>${relevantTasks.length} tasks hoàn thành!</b>\n\n`;
      
      // Sort by ID descending (proxy for recency) if date is missing
      relevantTasks.sort((a: any, b: any) => b.id - a.id);

      relevantTasks.slice(0, 20).forEach((t: any, i: number) => {
        const headline = this.escapeHtml((t.headline || 'Untitled').slice(0, 40));
        const typeEmoji = getTypeEmoji((t.type || 'task').toLowerCase());
        const projectName = t.projectName ? ` (${this.escapeHtml(t.projectName)})` : '';
        const statusInfo = t.statusLabel ? ` <i>(${this.escapeHtml(t.statusLabel)})</i>` : '';
        
        text += `${i + 1}. ${typeEmoji} ${headline}${projectName}${statusInfo}\n`;
      });
      
      if (relevantTasks.length > 20) {
        text += `... và ${relevantTasks.length - 20} tasks khác`;
      }
      
      text += `\n\n🔥 Great job!`;
    }

    await telegramBot.sendMessage(text, { parseMode: 'HTML' });
  }
  // NOTE: escapeMarkdown and cleanHtmlDescription are now imported from text-utils.ts
  // Following SOLID principle: Single Responsibility
  
  /**
   * Escape special characters for MarkdownV2 (wrapper for backward compatibility)
   */
  private escapeMarkdownLocal(str: string): string {
    return escapeMarkdown(str);
  }

  /**
   * Escape special characters for HTML mode
   */
  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

// Singleton instance (triggers registration)
export const telegramCommandsHandler = new TelegramCommandsHandler();
