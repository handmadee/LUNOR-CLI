/**
 * Date/time utilities for attendance operations
 */
export const dateUtil = {
  /**
   * Get current date in YYYY-MM-DD format
   */
  getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Get current time in HH:mm format
   */
  getCurrentTime(): string {
    return new Date().toTimeString().slice(0, 5);
  },

  /**
   * Check if current time is within a time range
   */
  isWithinRange(startTime: string, endTime: string): boolean {
    const now = dateUtil.getCurrentTime();
    return now >= startTime && now <= endTime;
  },

  /**
   * Determine current shift based on time
   */
  getCurrentShift(): 'morning' | 'afternoon' | null {
    const now = dateUtil.getCurrentTime();
    if (now >= '08:00' && now < '12:30') {
      return 'morning';
    }
    if (now >= '13:00' && now < '18:00') {
      return 'afternoon';
    }
    return null;
  },

  /**
   * Check if today is a weekday (Monday-Friday)
   */
  isWeekday(): boolean {
    const day = new Date().getDay();
    return day >= 1 && day <= 5;
  },

  /**
   * Format date for display
   */
  formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  },
};
