import { HttpClient } from '../../../core/http/http-client';
import { InternalAxiosRequestConfig } from 'axios';
import { config } from '../../../config';
import { DecryptedCredentials } from '../../auth/services/auth.service';
import { MS_TEAMS } from '../../../core/constants/app.constants';
import { logger } from '../../../core/logger/logger.service';
import { v4 as uuidv4 } from 'uuid';
import { analyzeToken } from '../../auth/utils/token-diagnostics';

/**
 * Retry Configuration for API calls
 */
interface RetryConfig {
  maxRetries: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  retryableStatuses: [401, 403], // Both auth errors trigger reauth
};

/**
 * Clock result interface
 */
export interface ClockResult {
  success: boolean;
  data?: unknown;
  error?: string;
  timecardId?: string;
  needsReauth?: boolean;
}

/**
 * Token refresh callback type
 */
type TokenRefreshCallback = () => Promise<string | null>;

/**
 * Microsoft Teams Shifts API Service
 * 
 * Handles communication with MS Teams Shifts API.
 * Refactored to use shared HttpClient.
 */
class TeamsApiService extends HttpClient {
  private tokenRefreshCallback: TokenRefreshCallback | null = null;
  private currentCredentials: DecryptedCredentials | null = null;

  constructor() {
    super({
      baseURL: config.msTeams.apiBase,
      timeout: 30000,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'vi-VN',
        'apiversion': config.msTeams.apiVersion,
        'clientplatform': MS_TEAMS.CLIENT_PLATFORM,
        'Content-Type': 'application/json',
        'shiftrclientversion': MS_TEAMS.CLIENT_VERSION,
        'x-ms-shft-fp': 'True',
      },
    });
  }

  /**
   * Set token refresh callback for auto-retry
   */
  setTokenRefreshCallback(callback: TokenRefreshCallback): void {
    this.tokenRefreshCallback = callback;
  }

  /**
   * Set Credentials for the Current Request Context
   * Note: Since HttpClient is a singleton-like or reused service, 
   * we need a way to pass credentials per request or set them before calling.
   * However, `clockIn` etc previously took credentials as args.
   * We will store them transiently or use a method to get specific client behavior?
   * 
   * BETTER: `HttpClient` allow overriding config per request.
   * We will NOT set state on this service if it's singleton.
   * We will use `handleRequest` dynamically IF we can pass context.
   * BUT `handleRequest` interceptor is global to the instance.
   * 
   * Solution: We can't easily rely on `this.userId` like Leantime if we pass credentials explicitly.
   * 
   * Alternative: create a new instance per request (expensive?) OR separate the "Client Factory" from "Service".
   * 
   * Given the "Senior" requirement: Factory Pattern or Context passing.
   * 
   * For now, to keep signature compatible with `clockIn(credentials, ...)`, 
   * we will override `clockIn` and pass headers in the `config` argument of `post`.
   */

  /**
   * Build headers for a specific request based on credentials
   */
  private buildHeaders(credentials: DecryptedCredentials) {
    return {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'clientrequestid': uuidv4(),
      'clientsessionid': credentials.sessionId,
      'x-ms-shft-dev': this.buildDeviceHeader(credentials),
    };
  }

  /**
   * Build x-ms-shft-dev header
   */
  private buildDeviceHeader(credentials: DecryptedCredentials): string {
    const deviceInfo = {
      deviceId: credentials.deviceId,
      inGlobalRegion: false,
      clientKeyStr: null,
      ticketStr: null,
      deviceType: 'Web',
    };
    return Buffer.from(JSON.stringify(deviceInfo)).toString('base64');
  }

  /**
   * Clock In - Start a timecard
   */
  async clockIn(
    credentials: DecryptedCredentials,
    isAtApprovedLocation: boolean = true,
    retryCount: number = 0
  ): Promise<ClockResult> {
    // Validate token before making request
    const tokenValidation = this.validateTokenForShifts(credentials.accessToken);
    if (!tokenValidation.valid && retryCount === 0) {
      logger.warn(`Token validation failed: ${tokenValidation.reason}`);
      // Skip directly to reauth for invalid token
      return this.handleAuthErrorAndRetry(
        credentials,
        (newCreds) => this.clockIn(newCreds, isAtApprovedLocation, retryCount + 1),
        tokenValidation.reason || 'Invalid token'
      );
    }

    try {
      const endpoint = MS_TEAMS.ENDPOINTS.CLOCK_IN(credentials.teamId);
      const headers = this.buildHeaders(credentials);

      // Debug logging
      logger.info(`Clock In request - TeamID: ${credentials.teamId}`);
      logger.info(`Clock In request - URL: ${config.msTeams.apiBase}${endpoint}`);

      const response = await this.post<any>(endpoint, {
        isAtApprovedLocation,
      }, { headers });

      const timecardId = response?.timeClockEntry?.id;

      logger.info(`Clock In success - Timecard: ${timecardId}`);

      return {
        success: true,
        data: response,
        timecardId,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      
      // Handle auth errors (401, 403) with retry
      if (this.isAuthError(status) && retryCount < DEFAULT_RETRY_CONFIG.maxRetries) {
        const errorMessage = this.parseError(error);
        logger.warn(`Auth error (${status}) on clockIn attempt ${retryCount + 1}/${DEFAULT_RETRY_CONFIG.maxRetries}: ${errorMessage}`);
        
        return this.handleAuthErrorAndRetry(
          credentials,
          (newCreds) => this.clockIn(newCreds, isAtApprovedLocation, retryCount + 1),
          errorMessage
        );
      }
      
      return this.handleApiError(error, 'CLOCK_IN_FAILED', credentials.userId);
    }
  }

  /**
   * Clock Out - End a timecard
   */
  async clockOut(
    credentials: DecryptedCredentials,
    timecardId: string,
    isAtApprovedLocation: boolean = true,
    retryCount: number = 0
  ): Promise<ClockResult> {
    // Validate token before making request
    const tokenValidation = this.validateTokenForShifts(credentials.accessToken);
    if (!tokenValidation.valid && retryCount === 0) {
      logger.warn(`Token validation failed: ${tokenValidation.reason}`);
      return this.handleAuthErrorAndRetry(
        credentials,
        (newCreds) => this.clockOut(newCreds, timecardId, isAtApprovedLocation, retryCount + 1),
        tokenValidation.reason || 'Invalid token'
      );
    }

    try {
      const endpoint = MS_TEAMS.ENDPOINTS.CLOCK_OUT(credentials.teamId, timecardId);
      const headers = this.buildHeaders(credentials);

      const response = await this.post<any>(endpoint, {
        isAtApprovedLocation,
      }, { headers });

      logger.info(`Clock Out success - Timecard: ${timecardId}`);

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      
      if (this.isAuthError(status) && retryCount < DEFAULT_RETRY_CONFIG.maxRetries) {
        const errorMessage = this.parseError(error);
        logger.warn(`Auth error (${status}) on clockOut attempt ${retryCount + 1}/${DEFAULT_RETRY_CONFIG.maxRetries}: ${errorMessage}`);
        
        return this.handleAuthErrorAndRetry(
          credentials,
          (newCreds) => this.clockOut(newCreds, timecardId, isAtApprovedLocation, retryCount + 1),
          errorMessage
        );
      }
      
      return this.handleApiError(error, 'CLOCK_OUT_FAILED', credentials.userId, { timecardId });
    }
  }

  /**
   * Get current timecard status
   */
  async getTimecardStatus(credentials: DecryptedCredentials): Promise<ClockResult> {
    try {
      const endpoint = MS_TEAMS.ENDPOINTS.STATUS(credentials.teamId);
      const headers = this.buildHeaders(credentials);

      const response = await this.get<any>(endpoint, { headers });

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      // NOTE: Status check usually doesn't trigger auto-refresh recursion to avoid loops, 
      // but can be added if needed. For now returning error to let caller decide.
      return this.handleApiError(error, 'STATUS_CHECK_FAILED', credentials.userId);
    }
  }

  /**
   * Check if status code is an auth error
   */
  private isAuthError(status?: number): boolean {
    return DEFAULT_RETRY_CONFIG.retryableStatuses.includes(status || 0);
  }

  /**
   * Validate token audience for Shifts API
   */
  private validateTokenForShifts(token: string): { valid: boolean; reason?: string } {
    const tokenInfo = analyzeToken(token);
    return {
      valid: tokenInfo.valid,
      reason: tokenInfo.reason,
    };
  }

  /**
   * Handle auth errors (401/403) with token refresh and retry
   */
  private async handleAuthErrorAndRetry(
    credentials: DecryptedCredentials,
    retryFn: (newCreds: DecryptedCredentials) => Promise<ClockResult>,
    errorMessage: string
  ): Promise<ClockResult> {
    logger.warn(`Auth error detected: ${errorMessage}`);
    logger.info('Attempting token refresh via auto-reauth...');

    if (!this.tokenRefreshCallback) {
      logger.warn('No token refresh callback configured');
      return {
        success: false,
        error: 'Authentication failed. Token refresh not available. Please re-authenticate manually.',
        needsReauth: true,
      };
    }

    try {
      const newToken = await this.tokenRefreshCallback();
      
      if (newToken) {
        // Validate the new token before retrying
        const newTokenInfo = analyzeToken(newToken);
        
        if (!newTokenInfo.valid) {
          logger.warn(`New token also invalid: ${newTokenInfo.reason}`);
          return {
            success: false,
            error: `Token refresh succeeded but new token is invalid: ${newTokenInfo.reason}. Please re-authenticate using the capture-shifts-token script.`,
            needsReauth: true,
          };
        }
        
        logger.info('Token refresh successful, retrying API call...');
        const updatedCredentials = { ...credentials, accessToken: newToken };
        return retryFn(updatedCredentials);
      }
    } catch (error) {
      logger.warn('Token refresh failed', { error: error instanceof Error ? error.message : 'Unknown' });
    }

    return {
      success: false,
      error: 'Authentication failed after retry. Please re-authenticate using: npx ts-node scripts/capture-shifts-token.ts',
      needsReauth: true,
    };
  }

  /**
   * Legacy method - now delegates to handleAuthErrorAndRetry
   * @deprecated Use handleAuthErrorAndRetry instead
   */
  private async handleTokenRefreshAndRetry(
    credentials: DecryptedCredentials,
    retryFn: (newCreds: DecryptedCredentials) => Promise<ClockResult>
  ): Promise<ClockResult> {
    return this.handleAuthErrorAndRetry(credentials, retryFn, 'Token expired (401)');
  }

  /**
   * Helper to format API errors
   */
  private handleApiError(error: any, code: string, userId: string, context: any = {}): ClockResult {
    const isAxios = this.isAxiosError(error);
    const status = isAxios ? error.response?.status : 'UNKNOWN';
    const message = this.parseError(error);

    // Check if this is an audience mismatch error
    const isAudienceMismatch = message.includes('Assertion audience does not match') || 
                               message.includes('AADSTS500131');

    logger.error(code as any, message, { userId, status, isAudienceMismatch, ...context });

    // Provide helpful message for audience mismatch
    let errorMessage = message;
    if (isAudienceMismatch) {
      errorMessage = `${message}\n\n` +
        '⚠️ Token audience mismatch. The current token was issued for a different API.\n' +
        '🔧 FIX: Run "npx ts-node scripts/capture-shifts-token.ts" and click Clock In/Out in browser.';
    }

    return {
      success: false,
      error: errorMessage,
      needsReauth: this.isAuthError(status) || isAudienceMismatch,
    };
  }

  private isAxiosError(error: any): boolean {
     return !!error.isAxiosError;
  }

  private parseError(error: any): string {
    if (error.response) {
      const data = error.response.data as any;
      if (data?.error?.details?.length > 0) {
        return data.error.details.map((d: any) => d.message).join('; ');
      }
      if (data?.error?.message) return data.error.message;
      return data?.message || `HTTP ${error.response.status}`;
    }
    return error.message || 'Unknown error';
  }
}

// Singleton instance
export const teamsApiService = new TeamsApiService();
