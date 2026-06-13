import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError, 
  InternalAxiosRequestConfig 
} from 'axios';
import { logger } from '../logger/logger.service';

export interface HttpClientConfig extends AxiosRequestConfig {
  baseURL?: string;
  timeout?: number;
  retryOnError?: boolean;
}

export abstract class HttpClient {
  protected client: AxiosInstance;

  constructor(config: HttpClientConfig = {}) {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    });

    this.initializeRequestInterceptor();
    this.initializeResponseInterceptor();
  }

  /**
   * Override this method to add custom request interception logic
   * e.g., adding Auth headers
   */
  protected initializeRequestInterceptor(): void {
    this.client.interceptors.request.use(
      this.handleRequest.bind(this),
      this.handleRequestError.bind(this)
    );
  }

  /**
   * Override this method to add custom response interception logic
   * e.g., token refresh on 401
   */
  protected initializeResponseInterceptor(): void {
    this.client.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleResponseError.bind(this)
    );
  }

  protected async handleRequest(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    return config;
  }

  protected async handleRequestError(error: unknown): Promise<never> {
    return Promise.reject(error);
  }

  protected async handleResponse(response: AxiosResponse): Promise<AxiosResponse> {
    return response;
  }

  protected async handleResponseError(error: unknown): Promise<never> {
    // Default error handling
    if (axios.isAxiosError(error)) {
      const { response, config } = error;
      const method = config?.method?.toUpperCase() || 'UNKNOWN';
      const url = config?.url || 'UNKNOWN';
      const status = response?.status || 'UNKNOWN';
      
      // Log only critical/unexpected errors or warnings separately in subclass
      // Here we keep it generic
      // Subclasses can override this to implement retry logic
    }
    return Promise.reject(error);
  }

  // --- Public HTTP Methods ---

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}
