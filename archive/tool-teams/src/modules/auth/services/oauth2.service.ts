import axios from 'axios';
import { logger } from '../../../core/logger';
import { CookieData } from './auth.service';

/**
 * OAuth2 Token Response
 */
interface OAuth2TokenResponse {
  token_type: string;
  scope: string;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  id_token?: string;
}

/**
 * StaffHub User Info Response
 */
interface StaffHubUserInfo {
  userId: string;
  email: string;
  region: {
    id: string;
    serviceUrl: string;
    serviceDirectUrl: string;
    afdServiceUrl: string;
  };
}

/**
 * OAuth2 Login Result
 */
export interface OAuth2LoginResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  teamId?: string;
  userObjectId?: string;
  tenantId?: string;
  userId?: string;
  email?: string;
  region?: string;
  displayName?: string;
  error?: string;
}

/**
 * OAuth2 Service for Microsoft Teams Shifts
 *
 * Implements proper OAuth2 flow to get tokens with correct audience/scope
 */
class OAuth2Service {
  private readonly STAFFHUB_SCOPE = 'https://api.manage.staffhub.office.com/.default';
  private readonly GRAPH_SCOPE = 'https://graph.microsoft.com/.default';

  /**
   * Login using OAuth2 Resource Owner Password Credentials (ROPC) flow
   * This gets a token with the correct scope for StaffHub API
   */
  async loginWithCredentials(
    email: string,
    password: string,
    tenantId: string,
    clientId: string
  ): Promise<OAuth2LoginResult> {
    try {
      logger.info(`Starting OAuth2 login for ${email}...`);

      // Step 1: Get StaffHub access token
      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

      const tokenData = new URLSearchParams({
        client_id: clientId,
        scope: this.STAFFHUB_SCOPE,
        username: email,
        password: password,
        grant_type: 'password',
      });

      logger.info('Requesting StaffHub access token...');
      const tokenResponse = await axios.post<OAuth2TokenResponse>(tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, refresh_token } = tokenResponse.data;

      if (!access_token) {
        return {
          success: false,
          error: 'Failed to obtain access token',
        };
      }

      logger.info('✅ StaffHub access token obtained');

      // Step 2: Get user info from StaffHub
      const userInfo = await this.getStaffHubUserInfo(access_token);

      // Step 3: Get display name from Microsoft Graph (optional)
      let displayName: string | undefined;
      try {
        const profile = await this.getUserProfile(access_token);
        displayName = profile.displayName;
      } catch (error) {
        logger.warn('Could not fetch user profile from Graph API');
      }

      logger.info(`✅ OAuth2 login successful for ${email}`);

      return {
        success: true,
        accessToken: access_token,
        refreshToken: refresh_token,
        userId: userInfo.userId,
        email: userInfo.email,
        region: userInfo.region.id,
        displayName: displayName || email,
        tenantId,
      };
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.warn(`OAuth2 login failed: ${errorMessage}`);

      return {
        success: false,
        error: `OAuth2 login failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Refresh token using refresh_token
   */
  async refreshToken(
    refreshToken: string,
    tenantId: string,
    clientId: string
  ): Promise<OAuth2LoginResult> {
    try {
      logger.info('Refreshing access token using refresh_token...');

      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

      const tokenData = new URLSearchParams({
        client_id: clientId,
        scope: this.STAFFHUB_SCOPE,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const tokenResponse = await axios.post<OAuth2TokenResponse>(tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, refresh_token: new_refresh_token } = tokenResponse.data;

      if (!access_token) {
        return {
          success: false,
          error: 'Failed to refresh access token',
        };
      }

      logger.info('✅ Access token refreshed successfully');

      return {
        success: true,
        accessToken: access_token,
        refreshToken: new_refresh_token || refreshToken,
      };
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.warn(`Token refresh failed: ${errorMessage}`);

      return {
        success: false,
        error: `Token refresh failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get StaffHub user info (userId + region)
   */
  private async getStaffHubUserInfo(accessToken: string): Promise<StaffHubUserInfo> {
    try {
      // Try multiple StaffHub endpoints
      const endpoints = [
        'https://staffhub.ms/users/me',
        'https://staffhub.office.com/users/me',
        'https://api.manage.staffhub.office.com/users/me',
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get<StaffHubUserInfo>(endpoint, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            timeout: 10000,
          });

          if (response.data?.userId) {
            logger.info(`✅ User info fetched from ${endpoint}`);
            return response.data;
          }
        } catch (error) {
          logger.warn(`Failed to fetch from ${endpoint}, trying next...`);
        }
      }

      throw new Error('Could not fetch user info from any StaffHub endpoint');
    } catch (error) {
      throw new Error(`Failed to get StaffHub user info: ${this.parseError(error)}`);
    }
  }

  /**
   * Get user profile from Microsoft Graph
   */
  private async getUserProfile(token: string): Promise<{ displayName?: string }> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { displayName: response.data.displayName };
    } catch (error) {
      logger.warn('Failed to fetch profile from Graph API');
      return {};
    }
  }

  /**
   * Parse error message
   */
  private parseError(error: any): string {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as any;
      if (data?.error_description) {
        return data.error_description;
      }
      if (data?.error) {
        return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      }
      return error.message;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}

// Singleton instance
export const oauth2Service = new OAuth2Service();
