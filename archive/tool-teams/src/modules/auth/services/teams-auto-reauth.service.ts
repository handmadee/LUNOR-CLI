/**
 * Teams Auto Re-Authentication Service
 * 
 * SOLID Principles:
 * - SRP: Single responsibility - orchestrates re-auth flow
 * - OCP: Open for extension - supports multiple strategies
 * - DIP: Depends on ITokenRefresher abstraction
 * 
 * Strategy Pattern: Tries multiple refresh methods in order:
 * 1. Cookie-based refresh
 * 2. Headless browser login with ENV credentials
 * 3. Notify user via Telegram
 * 
 * Senior-Level Features:
 * - Exponential backoff with jitter for retries
 * - Max retry count to prevent infinite loops
 * - Credential sync between users (default <-> email)
 */

import { ITokenRefresher, RefreshResult } from '../interfaces/token-refresher.interface';
import { authService, CookieData } from './auth.service';
import { tokenRefreshService } from './token-refresh.service';
import { teamsLoginService } from './teams-login.service';
import { telegramBot } from '../../../infrastructure/telegram/telegram-bot.service';
import { logger } from '../../../core/logger/logger.service';

/**
 * Retry Configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Exponential backoff with jitter
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Strategy 1: Cookie-based Refresh
 */
class CookieRefreshStrategy implements ITokenRefresher {
  readonly strategyName = 'CookieRefresh';

  canRefresh(userId: string): boolean {
    const credentials = authService.getCredentials(userId);
    return Boolean(credentials?.cookies && credentials.cookies.length > 0);
  }

  async refresh(userId: string): Promise<RefreshResult> {
    const credentials = authService.getCredentials(userId);
    if (!credentials?.cookies?.length) {
      return { success: false, error: 'No cookies available' };
    }

    logger.info(`[${this.strategyName}] Attempting refresh with stored cookies...`);
    const result = await tokenRefreshService.refreshWithCookies(credentials.cookies);
    
    if (result.success && result.accessToken) {
      // Update stored credentials
      authService.updateToken(result.accessToken, userId);
      if (result.cookies) {
        authService.updateCookies(result.cookies, userId);
      }
      logger.info(`[${this.strategyName}] Success!`);
    }
    
    return result;
  }
}

/**
 * Strategy 2: Headless Browser Login with ENV Credentials
 */
class HeadlessLoginStrategy implements ITokenRefresher {
  readonly strategyName = 'HeadlessLogin';

  canRefresh(_userId: string): boolean {
    const email = process.env.MS_TEAMS_EMAIL;
    const password = process.env.MS_TEAMS_PASSWORD;
    return Boolean(email && password);
  }

  async refresh(userId: string): Promise<RefreshResult> {
    const email = process.env.MS_TEAMS_EMAIL;
    const password = process.env.MS_TEAMS_PASSWORD;
    const envTeamId = process.env.MS_TEAMS_TEAM_ID;
    
    if (!email || !password) {
      return { success: false, error: 'MS_TEAMS_EMAIL or MS_TEAMS_PASSWORD not set in ENV' };
    }

    logger.info(`[${this.strategyName}] Attempting headless login for ${email}...`);
    
    try {
      const loginResult = await teamsLoginService.login(email, password);
      
      if (loginResult.success && loginResult.accessToken) {
        // Determine teamId: prioritize ENV > loginResult > existing credentials
        const resolvedTeamId = this.resolveTeamId(loginResult.teamId, envTeamId, userId);
        
        // Save new credentials for the specific userId
        authService.saveCredentials({
          accessToken: loginResult.accessToken,
          teamId: resolvedTeamId,
          userId: userId,
          displayName: loginResult.displayName,
          deviceId: loginResult.deviceId,
          sessionId: loginResult.sessionId,
          userObjectId: loginResult.userObjectId,
          tenantId: loginResult.tenantId,
          cookies: loginResult.cookies,
        });
        
        // Also sync to 'default' user if logging in with different userId
        if (userId !== 'default') {
          this.syncDefaultUser(loginResult.accessToken, resolvedTeamId, loginResult);
        }
        
        // Also sync to email user if logging in with 'default'
        if (userId === 'default' && email) {
          this.syncEmailUser(email, loginResult.accessToken, resolvedTeamId, loginResult);
        }
        
        logger.info(`[${this.strategyName}] Success! Credentials saved for ${userId} with teamId: ${resolvedTeamId}`);
        return { 
          success: true, 
          accessToken: loginResult.accessToken,
          cookies: loginResult.cookies,
        };
      }
      
      return { 
        success: false, 
        error: loginResult.error || 'Login failed',
        cookies: loginResult.cookies, // Partial save
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('TEAMS_AUTO_REAUTH_FAILED' as any, `Headless login failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
  
  /**
   * Resolve teamId with fallback chain: ENV > loginResult > existing credentials
   */
  private resolveTeamId(loginTeamId?: string, envTeamId?: string, userId?: string): string {
    // Priority 1: ENV variable (most reliable)
    if (envTeamId && envTeamId !== 'UNKNOWN_TEAM') {
      return envTeamId;
    }
    
    // Priority 2: From login result
    if (loginTeamId && loginTeamId !== 'UNKNOWN_TEAM') {
      return loginTeamId;
    }
    
    // Priority 3: From existing credentials
    if (userId) {
      const existing = authService.getCredentials(userId);
      if (existing?.teamId && existing.teamId !== 'UNKNOWN_TEAM') {
        return existing.teamId;
      }
    }
    
    // Fallback
    logger.warn(`[${this.strategyName}] Could not resolve valid teamId, using UNKNOWN_TEAM`);
    return 'UNKNOWN_TEAM';
  }
  
  /**
   * Sync credentials to 'default' user
   */
  private syncDefaultUser(
    accessToken: string, 
    teamId: string, 
    loginResult: { displayName?: string; deviceId?: string; sessionId?: string; userObjectId?: string; tenantId?: string; cookies?: CookieData[] }
  ): void {
    const defaultCreds = authService.getCredentials('default');
    
    // Only sync if default exists and has different/invalid teamId
    if (defaultCreds && defaultCreds.teamId !== teamId) {
      logger.info(`[${this.strategyName}] Syncing credentials to 'default' user...`);
      authService.saveCredentials({
        accessToken,
        teamId,
        userId: 'default',
        displayName: loginResult.displayName,
        deviceId: loginResult.deviceId,
        sessionId: loginResult.sessionId,
        userObjectId: loginResult.userObjectId,
        tenantId: loginResult.tenantId,
        cookies: loginResult.cookies,
      });
    } else if (defaultCreds) {
      // Just update token
      authService.updateToken(accessToken, 'default');
    }
  }
  
  /**
   * Sync credentials to email user
   */
  private syncEmailUser(
    email: string,
    accessToken: string, 
    teamId: string, 
    loginResult: { displayName?: string; deviceId?: string; sessionId?: string; userObjectId?: string; tenantId?: string; cookies?: CookieData[] }
  ): void {
    const emailCreds = authService.getCredentials(email);
    
    if (emailCreds && emailCreds.teamId !== teamId) {
      logger.info(`[${this.strategyName}] Syncing credentials to '${email}' user...`);
      authService.saveCredentials({
        accessToken,
        teamId,
        userId: email,
        displayName: loginResult.displayName,
        deviceId: loginResult.deviceId,
        sessionId: loginResult.sessionId,
        userObjectId: loginResult.userObjectId,
        tenantId: loginResult.tenantId,
        cookies: loginResult.cookies,
      });
    } else if (emailCreds) {
      authService.updateToken(accessToken, email);
    }
  }
}

/**
 * Strategy 3: Notify User (Fallback)
 */
class NotifyUserStrategy implements ITokenRefresher {
  readonly strategyName = 'NotifyUser';

  canRefresh(_userId: string): boolean {
    return true; // Always available as fallback
  }

  async refresh(_userId: string): Promise<RefreshResult> {
    logger.warn(`[${this.strategyName}] All auto-refresh strategies failed. Notifying user...`);
    
    await telegramBot.sendMessage(
      '⚠️ <b>Token MS Teams hết hạn!</b>\n\n' +
      'Không thể tự động đăng nhập lại.\n\n' +
      '💡 <b>Cách khắc phục:</b>\n' +
      '1. Đăng nhập Teams web console\n' +
      '2. Copy token mới\n' +
      '3. Dùng lệnh <code>/save_token</code>\n\n' +
      'Hoặc cấu hình MS_TEAMS_EMAIL, MS_TEAMS_PASSWORD trong .env',
      { parseMode: 'HTML' }
    );
    
    return { 
      success: false, 
      error: 'Auto-refresh failed. User notified.', 
      needsReauth: true 
    };
  }
}

/**
 * Teams Auto Re-Auth Orchestrator
 * 
 * Tries strategies in order until one succeeds.
 * Implements exponential backoff for retries per strategy.
 */
class TeamsAutoReauthService implements ITokenRefresher {
  readonly strategyName = 'TeamsAutoReauth';
  
  private strategies: ITokenRefresher[] = [
    new CookieRefreshStrategy(),
    new HeadlessLoginStrategy(),
    new NotifyUserStrategy(),
  ];
  
  private retryConfig: RetryConfig;
  private isRefreshing: boolean = false;
  private lastRefreshAttempt: number = 0;
  private readonly MIN_REFRESH_INTERVAL_MS = 30000; // 30 seconds between full refresh attempts

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig;
  }

  canRefresh(userId: string): boolean {
    return this.strategies.some(s => s.canRefresh(userId));
  }

  /**
   * Main refresh method with retry logic and rate limiting
   */
  async refresh(userId: string): Promise<RefreshResult> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshing) {
      logger.warn(`[${this.strategyName}] Refresh already in progress, waiting...`);
      return { success: false, error: 'Refresh already in progress' };
    }
    
    // Rate limiting - prevent hammering the auth system
    const timeSinceLastRefresh = Date.now() - this.lastRefreshAttempt;
    if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL_MS && this.lastRefreshAttempt > 0) {
      const waitTime = Math.ceil((this.MIN_REFRESH_INTERVAL_MS - timeSinceLastRefresh) / 1000);
      logger.warn(`[${this.strategyName}] Rate limited. Wait ${waitTime}s before retry.`);
      return { 
        success: false, 
        error: `Rate limited. Please wait ${waitTime} seconds.` 
      };
    }
    
    this.isRefreshing = true;
    this.lastRefreshAttempt = Date.now();
    
    try {
      return await this.executeRefreshStrategies(userId);
    } finally {
      this.isRefreshing = false;
    }
  }
  
  /**
   * Execute refresh strategies with exponential backoff per strategy
   */
  private async executeRefreshStrategies(userId: string): Promise<RefreshResult> {
    logger.info(`[${this.strategyName}] Starting auto re-auth for user: ${userId}`);
    
    for (const strategy of this.strategies) {
      if (!strategy.canRefresh(userId)) {
        logger.info(`[${this.strategyName}] Skipping ${strategy.strategyName} - not available`);
        continue;
      }
      
      // Try this strategy with retries
      const result = await this.executeWithRetry(strategy, userId);
      
      if (result.success) {
        logger.info(`[${this.strategyName}] ${strategy.strategyName} succeeded!`);
        return result;
      }
      
      logger.warn(`[${this.strategyName}] ${strategy.strategyName} failed after retries: ${result.error}`);
    }
    
    return { 
      success: false, 
      error: 'All refresh strategies exhausted', 
      needsReauth: true 
    };
  }
  
  /**
   * Execute a single strategy with exponential backoff retry
   */
  private async executeWithRetry(
    strategy: ITokenRefresher, 
    userId: string
  ): Promise<RefreshResult> {
    let lastError: string | undefined;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoffDelay = calculateBackoffDelay(attempt - 1, this.retryConfig);
        logger.info(`[${this.strategyName}] Retry ${attempt}/${this.retryConfig.maxRetries} for ${strategy.strategyName} after ${Math.round(backoffDelay)}ms...`);
        await delay(backoffDelay);
      } else {
        logger.info(`[${this.strategyName}] Trying ${strategy.strategyName}...`);
      }
      
      try {
        const result = await strategy.refresh(userId);
        
        if (result.success) {
          return result;
        }
        
        lastError = result.error;
        
        // If error indicates no point in retrying (e.g., wrong credentials), break early
        if (this.isNonRetryableError(result.error)) {
          logger.warn(`[${this.strategyName}] Non-retryable error: ${result.error}`);
          break;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        logger.error('STRATEGY_EXECUTION_ERROR' as any, `${strategy.strategyName}: ${lastError}`);
      }
    }
    
    return { success: false, error: lastError || 'Unknown error' };
  }
  
  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error?: string): boolean {
    if (!error) return false;
    
    const nonRetryablePatterns = [
      'not set in ENV',
      'No cookies available',
      'wrong password',
      'account locked',
      'invalid credentials',
    ];
    
    return nonRetryablePatterns.some(pattern => 
      error.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  /**
   * Force refresh bypassing rate limit (for manual retry)
   */
  async forceRefresh(userId: string): Promise<RefreshResult> {
    this.lastRefreshAttempt = 0; // Reset rate limit
    return this.refresh(userId);
  }
}

// Singleton instance
export const teamsAutoReauthService = new TeamsAutoReauthService();
