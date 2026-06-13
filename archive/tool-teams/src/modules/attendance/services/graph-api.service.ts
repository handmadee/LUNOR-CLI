import axios, { AxiosInstance } from 'axios';
import { DecryptedCredentials } from '../../auth/services/auth.service';
import { logger } from '../../../core/logger/logger.service';

/**
 * Clock result interface
 */
export interface GraphClockResult {
  success: boolean;
  data?: any;
  error?: string;
  timeCardId?: string;
  needsReauth?: boolean;
}

/**
 * Valid token audiences for Microsoft Graph API
 */
const VALID_GRAPH_AUDIENCES = [
  'https://graph.microsoft.com',
  '00000003-0000-0000-c000-000000000000', // MS Graph App ID
];

/**
 * Microsoft Graph API Service for Shifts Operations
 * 
 * Uses Microsoft Graph API v1.0 for clock-in/clock-out operations.
 * This is the official/recommended way to interact with Teams Shifts.
 * 
 * Endpoints:
 * - Clock In: POST /teams/{teamId}/schedule/timeCards/clockIn
 * - Clock Out: POST /teams/{teamId}/schedule/timeCards/{timeCardId}/clockOut
 * 
 * @see https://learn.microsoft.com/en-us/graph/api/timecard-clockin
 * @see https://learn.microsoft.com/en-us/graph/api/timecard-clockout
 */
class GraphApiService {
  private client: AxiosInstance;
  private tokenRefreshCallback: (() => Promise<string | null>) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Set token refresh callback for auto-retry
   */
  setTokenRefreshCallback(callback: () => Promise<string | null>): void {
    this.tokenRefreshCallback = callback;
  }

  /**
   * Validate if token has correct audience for Graph API
   */
  private validateGraphToken(token: string): { valid: boolean; reason?: string; audience?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, reason: 'Invalid JWT format' };
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const audience = payload.aud;

      const isValid = VALID_GRAPH_AUDIENCES.some(
        validAud => audience === validAud || audience?.includes(validAud)
      );

      if (!isValid) {
        return {
          valid: false,
          audience,
          reason: `Token audience "${audience}" is not valid for Microsoft Graph API. Expected: ${VALID_GRAPH_AUDIENCES[0]}`,
        };
      }

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { valid: false, audience, reason: 'Token has expired' };
      }

      return { valid: true, audience };
    } catch (error) {
      return { valid: false, reason: 'Failed to parse token' };
    }
  }

  /**
   * Get clean team ID (without TEAM_ prefix for Graph API)
   */
  private getCleanTeamId(teamId: string): string {
    return teamId.replace(/^TEAM_/i, '');
  }

  /**
   * Clock In using Microsoft Graph API
   * 
   * POST /teams/{teamId}/schedule/timeCards/clockIn
   */
  async clockIn(
    credentials: DecryptedCredentials,
    isAtApprovedLocation: boolean = true,
    notes?: string,
    retryCount: number = 0
  ): Promise<GraphClockResult> {
    const teamId = this.getCleanTeamId(credentials.teamId);

    // Validate token first
    const tokenValidation = this.validateGraphToken(credentials.accessToken);
    if (!tokenValidation.valid) {
      logger.warn(`Graph API token validation failed: ${tokenValidation.reason}`);
      
      if (retryCount === 0 && this.tokenRefreshCallback) {
        return this.handleRefreshAndRetry(
          credentials,
          (newCreds) => this.clockIn(newCreds, isAtApprovedLocation, notes, retryCount + 1)
        );
      }
      
      return {
        success: false,
        error: tokenValidation.reason,
        needsReauth: true,
      };
    }

    try {
      logger.info(`[GraphAPI] Clock In - TeamID: ${teamId}`);

      const response = await this.client.post(
        `/teams/${teamId}/schedule/timeCards/clockIn`,
        {
          isAtApprovedLocation,
          ...(notes && {
            notes: {
              content: notes,
              contentType: 'text',
            },
          }),
        },
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        }
      );

      const timeCardId = response.data?.id;
      logger.info(`[GraphAPI] Clock In success - TimeCard: ${timeCardId}`);

      return {
        success: true,
        data: response.data,
        timeCardId,
      };
    } catch (error: any) {
      return this.handleError(error, 'clockIn', credentials, retryCount, (newCreds) =>
        this.clockIn(newCreds, isAtApprovedLocation, notes, retryCount + 1)
      );
    }
  }

  /**
   * Clock Out using Microsoft Graph API
   * 
   * POST /teams/{teamId}/schedule/timeCards/{timeCardId}/clockOut
   */
  async clockOut(
    credentials: DecryptedCredentials,
    timeCardId: string,
    isAtApprovedLocation: boolean = true,
    notes?: string,
    retryCount: number = 0
  ): Promise<GraphClockResult> {
    const teamId = this.getCleanTeamId(credentials.teamId);

    const tokenValidation = this.validateGraphToken(credentials.accessToken);
    if (!tokenValidation.valid) {
      logger.warn(`Graph API token validation failed: ${tokenValidation.reason}`);
      
      if (retryCount === 0 && this.tokenRefreshCallback) {
        return this.handleRefreshAndRetry(
          credentials,
          (newCreds) => this.clockOut(newCreds, timeCardId, isAtApprovedLocation, notes, retryCount + 1)
        );
      }
      
      return {
        success: false,
        error: tokenValidation.reason,
        needsReauth: true,
      };
    }

    try {
      logger.info(`[GraphAPI] Clock Out - TeamID: ${teamId}, TimeCard: ${timeCardId}`);

      const response = await this.client.post(
        `/teams/${teamId}/schedule/timeCards/${timeCardId}/clockOut`,
        {
          isAtApprovedLocation,
          ...(notes && {
            notes: {
              content: notes,
              contentType: 'text',
            },
          }),
        },
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        }
      );

      logger.info(`[GraphAPI] Clock Out success - TimeCard: ${timeCardId}`);

      return {
        success: true,
        data: response.data,
        timeCardId,
      };
    } catch (error: any) {
      return this.handleError(error, 'clockOut', credentials, retryCount, (newCreds) =>
        this.clockOut(newCreds, timeCardId, isAtApprovedLocation, notes, retryCount + 1)
      );
    }
  }

  /**
   * Get active time cards for the current user
   * 
   * GET /me/teamwork/timeCards
   */
  async getMyTimeCards(credentials: DecryptedCredentials): Promise<GraphClockResult> {
    const tokenValidation = this.validateGraphToken(credentials.accessToken);
    if (!tokenValidation.valid) {
      return {
        success: false,
        error: tokenValidation.reason,
        needsReauth: true,
      };
    }

    try {
      const response = await this.client.get('/me/teamwork/timeCards', {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'getMyTimeCards', credentials, 0, async () => ({
        success: false,
        error: 'Retry not supported for this operation',
      }));
    }
  }

  /**
   * Handle API errors with retry logic
   */
  private async handleError(
    error: any,
    operation: string,
    credentials: DecryptedCredentials,
    retryCount: number,
    retryFn: (newCreds: DecryptedCredentials) => Promise<GraphClockResult>
  ): Promise<GraphClockResult> {
    const status = error?.response?.status;
    const errorMessage = this.parseError(error);

    logger.warn(`[GraphAPI] ${operation} failed: ${errorMessage} (status: ${status})`);

    // Handle auth errors with retry
    if ((status === 401 || status === 403) && retryCount < 2 && this.tokenRefreshCallback) {
      logger.info(`[GraphAPI] Auth error, attempting refresh... (attempt ${retryCount + 1}/2)`);
      return this.handleRefreshAndRetry(credentials, retryFn);
    }

    return {
      success: false,
      error: errorMessage,
      needsReauth: status === 401 || status === 403,
    };
  }

  /**
   * Handle token refresh and retry
   */
  private async handleRefreshAndRetry(
    credentials: DecryptedCredentials,
    retryFn: (newCreds: DecryptedCredentials) => Promise<GraphClockResult>
  ): Promise<GraphClockResult> {
    if (!this.tokenRefreshCallback) {
      return {
        success: false,
        error: 'Token refresh not available',
        needsReauth: true,
      };
    }

    try {
      const newToken = await this.tokenRefreshCallback();
      if (newToken) {
        const updatedCredentials = { ...credentials, accessToken: newToken };
        return retryFn(updatedCredentials);
      }
    } catch (error) {
      logger.warn('[GraphAPI] Token refresh failed');
    }

    return {
      success: false,
      error: 'Token refresh failed. Please re-authenticate.',
      needsReauth: true,
    };
  }

  /**
   * Parse error message from response
   */
  private parseError(error: any): string {
    if (error?.response?.data) {
      const data = error.response.data;
      if (data.error?.message) return data.error.message;
      if (data.message) return data.message;
    }
    if (error?.response?.status) {
      return `HTTP ${error.response.status}: ${error.response.statusText || 'Unknown error'}`;
    }
    return error?.message || 'Unknown error';
  }
}

// Singleton instance
export const graphApiService = new GraphApiService();
