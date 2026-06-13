import { db } from '../../../infrastructure/database/sqlite.connection';
import { ShiftType, AttendanceType, AttendanceStatus } from '../../../core/constants/app.constants';

/**
 * Attendance Log Entity
 */
export interface AttendanceLogEntity {
  id: number;
  type: AttendanceType;
  shift: ShiftType;
  timecard_id: string | null;
  status: AttendanceStatus;
  response: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * DTO for creating attendance log
 */
export interface CreateAttendanceLogDto {
  type: AttendanceType;
  shift: ShiftType;
  timecardId?: string;
  status: AttendanceStatus;
  response?: string;
  errorMessage?: string;
}

/**
 * Query options for attendance logs
 */
export interface AttendanceLogQuery {
  date?: string;
  type?: AttendanceType;
  shift?: ShiftType;
  status?: AttendanceStatus;
  limit?: number;
  offset?: number;
}

/**
 * Attendance Log Repository
 * 
 * Handles persistence for attendance logs.
 */
class AttendanceLogRepository {
  /**
   * Create new attendance log
   */
  create(dto: CreateAttendanceLogDto): AttendanceLogEntity {
    const stmt = db.prepare(`
      INSERT INTO attendance_logs (type, shift, timecard_id, status, response, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      dto.type,
      dto.shift,
      dto.timecardId ?? null,
      dto.status,
      dto.response ?? null,
      dto.errorMessage ?? null
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * Find log by ID
   */
  findById(id: number): AttendanceLogEntity | null {
    const stmt = db.prepare('SELECT * FROM attendance_logs WHERE id = ?');
    return (stmt.get(id) as AttendanceLogEntity) ?? null;
  }

  /**
   * Find logs with filters
   */
  findAll(query: AttendanceLogQuery = {}): AttendanceLogEntity[] {
    const { limit = 50, offset = 0, date, type, shift, status } = query;

    let sql = 'SELECT * FROM attendance_logs WHERE 1=1';
    const params: (string | number)[] = [];

    if (date) {
      sql += ' AND DATE(created_at) = ?';
      params.push(date);
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (shift) {
      sql += ' AND shift = ?';
      params.push(shift);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(sql);
    return stmt.all(...params) as AttendanceLogEntity[];
  }

  /**
   * Find today's logs
   */
  findToday(): AttendanceLogEntity[] {
    const today = new Date().toISOString().split('T')[0];
    return this.findAll({ date: today });
  }

  /**
   * Get latest timecard ID for a shift
   */
  getLatestTimecardId(shift?: ShiftType): string | null {
    const today = new Date().toISOString().split('T')[0];
    
    let sql = `
      SELECT timecard_id FROM attendance_logs 
      WHERE DATE(created_at) = ? 
        AND type = 'clock_in' 
        AND status = 'success'
        AND timecard_id IS NOT NULL
    `;
    const params: string[] = [today];

    if (shift) {
      sql += ' AND shift = ?';
      params.push(shift);
    }

    sql += ' ORDER BY created_at DESC LIMIT 1';

    const stmt = db.prepare(sql);
    const row = stmt.get(...params) as { timecard_id: string } | undefined;
    return row?.timecard_id ?? null;
  }

  /**
   * Count logs by date
   */
  countByDate(date: string): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM attendance_logs WHERE DATE(created_at) = ?');
    const result = stmt.get(date) as { count: number };
    return result.count;
  }
}

// Singleton instance
export const attendanceLogRepository = new AttendanceLogRepository();
