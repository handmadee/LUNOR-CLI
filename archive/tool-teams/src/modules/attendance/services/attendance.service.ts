import { logger } from '../../../core/logger';
import { authService, DecryptedCredentials } from '../../auth/services/auth.service';
import {
  AttendanceLogQuery,
  AttendanceResult,
  ClockInDto,
  ClockOutDto,
  ShiftType
} from '../dto';
import { AttendanceLogEntity, attendanceLogRepository, CreateAttendanceLogDto } from '../repositories/attendance-log.repository';
import { teamsApiService, ClockResult } from './teams-api.service';
import { graphApiService, GraphClockResult } from './graph-api.service';
import { teamsAutoReauthService } from '../../auth/services/teams-auto-reauth.service';
import { analyzeToken } from '../../auth/utils/token-diagnostics';

/**
 * API Mode Configuration
 */
type ApiMode = 'graph' | 'internal' | 'auto';

/**
 * Attendance Service
 * 
 * Business logic for attendance operations.
 * Uses Repository Pattern and delegates API calls to TeamsApiService or GraphApiService.
 * 
 * API Selection (mode: auto):
 * - Detects token audience and routes to appropriate API
 * - Graph API: https://graph.microsoft.com tokens
 * - Internal API: staffhub.office.com / Teams Shifts app ID tokens
 * 
 * Auto-refreshes token on 401/403 errors using Strategy Pattern (SOLID - DIP).
 */
class AttendanceService {
  private apiMode: ApiMode = 'auto';

  constructor() {
    // Setup token refresh callback for both services
    const refreshCallback = async () => {
      const result = await teamsAutoReauthService.refresh('default');
      return result.success ? (result.accessToken ?? null) : null;
    };

    teamsApiService.setTokenRefreshCallback(refreshCallback);
    graphApiService.setTokenRefreshCallback(refreshCallback);
  }

  /**
   * Set API mode
   */
  setApiMode(mode: ApiMode): void {
    this.apiMode = mode;
    logger.info(`Attendance API mode set to: ${mode}`);
  }

  /**
   * Determine which API to use based on token audience
   */
  private selectApi(token: string): 'graph' | 'internal' {
    if (this.apiMode !== 'auto') {
      return this.apiMode === 'graph' ? 'graph' : 'internal';
    }

    const tokenInfo = analyzeToken(token);
    const audience = tokenInfo.audience;

    // Check for StaffHub API token (BEST for internal clock-in/out)
    if (audience?.includes('staffhub.office.com') ||
        audience?.includes('api.manage.staffhub') ||
        audience === 'aa580612-c342-4ace-9055-8edee43ccb89') {
      logger.info(`[AttendanceService] Using Internal API (StaffHub token audience: ${audience})`);
      return 'internal';
    }

    // Check for Graph API token
    if (audience === 'https://graph.microsoft.com' || 
        audience === '00000003-0000-0000-c000-000000000000') {
      logger.info(`[AttendanceService] Using Graph API (token audience: ${audience})`);
      return 'graph';
    }

    // Default to internal API for unknown audiences
    logger.info(`[AttendanceService] Using Internal API (fallback, token audience: ${audience})`);
    return 'internal';
  }

  /**
   * Clock In operation with auto-retry and API selection
   */
  async clockIn(dto: ClockInDto = {}): Promise<AttendanceResult> {
    const credentials = this.getCredentialsOrThrow();
    const shift = dto.shift || this.getCurrentShift();
    
    // Select API based on token
    const apiType = this.selectApi(credentials.accessToken);
    
    let result: ClockResult | GraphClockResult;
    
    if (apiType === 'graph') {
      // Use Graph API
      result = await graphApiService.clockIn(
        credentials,
        dto.isAtApprovedLocation ?? true,
        dto.notes
      );
    } else {
      // Use Internal Shifts API
      result = await teamsApiService.clockIn(
        credentials,
        dto.isAtApprovedLocation ?? true
      );
    }

    // Get timecard ID (different property names for Graph vs Internal API)
    const timecardId = (result as GraphClockResult).timeCardId || (result as ClockResult).timecardId;

    // Log to database
    const logDto: CreateAttendanceLogDto = {
      type: 'clock_in',
      shift,
      timecardId,
      status: result.success ? 'success' : 'failed',
      response: result.success ? JSON.stringify(result.data) : undefined,
      errorMessage: result.error,
    };

    const log = attendanceLogRepository.create(logDto);

    // Send Telegram notification on success
    if (result.success && timecardId) {
      await logger.clockInSuccess(
        credentials.userObjectId || credentials.userId,
        shift,
        timecardId
      );
    }

    return {
      success: result.success,
      log,
      teamsResponse: result.data,
      error: result.error,
      needsReauth: result.needsReauth,
    };
  }

  /**
   * Clock Out operation with auto-retry and API selection
   */
  async clockOut(dto: ClockOutDto): Promise<AttendanceResult> {
    const credentials = this.getCredentialsOrThrow();
    const shift = dto.shift || this.getCurrentShift();

    // Select API based on token
    const apiType = this.selectApi(credentials.accessToken);
    
    let result: ClockResult | GraphClockResult;
    
    if (apiType === 'graph') {
      // Use Graph API
      result = await graphApiService.clockOut(
        credentials,
        dto.timecardId,
        dto.isAtApprovedLocation ?? true
      );
    } else {
      // Use Internal Shifts API
      result = await teamsApiService.clockOut(
        credentials,
        dto.timecardId,
        dto.isAtApprovedLocation ?? true
      );
    }

    // Log to database
    const logDto: CreateAttendanceLogDto = {
      type: 'clock_out',
      shift,
      timecardId: dto.timecardId,
      status: result.success ? 'success' : 'failed',
      response: result.success ? JSON.stringify(result.data) : undefined,
      errorMessage: result.error,
    };

    const log = attendanceLogRepository.create(logDto);

    // Send Telegram notification on success
    if (result.success) {
      await logger.clockOutSuccess(
        credentials.userObjectId || credentials.userId,
        shift,
        dto.timecardId
      );
    }

    return {
      success: result.success,
      log,
      teamsResponse: result.data,
      error: result.error,
      needsReauth: result.needsReauth,
    };
  }

  /**
   * Get current timecard status from MS Teams
   */
  async getStatus(): Promise<{ hasActiveTimecard: boolean; data?: unknown; error?: string }> {
    const credentials = this.getCredentialsOrThrow();
    const result = await teamsApiService.getTimecardStatus(credentials);

    return {
      hasActiveTimecard: result.success && Boolean(result.data),
      data: result.data,
      error: result.error,
    };
  }

  /**
   * Get attendance logs
   */
  getLogs(query: AttendanceLogQuery = {}): AttendanceLogEntity[] {
    return attendanceLogRepository.findAll(query);
  }

  /**
   * Get today's logs
   */
  getTodayLogs(): AttendanceLogEntity[] {
    return attendanceLogRepository.findToday();
  }

  /**
   * Get latest timecard ID
   */
  getLatestTimecardId(shift?: ShiftType): string | null {
    return attendanceLogRepository.getLatestTimecardId(shift);
  }

  /**
   * Determine current shift based on time
   */
  private getCurrentShift(): ShiftType {
    const hour = new Date().getHours();
    return hour < 12 ? 'morning' : 'afternoon';
  }

  /**
   * Get credentials or throw error
   */
  private getCredentialsOrThrow(): DecryptedCredentials {
    const credentials = authService.getCredentials();
    if (!credentials) {
      throw new Error('No credentials configured. Please save your MS Teams token first.');
    }
    return credentials;
  }
}

// Singleton instance
export const attendanceService = new AttendanceService();
