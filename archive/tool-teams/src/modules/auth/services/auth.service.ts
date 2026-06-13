import { credentialsRepository, StoredCredentials, SaveCredentialsDto } from '../repositories/credentials.repository';
import { encryptionUtil } from '../../../shared/utils/encryption.util';
import { logger } from '../../../core/logger';
import { tokenRefreshService } from './token-refresh.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Decrypted Credentials (for use in services)
 */
export interface DecryptedCredentials {
  userId: string;
  displayName?: string;
  teamId: string;
  accessToken: string;
  deviceId: string;
  sessionId: string;
  userObjectId?: string;
  tenantId?: string;
  cookies?: CookieData[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Cookie data structure
 */
export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
}

/**
 * Save Token DTO
 */
export interface SaveTokenDto {
  accessToken: string;
  teamId: string;
  userId?: string;
  displayName?: string;
  deviceId?: string;
  sessionId?: string;
  userObjectId?: string;
  tenantId?: string;
  cookies?: CookieData[];
}

/**
 * Auth Service
 * 
 * Handles authentication and credential management.
 * Uses Repository Pattern for data access.
 */
class AuthService {
  /**
   * Save credentials (encrypts sensitive data)
   */
  saveCredentials(dto: SaveTokenDto): StoredCredentials {
    // If userId not provided, try to find existing default
    const userId = dto.userId || 'default';
    const deviceId = dto.deviceId || `DEV_${uuidv4()}`;
    const sessionId = dto.sessionId || uuidv4();

    const encryptedToken = encryptionUtil.encrypt(dto.accessToken);
    const encryptedCookies = dto.cookies 
      ? encryptionUtil.encrypt(JSON.stringify(dto.cookies)) 
      : undefined;

    const saveDto: SaveCredentialsDto = {
      userId,
      displayName: dto.displayName,
      teamId: dto.teamId,
      accessToken: encryptedToken,
      deviceId,
      sessionId,
      userObjectId: dto.userObjectId,
      tenantId: dto.tenantId,
      cookies: encryptedCookies,
    };

    const saved = credentialsRepository.save(saveDto);
    logger.info(`Credentials saved for user: ${userId}`);
    return saved;
  }

  /**
   * Get decrypted credentials
   * If userId is 'default', tries to find the first available user if 'default' doesn't exist
   */
  getCredentials(userId: string = 'default'): DecryptedCredentials | null {
    let stored: StoredCredentials | null = null;

    if (userId === 'default') {
      const all = credentialsRepository.findAll();
      if (all.length > 0) {
        stored = all[0];
      }
    } else {
      stored = credentialsRepository.findById(userId);
    }
    
    // Fallback if specific user not found but default asked
    if (!stored && userId === 'default') {
       stored = credentialsRepository.findById('default');
    }

    if (!stored) return null;

    let cookies: CookieData[] | undefined;
    if (stored.cookies) {
      try {
        const decryptedCookies = encryptionUtil.decrypt(stored.cookies);
        cookies = JSON.parse(decryptedCookies);
      } catch {
        cookies = undefined;
      }
    }

    return {
      userId: stored.user_id,
      displayName: stored.display_name || undefined,
      teamId: stored.team_id,
      accessToken: encryptionUtil.decrypt(stored.access_token),
      deviceId: stored.device_id || `DEV_${uuidv4()}`,
      sessionId: stored.session_id || uuidv4(),
      userObjectId: stored.user_object_id || undefined,
      tenantId: stored.tenant_id || undefined,
      cookies,
      createdAt: stored.created_at,
      updatedAt: stored.updated_at,
    };
  }

  /**
   * Get primary user credentials (for single-user mode)
   */
  getPrimaryCredentials(): DecryptedCredentials | null {
    return this.getCredentials('default');
  }

  /**
   * Check if credentials exist
   */
  hasCredentials(userId: string = 'default'): boolean {
    return !!this.getCredentials(userId);
  }

  /**
   * Update access token
   */
  updateToken(accessToken: string, userId: string = 'default'): boolean {
    // Resolve userId if default
    const credentials = this.getCredentials(userId);
    if (!credentials) return false;

    const encryptedToken = encryptionUtil.encrypt(accessToken);
    const updated = credentialsRepository.updateToken(credentials.userId, encryptedToken);
    if (updated) {
      logger.info(`Token updated for user: ${credentials.userId}`);
    }
    return updated;
  }

  /**
   * Update cookies
   */
  updateCookies(cookies: CookieData[], userId: string = 'default'): boolean {
    const credentials = this.getCredentials(userId);
    if (!credentials) return false;

    const encryptedCookies = encryptionUtil.encrypt(JSON.stringify(cookies));
    const updated = credentialsRepository.updateCookies(credentials.userId, encryptedCookies);
    if (updated) {
      logger.info(`Cookies updated for user: ${credentials.userId}`);
    }
    return updated;
  }

  /**
   * Delete credentials
   */
  deleteCredentials(userId: string = 'default'): boolean {
    const credentials = this.getCredentials(userId);
    if (!credentials) return false;

    const deleted = credentialsRepository.delete(credentials.userId);
    if (deleted) {
      logger.info(`Credentials deleted for user: ${credentials.userId}`);
    }
    return deleted;
  }

  /**
   * Refresh token using stored cookies
   * Returns new access token or null if failed
   */
  async refreshToken(userId: string = 'default'): Promise<string | null> {
    const credentials = this.getCredentials(userId);
    
    if (!credentials) {
      logger.warn('No credentials found for refresh');
      return null;
    }

    if (!credentials.cookies || credentials.cookies.length === 0) {
      logger.warn('No cookies found for refresh');
      return null;
    }

    logger.info(`Attempting token refresh with cookies for user: ${credentials.userId}...`);
    const result = await tokenRefreshService.refreshWithCookies(credentials.cookies);

    if (result.success && result.accessToken) {
      this.updateToken(result.accessToken, credentials.userId);
      
      if (result.cookies) {
        this.updateCookies(result.cookies, credentials.userId);
      }

      logger.info('Token refreshed successfully');
      return result.accessToken;
    }

    logger.warn('Token refresh failed');
    return null;
  }

  /**
   * Get credentials for display (no sensitive data)
   */
  getCredentialsInfo(userId: string = 'default'): object | null {
    const credentials = this.getCredentials(userId);
    if (!credentials) return null;

    return {
      userId: credentials.userId,
      displayName: credentials.displayName,
      teamId: credentials.teamId,
      hasToken: Boolean(credentials.accessToken),
      hasCookies: Boolean(credentials.cookies),
      deviceId: credentials.deviceId,
      userObjectId: credentials.userObjectId,
      tenantId: credentials.tenantId,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt,
    };
  }
}

// Singleton instance
export const authService = new AuthService();
