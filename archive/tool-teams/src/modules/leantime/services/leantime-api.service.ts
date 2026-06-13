import { HttpClient } from '../../../core/http/http-client';
import { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { leantimeCredentialsRepository } from '../repositories/leantime-credentials.repository';
import { encryptionUtil } from '../../../shared/utils/encryption.util';
import { ERROR_CODES } from '../../../core/constants/error-codes';
import { logger } from '../../../core/logger/logger.service';

export abstract class LeantimeApiService extends HttpClient {
  protected userId: string;

  constructor(userId: string = 'default') {
    super({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    this.userId = userId;
  }

  /**
   * Inject Auth Headers and set Base URL dynamically
   */
  protected async handleRequest(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    const credentials = leantimeCredentialsRepository.findById(this.userId);
    if (credentials && credentials.leantime_url) {
      // Set Base URL for RPC (or REST if preferred)
      const baseUrl = credentials.leantime_url.replace(/\/$/, '');
      config.baseURL = `${baseUrl}/api/jsonrpc`;
      
      // Decrypt and attach cookies
      if (credentials.session_cookie) {
        const session = encryptionUtil.decrypt(credentials.session_cookie);
        // We might not need accessToken/refreshToken for core session auth if user is correct
        // But lets keep them if present, just in case.
        const access = credentials.access_token ? encryptionUtil.decrypt(credentials.access_token) : '';
        const refresh = credentials.refresh_token ? encryptionUtil.decrypt(credentials.refresh_token) : '';
        
        // Construct Cookie Header
        let cookieHeader = `leantime_session=${session}`;
        // Add others if they exist, but session is key
        if (access) cookieHeader += `; accessToken=${access}`;
        if (refresh) cookieHeader += `; refreshToken=${refresh}`;
        
        config.headers['Cookie'] = cookieHeader;

        // REQUIRED HEADERS for Session-based Auth
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        config.headers['Origin'] = baseUrl;
        config.headers['Referer'] = `${baseUrl}/dashboard/home`; // Or just baseUrl

        // If we stored CSRF (temporarily hijacking 'accessToken' or need a new field)
        // For now, let's assume we might need to store it properly.
        // If we have it in client defaults (from login hack), use it.
        // OR if we saved it in 'access_token' field as a hack (which we didn't yet).
        
        // Checking for common CSRF header if externally set (e.g. via Login service hack)
        if (this.client.defaults.headers.common['X-CSRF-Token']) {
           config.headers['X-CSRF-Token'] = this.client.defaults.headers.common['X-CSRF-Token'];
        }
      }
    }
    return config;
  }

  /**
   * Handle Response to capture new cookies (Passive Refresh)
   */
  protected async handleResponse(response: AxiosResponse): Promise<AxiosResponse> {
    const setCookie = response.headers['set-cookie'];
    if (setCookie && Array.isArray(setCookie)) {
      this.updateCredentialsFromCookies(setCookie);
    }
    return response;
  }

  private updateCredentialsFromCookies(cookies: string[]) {
    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    let sessionCookie: string | undefined;

    cookies.forEach(cookie => {
      if (cookie.includes('accessToken=')) {
        accessToken = cookie.split('accessToken=')[1].split(';')[0];
      }
      if (cookie.includes('refreshToken=')) {
        refreshToken = cookie.split('refreshToken=')[1].split(';')[0];
      }
      if (cookie.includes('leantime_session=')) {
        sessionCookie = cookie.split('leantime_session=')[1].split(';')[0];
      }
    });

    if (accessToken || refreshToken || sessionCookie) {
      // Update DB with whatever new tokens we found, keeping old ones if not present
      const existing = leantimeCredentialsRepository.findById(this.userId);
      if (existing) {
        leantimeCredentialsRepository.save({
          userId: this.userId,
          leantimeUrl: existing.leantime_url,
          accessToken: accessToken || undefined, // undefined means don't overwrite in save() if using COALESCE logic? 
          // Wait, save() uses COALESCE if passed? No, save() logic need checking.
          // let's check repo save() logic.
          // It uses COALESCE(?, access_token). So passing undefined/null is fine if we want to keep existing.
          // BUT my DTO interfaces usually expect optional.
          // Let's pass what we have.
          refreshToken: refreshToken || undefined,
          sessionCookie: sessionCookie || undefined,
        });
      }
    }
  }

  /**
   * Handle API Errors and 401 Auto Re-Login
   */
  protected async handleResponseError(error: any): Promise<never> {
    const originalRequest = error.config;
    const status = error.response?.status;
    const data = error.response?.data;

    // Log Error
    if (status) {
      logger.error('LEANTIME_API_ERROR', `API Error Status: ${status}`, { data });
    }

    // Auto Re-Login on 401
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        logger.info('Attempting auto re-login with ENV credentials...');
        await this.autoReLogin();
        // Retry original request
        return this.client(originalRequest);
      } catch (reLoginError) {
        logger.error('LEANTIME_AUTH_FAILED', 'Auto re-login failed', { reLoginError });
        throw { ...ERROR_CODES.LEANTIME_AUTH_FAILED, details: data };
      }
    }

    if (status === 401) {
       throw { ...ERROR_CODES.LEANTIME_AUTH_FAILED, details: data };
    }

    throw { ...ERROR_CODES.LEANTIME_API_ERROR, originalError: error };
  }

  /**
   * Auto re-login using ENV credentials
   */
  protected async autoReLogin(): Promise<void> {
    // Dynamic import to avoid circular dependency
    const { LeantimeAuthService } = await import('./leantime-auth.service');
    const authService = new LeantimeAuthService(this.userId);
    
    const email = process.env.LEANTIME_EMAIL;
    const password = process.env.LEANTIME_PASSWORD;
    const url = process.env.LEANTIME_URL;
    
    if (!email || !password || !url) {
      throw new Error('Missing LEANTIME credentials in ENV. Set LEANTIME_EMAIL, LEANTIME_PASSWORD, LEANTIME_URL');
    }
    
    await authService.login({ email, password, leantimeUrl: url });
    logger.info(`Auto re-login successful for user: ${this.userId}`);
  }

  /**
   * Static refresh handler to allow instances to share refresh logic
   */
  private static refreshHandler: (userId: string) => Promise<void>;

  public static setRefreshHandler(handler: (userId: string) => Promise<void>) {
    LeantimeApiService.refreshHandler = handler;
  }

  protected async refreshToken(): Promise<void> {
    if (LeantimeApiService.refreshHandler) {
      return LeantimeApiService.refreshHandler(this.userId);
    }
    throw new Error('Refresh token logic not implemented');
  }
}
