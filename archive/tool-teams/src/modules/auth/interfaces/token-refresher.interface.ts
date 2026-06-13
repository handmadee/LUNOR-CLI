/**
 * Token Refresher Interface
 * 
 * SOLID: Dependency Inversion Principle
 * Abstract interface for token refresh strategies.
 */

export interface RefreshResult {
  success: boolean;
  accessToken?: string;
  cookies?: any[];
  error?: string;
  needsReauth?: boolean;
}

export interface ITokenRefresher {
  /**
   * Attempt to refresh/obtain a new token
   */
  refresh(userId: string): Promise<RefreshResult>;
  
  /**
   * Check if this strategy can attempt refresh
   */
  canRefresh(userId: string): boolean;
  
  /**
   * Strategy name for logging
   */
  readonly strategyName: string;
}
