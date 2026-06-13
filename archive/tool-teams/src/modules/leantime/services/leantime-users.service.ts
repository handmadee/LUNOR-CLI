import { LeantimeApiService } from './leantime-api.service';
import { logger } from '../../../core/logger/logger.service';

/**
 * Leantime User DTO
 */
export interface LeantimeUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  status?: string;
  profileId?: string;
  clientId?: number;
}

/**
 * Leantime Users Service
 * 
 * Handles user-related API calls to Leantime.
 * Following SOLID: Single Responsibility - only user operations.
 */
export class LeantimeUsersService extends LeantimeApiService {
  // Cache for user lookups (email -> userId)
  private static userCache: Map<string, number> = new Map();

  constructor(userId: string = 'default') {
    super(userId);
  }

  /**
   * Get all users in the Leantime instance
   * API Method: leantime.rpc.users.getAll
   */
  async getAllUsers(): Promise<LeantimeUser[]> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.users.getAll',
        id: 1,
        params: {}
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result || [];
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', 'Failed to fetch users', { error });
      throw error;
    }
  }

  /**
   * Get user ID by email address
   * Caches result to avoid repeated API calls
   * Note: Leantime stores email in 'username' field
   */
  async getUserIdByEmail(email: string): Promise<number | null> {
    // Check cache first
    if (LeantimeUsersService.userCache.has(email)) {
      return LeantimeUsersService.userCache.get(email) || null;
    }

    try {
      const users = await this.getAllUsers();
      
      // Find user by email or username (case-insensitive)
      // Leantime often uses 'username' field for email
      const user = users.find(u => 
        u.email?.toLowerCase() === email.toLowerCase() ||
        (u as any).username?.toLowerCase() === email.toLowerCase()
      );

      if (user) {
        // Cache the result
        LeantimeUsersService.userCache.set(email, user.id);
        logger.info(`Found Leantime user ID ${user.id} for email ${email}`);
        return user.id;
      }

      logger.warn(`No Leantime user found for email: ${email}`);
      return null;
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', `Failed to get user ID for ${email}`, { error });
      return null;
    }
  }

  /**
   * Get full user object by email
   */
  async getUserByEmail(email: string): Promise<LeantimeUser | null> {
    try {
      const users = await this.getAllUsers();
      return users.find(u => 
        u.email?.toLowerCase() === email.toLowerCase()
      ) || null;
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', `Failed to get user by email: ${email}`, { error });
      return null;
    }
  }

  /**
   * Get user by ID
   * API Method: leantime.rpc.users.getUser (if available)
   */
  async getUserById(id: number): Promise<LeantimeUser | null> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.users.getUser',
        id: 1,
        params: { id }
      });

      if (response.data.error) {
        // If method doesn't exist, fall back to getAll and filter
        const users = await this.getAllUsers();
        return users.find(u => u.id === id) || null;
      }

      return response.data.result;
    } catch (error) {
      // Fallback to getAll if specific method fails
      const users = await this.getAllUsers();
      return users.find(u => u.id === id) || null;
    }
  }

  /**
   * Clear user cache (useful when users are updated)
   */
  static clearCache(): void {
    LeantimeUsersService.userCache.clear();
  }
}

// Singleton export for convenience
export const leantimeUsersService = new LeantimeUsersService();
