import { AttendanceLogEntity } from '../repositories/attendance-log.repository';

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
 * Clock In DTO
 */
export interface ClockInDto {
  shift?: ShiftType;
  isAtApprovedLocation?: boolean;
  notes?: string; // Optional notes for Graph API
}

/**
 * Clock Out DTO
 */
export interface ClockOutDto {
  timecardId: string;
  shift?: ShiftType;
  isAtApprovedLocation?: boolean;
}

/**
 * Attendance Result
 */
export interface AttendanceResult {
  success: boolean;
  timecardId?: string;
  teamsResponse?: unknown;
  error?: string;
  needsReauth?: boolean;
  log?: AttendanceLogEntity;
}

/**
 * Attendance Log DTO
 */
export interface AttendanceLogDto {
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
 * Scheduler config DTO
 */
export interface SchedulerConfigDto {
  isEnabled?: boolean;
  morningClockIn?: string;
  morningClockOut?: string;
  afternoonClockIn?: string;
  afternoonClockOut?: string;
}

/**
 * MS Teams Timecard response
 */
export interface TimecardResponse {
  timeClockEntry?: {
    id: string;
    userId: string;
    memberId: string;
    teamId: string;
    tenantId: string;
    clockInEvent?: {
      time: string;
      isAtApprovedLocation: boolean;
    };
    clockOutEvent?: {
      time: string;
      isAtApprovedLocation: boolean;
    };
    clockState: string;
  };
}
