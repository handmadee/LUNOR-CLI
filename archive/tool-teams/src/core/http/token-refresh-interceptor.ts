import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Token Refresh Handler Interface
 *
 * Implement this interface to provide token refresh logic
 */
export interface ITokenRefreshHandler {
  /**
   * Called when a 401 error is detected
   * @returns New access token or null if refresh failed
   */
  refreshToken(): Promise<string | null>;

  /**
   * Get current access token
   */
  getAccessToken(): Promise<string | null>;

  /**
   * Check if token is about to expire (proactive refresh)
   */
  isTokenExpiringSoon(): Promise<boolean>;
}

/**
 * Axios Interceptor with Auto Token Refresh
 *
 * Features:
 * - Auto-detect 401 errors
 * - Refresh token automatically
 * - Retry failed requests
 * - Prevent duplicate refresh calls
 * - Exponential backoff for retries
 */
export class TokenRefreshInterceptor {
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor(
    private axiosInstance: AxiosInstance,
    private tokenHandler: ITokenRefreshHandler,
    private options: {
      maxRetries?: number;
      retryDelay?: number;
      enableProactiveRefresh?: boolean;
    } = {}
  ) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.enableProactiveRefresh = options.enableProactiveRefresh || true;

    this.setupInterceptors();
  }

  private maxRetries: number;
  private retryDelay: number;
  private enableProactiveRefresh: boolean;

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - proactive token refresh
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.enableProactiveRefresh) {
          const isExpiring = await this.tokenHandler.isTokenExpiringSoon();
          if (isExpiring && !this.isRefreshing) {
            console.info('Token expiring soon, refreshing proactively...');
            await this.handleTokenRefresh();
          }
        }

        // Add current token to request
        const token = await this.tokenHandler.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle 401 errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Check if error is 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for ongoing refresh
            return this.queueRequest(originalRequest);
          }

          originalRequest._retry = true;

          // Refresh token
          const newToken = await this.handleTokenRefresh();

          if (newToken) {
            // Update authorization header
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }

            // Retry original request
            return this.axiosInstance(originalRequest);
          } else {
            console.error('Token refresh failed, cannot retry request');
            return Promise.reject(error);
          }
        }

        // Check for other retryable errors
        if (this.shouldRetry(error)) {
          return this.retryRequest(originalRequest, error);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Handle token refresh with queue management
   */
  private async handleTokenRefresh(): Promise<string | null> {
    if (this.isRefreshing) {
      // Return a promise that will be resolved when refresh completes
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const newToken = await this.tokenHandler.refreshToken();

      if (newToken) {
        console.info('✅ Token refreshed successfully');
        this.processQueue(newToken);
        return newToken;
      } else {
        console.error('❌ Token refresh returned null');
        this.processQueue(null);
        return null;
      }
    } catch (error) {
      console.error('Token refresh error', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.processQueue(null);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Process queued requests after refresh
   */
  private processQueue(token: string | null): void {
    this.failedQueue.forEach((promise) => {
      if (token) {
        promise.resolve(token);
      } else {
        promise.reject(new Error('Token refresh failed'));
      }
    });

    this.failedQueue = [];
  }

  /**
   * Queue request while refresh is in progress
   */
  private queueRequest(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
    return new Promise((resolve, reject) => {
      this.failedQueue.push({
        resolve: (token) => {
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
            this.axiosInstance(config)
              .then((response) => resolve(response))
              .catch((err) => reject(err));
          } else {
            reject(new Error('Token refresh failed'));
          }
        },
        reject: (error) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Check if error is retryable (network errors, 5xx, etc.)
   */
  private shouldRetry(error: AxiosError): boolean {
    if (!error.config) return false;

    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
    config._retryCount = config._retryCount || 0;

    if (config._retryCount >= this.maxRetries) {
      return false;
    }

    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on 5xx errors
    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest(
    config: InternalAxiosRequestConfig & { _retryCount?: number },
    error: AxiosError
  ): Promise<AxiosResponse> {
    config._retryCount = (config._retryCount || 0) + 1;

    const delay = this.retryDelay * Math.pow(2, config._retryCount - 1);

    console.warn(`Retrying request (${config._retryCount}/${this.maxRetries}) after ${delay}ms`, {
      url: config.url,
      method: config.method,
    });

    await new Promise((resolve) => setTimeout(resolve, delay));

    return this.axiosInstance(config);
  }
}

/**
 * Create Axios instance with token refresh interceptor
 */
export function createAxiosWithTokenRefresh(
  tokenHandler: ITokenRefreshHandler,
  options?: {
    baseURL?: string;
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    enableProactiveRefresh?: boolean;
  }
): AxiosInstance {
  const instance = axios.create({
    baseURL: options?.baseURL,
    timeout: options?.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  new TokenRefreshInterceptor(instance, tokenHandler, {
    maxRetries: options?.maxRetries,
    retryDelay: options?.retryDelay,
    enableProactiveRefresh: options?.enableProactiveRefresh,
  });

  return instance;
}
