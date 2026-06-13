/**
 * Telegram Message Templates
 * 
 * Fun meme-style messages for LEO at HILAB.
 * Separate file following Single Responsibility Principle.
 */

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/**
 * Get current time in Vietnam timezone
 */
function getVietnameseTime(): string {
  return new Date().toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

/**
 * Telegram message templates
 */
export const telegramTemplates = {
  /**
   * Startup notification
   */
  startup: (): string => {
    const time = getVietnameseTime();
    return `
🚀 *HILAB Bot Started*
━━━━━━━━━━━━━━━━━
⏰ ${escapeMarkdown(time)}
📌 v2\\.0\\.0 • Ready

💡 Type /help for commands
`;
  },

  /**
   * Morning clock in success
   */
  morningClockIn: (timecardId: string): string => {
    const time = getVietnameseTime();
    return `
☀️ *ĐIỂM DANH SÁNG THÀNH CÔNG\\!*

Chào buổi sáng, Thượng Đế LEO\\! 👑

✅ Thượng đế đã đến công ty HILAB đúng giờ\\!
📍 Trạng thái: Đã check\\-in
⏰ Thời gian: ${escapeMarkdown(time)}
🎫 Timecard: \`${timecardId}\`

Chúc Thượng đế một ngày làm việc hiệu quả\\! 💪
`;
  },

  /**
   * Morning clock out success (lunch break)
   */
  morningClockOut: (timecardId: string): string => {
    const time = getVietnameseTime();
    return `
🍜 *NGHỈ TRƯA THÀNH CÔNG\\!*

Thượng đế LEO tới giờ nghỉ trưa rồi\\! 🍱

✅ Đã check\\-out buổi sáng
⏰ Thời gian: ${escapeMarkdown(time)}
🎫 Timecard: \`${timecardId}\`

Thượng đế nghỉ ngơi và nạp năng lượng đi nào\\! 😴🍔
`;
  },

  /**
   * Afternoon clock in success
   */
  afternoonClockIn: (timecardId: string): string => {
    const time = getVietnameseTime();
    return `
☕ *CHECK\\-IN BUỔI CHIỀU\\!*

Thượng đế LEO đã quay lại làm việc\\! 💼

✅ Buổi chiều đã bắt đầu
⏰ Thời gian: ${escapeMarkdown(time)}
🎫 Timecard: \`${timecardId}\`

Cố lên Thượng đế, chút nữa là được về rồi\\! 🏃‍♂️
`;
  },

  /**
   * Afternoon clock out success (end of day)
   */
  afternoonClockOut: (timecardId: string): string => {
    const time = getVietnameseTime();
    return `
🎉 *TAN LÀM THÀNH CÔNG\\!*

Thượng đế LEO xong việc rồi\\! 🎊

✅ Đã hoàn thành một ngày làm việc tại HILAB
⏰ Thời gian: ${escapeMarkdown(time)}
🎫 Timecard: \`${timecardId}\`

Thượng đế về nhà nghỉ ngơi thôi\\! Ngày mai lại chiến\\! 🏠😎
`;
  },

  /**
   * Error notification
   */
  error: (code: string, message: string, details?: string): string => {
    const time = getVietnameseTime();
    return `
🚨 *LỖI RỒI THƯỢNG ĐẾ ƠI\\!*

⚠️ Tool điểm danh HILAB gặp sự cố\\!

❌ Mã lỗi: \`${code}\`
📝 Chi tiết: ${escapeMarkdown(message)}
⏰ Thời gian: ${escapeMarkdown(time)}
${details ? `\n🔍 Details:\n\`\`\`\n${escapeMarkdown(details.slice(0, 500))}\n\`\`\`` : ''}

Đừng lo, tool sẽ tự retry\\! Nếu vẫn lỗi, kiểm tra lại token nhé\\! 🔧
`;
  },

  /**
   * Token refresh success
   */
  tokenRefreshed: (): string => {
    const time = getVietnameseTime();
    return `
🔄 *TOKEN ĐÃ REFRESH\\!*

Tool phát hiện token hết hạn và đã tự động làm mới\\!

✅ Token mới đã được lưu
⏰ Thời gian: ${escapeMarkdown(time)}

Thượng đế không cần làm gì, tool lo hết\\! 💪
`;
  },

  /**
   * Re-authentication required
   */
  reauthRequired: (): string => {
    const time = getVietnameseTime();
    return `
🔐 *CẦN ĐĂNG NHẬP LẠI\\!*

Token đã hết hạn và không thể refresh tự động\\!

⚠️ Thượng đế cần đăng nhập lại
⏰ Thời gian: ${escapeMarkdown(time)}

Gọi API: POST /api/auth/login
Hoặc vào browser lấy token mới\\! 🔑
`;
  },

  /**
   * Help command - Clean organized menu
   */
  helpCommand: (): string => {
    return `
📋 *HILAB BOT COMMANDS*
━━━━━━━━━━━━━━━━━

*📊 Leantime*
/leantime\\_login • Đăng nhập
/lt\\_projects • Xem dự án
/lt\\_tasks • Xem/filter tasks
/lt\\_task • Chi tiết task
/lt\\_done • Đánh dấu hoàn thành
/lt\\_today • Tasks done hôm nay
/lt\\_users • Danh sách users

*⏰ Chấm công*
/clockin • Check\\-in thủ công
/clockout • Check\\-out thủ công
/scheduler • Cấu hình lịch tự động

*🔧 Hệ thống*
/status • Trạng thái hệ thống
/account • Thông tin tài khoản
/login • Đăng nhập MS Teams
/logs • Lịch sử chấm công
/errors • Log lỗi hệ thống
`;
  },

  /**
   * System status
   */
  systemStatus: (userId: string, hasToken: boolean, hasCookies: boolean, isSchedulerRunning: boolean): string => {
    return `
📊 *SYSTEM STATUS*

👤 User: \`${escapeMarkdown(userId)}\`
🔑 Token: ${hasToken ? 'Active ✅' : 'Missing ❌'}
🍪 Cookies: ${hasCookies ? 'Active ✅' : 'Missing ❌'}

🤖 Scheduler: ${isSchedulerRunning ? 'Running 🟢' : 'Stopped 🔴'}
`;
  },

  /**
   * Account Info
   */
  accountInfo: (info: any): string => {
    return `
👤 *ACCOUNT INFORMATION*

📛 Name: *${escapeMarkdown(info.displayName || 'N/A')}*
🆔 User ID: \`${escapeMarkdown(info.userId)}\`
🏢 Tenant ID: \`${escapeMarkdown(info.tenantId || 'N/A')}\`
👥 Team ID: \`${escapeMarkdown(info.teamId)}\`
📱 Device ID: \`${escapeMarkdown(info.deviceId)}\`
📅 Created At: ${escapeMarkdown(new Date(info.createdAt).toLocaleString('vi-VN'))}
🔄 Last Updated: ${escapeMarkdown(new Date(info.updatedAt).toLocaleString('vi-VN'))}
`;
  },

  /**
   * Login Help
   */
  loginHelp: (): string => {
    return `
🔐 *HƯỚNG DẪN ĐĂNG NHẬP*

Để đăng nhập tự động qua Telegram, vui lòng gõ lệnh theo cú pháp:

\`/login <email> <password> [teamId]\`

Ví dụ:
\`/login leo@hilab\\.asia mypassword123\`

⚠️ *Lưu ý bảo mật:*
\\- Bot sẽ tự động xóa tin nhắn chứa mật khẩu của bạn ngay lập tức \\(nếu bot là admin\\)\\.
\\- Quá trình đăng nhập có thể mất 30\\-60 giây\\.
`;
  },

  /**
   * Login Start
   */
  loginStart: (email: string): string => {
    return `
🚀 *ĐANG ĐĂNG NHẬP...*

Bot đang thực hiện đăng nhập cho tài khoản: \`${escapeMarkdown(email)}\`
Vui lòng đợi trong giây lát... ⏳
`;
  },

  /**
   * Login Success
   */
  loginSuccess: (email: string): string => {
    return `
✅ *ĐĂNG NHẬP THÀNH CÔNG!*

Chào mừng \`${escapeMarkdown(email)}\` quay trở lại! 
Token và Cookies đã được lưu trữ an toàn. Tool đã sẵn sàng hoạt động! 
`;
  },

  /**
   * Login Failed
   */
  loginFailed: (error: string): string => {
    return `
❌ *ĐĂNG NHẬP THẤT BẠI*

Lỗi: ${escapeMarkdown(error)}

Vui lòng kiểm tra lại email/password hoặc thử lại sau.
`;
  },

  /**
   * Logs list
   */
  logsList: (logs: { type: string, shift: string, created_at: string, status: string, error_message?: string | null }[]): string => {
    let text = '📋 *LOGS HÔM NAY*\n\n';
    logs.forEach(log => {
      // Ensure UTC interpretation if 'Z' is missing
      const dateStr = log.created_at.endsWith('Z') ? log.created_at : `${log.created_at}Z`;
      const time = new Date(dateStr).toLocaleTimeString('vi-VN', { 
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit', 
        minute: '2-digit' 
      });

      const statusIcon = log.status === 'success' ? '✅' : '❌';
      const type = escapeMarkdown(log.type.toUpperCase());
      const shift = escapeMarkdown(log.shift);
      const timeEscaped = escapeMarkdown(time);
      
      text += `${statusIcon} *${type}* \\(${shift}\\) lúc ${timeEscaped}\n`;
      if (log.status === 'failed' && log.error_message) {
        text += `   Reason: ${escapeMarkdown(log.error_message.slice(0, 50))}\n`;
      }
    });
    return text;
  },

  /**
   * Generic messages
   */
  processingClockIn: '⏳ Đang xử lý Clock In\\.\\.\\.',
  processingClockOut: '⏳ Đang xử lý Clock Out\\.\\.\\.',
  errorNoTimecard: '❌ Không tìm thấy timecard active để clock out\\.',
  errorNoCredentials: '❌ Chưa có Credentials MS Teams\\. Vui lòng login\\.',
  logEmpty: '📭 Hôm nay chưa có log chấm công nào\\.',
  commandUnknown: '❓ Lệnh không hợp lệ\\. Gõ /help để xem danh sách lệnh\\.',
  errorNoConfig: '❌ Không tìm thấy cấu hình scheduler\\.',

  /**
   * Scheduler status
   */
  schedulerStatus: (isRunning: boolean, config: {
    morningIn: string;
    morningOut: string;
    afternoonIn: string;
    afternoonOut: string;
  }): string => {
    return `
📊 *TRẠNG THÁI SCHEDULER*

${isRunning ? '🟢' : '🔴'} Scheduler: ${isRunning ? 'Đang chạy' : 'Đã dừng'}

📅 Lịch điểm danh \\(Thứ 2 \\- Thứ 6\\):
  ☀️ Sáng vào: ${escapeMarkdown(config.morningIn)}
  🍜 Sáng ra: ${escapeMarkdown(config.morningOut)}
  ☕ Chiều vào: ${escapeMarkdown(config.afternoonIn)}
  🎉 Chiều ra: ${escapeMarkdown(config.afternoonOut)}

⚡ Thứ 7 và Chủ nhật: NGHỈ\\!
`;
  },
};

/**
 * Get appropriate template based on shift and action
 */
export function getClockTemplate(
  shift: 'morning' | 'afternoon',
  action: 'clock_in' | 'clock_out',
  timecardId: string
): string {
  if (shift === 'morning') {
    return action === 'clock_in' 
      ? telegramTemplates.morningClockIn(timecardId)
      : telegramTemplates.morningClockOut(timecardId);
  } else {
    return action === 'clock_in'
      ? telegramTemplates.afternoonClockIn(timecardId)
      : telegramTemplates.afternoonClockOut(timecardId);
  }
}
