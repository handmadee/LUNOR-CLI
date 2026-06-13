
import { attendanceService } from '../src/modules/attendance/services/attendance.service';
import { teamsApiService } from '../src/modules/attendance/services/teams-api.service';
import { attendanceLogRepository } from '../src/modules/attendance/repositories/attendance-log.repository';
import { authService } from '../src/modules/auth/services/auth.service';
import { ClockInDto } from '../src/modules/attendance/dto';

jest.mock('../src/modules/attendance/services/teams-api.service');
jest.mock('../src/modules/attendance/repositories/attendance-log.repository');
jest.mock('../src/modules/auth/services/auth.service');
jest.mock('../src/core/logger');

describe('AttendanceService', () => {
  const mockDto: ClockInDto = {
    shift: 'morning',
    isAtApprovedLocation: true,
  };

  const mockTimecard = {
    id: 'tc-123',
    userId: 'user-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clockIn', () => {
    it('should clock in successfully', async () => {
      (authService.getCredentials as jest.Mock).mockReturnValue({
        userId: 'user-1',
        accessToken: 'token',
        teamId: 'team-1',
      });

      (teamsApiService.clockIn as jest.Mock).mockResolvedValue({
        success: true,
        item: mockTimecard,
        timecardId: 'tc-123'
      });

      const result = await attendanceService.clockIn(mockDto);

      expect(result.success).toBe(true);
      expect(teamsApiService.clockIn).toHaveBeenCalled();
      expect(attendanceLogRepository.create).toHaveBeenCalled();
    });

    it('should return error if no credentials', async () => {
      (authService.getCredentials as jest.Mock).mockReturnValue(null);

      await expect(attendanceService.clockIn(mockDto))
        .rejects
        .toThrow('No credentials configured');
    });

    it('should handle MS Teams API error', async () => {
      (authService.getCredentials as jest.Mock).mockReturnValue({
        userId: 'user-1',
        accessToken: 'token',
      });

      (teamsApiService.clockIn as jest.Mock).mockResolvedValue({
        success: false,
        error: 'API Error'
      });

      const result = await attendanceService.clockIn(mockDto);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
    });
  });
});
