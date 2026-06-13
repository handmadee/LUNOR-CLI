import { CredentialsModel, ICredentials } from '../../../infrastructure/database/models';

/**
 * Stored Credentials Entity (for compatibility)
 */
export interface StoredCredentials {
  id: number | string;
  user_id: string;
  display_name: string | null;
  team_id: string;
  access_token: string;
  device_id: string | null;
  session_id: string | null;
  user_object_id: string | null;
  tenant_id: string | null;
  cookies: string | null;
  login_email: string | null;
  login_password: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * DTO for saving credentials
 */
export interface SaveCredentialsDto {
  userId: string;
  displayName?: string;
  teamId: string;
  accessToken: string;
  deviceId?: string;
  sessionId?: string;
  userObjectId?: string;
  tenantId?: string;
  cookies?: string | object;
  loginEmail?: string;
  loginPassword?: string;
  tokenExpiresAt?: Date;
}

/**
 * Credentials Repository (MongoDB)
 *
 * Implements Repository Pattern for credentials persistence using MongoDB.
 * Maintains same interface as SQLite version for backward compatibility.
 */
class CredentialsMongoRepository {
  /**
   * Convert MongoDB document to StoredCredentials format
   */
  private toStoredCredentials(doc: ICredentials): StoredCredentials {
    return {
      id: doc._id.toString(),
      user_id: doc.userId,
      display_name: doc.displayName || null,
      team_id: doc.teamId,
      access_token: doc.accessToken,
      device_id: doc.deviceId || null,
      session_id: doc.sessionId || null,
      user_object_id: doc.userObjectId || null,
      tenant_id: doc.tenantId || null,
      cookies: doc.cookies ? JSON.stringify(doc.cookies) : null,
      login_email: doc.loginEmail || null,
      login_password: doc.loginPassword || null,
      created_at: doc.createdAt.toISOString(),
      updated_at: doc.updatedAt.toISOString(),
    };
  }

  /**
   * Find credentials by user ID
   */
  async findById(userId: string): Promise<StoredCredentials | null> {
    try {
      const doc = await CredentialsModel.findOne({ userId })
        .select('+loginPassword') // Include password field
        .lean();

      if (!doc) {
        return null;
      }

      return this.toStoredCredentials(doc as ICredentials);
    } catch (error) {
      console.error('Error finding credentials by userId', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find all credentials
   */
  async findAll(): Promise<StoredCredentials[]> {
    try {
      const docs = await CredentialsModel.find()
        .sort({ updatedAt: -1 })
        .select('+loginPassword')
        .lean();

      return docs.map((doc) => this.toStoredCredentials(doc as ICredentials));
    } catch (error) {
      console.error('Error finding all credentials', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Save or update credentials
   */
  async save(dto: SaveCredentialsDto): Promise<StoredCredentials> {
    try {
      // Parse cookies if string
      let parsedCookies: object | undefined = undefined;
      if (dto.cookies) {
        if (typeof dto.cookies === 'string') {
          try {
            parsedCookies = JSON.parse(dto.cookies);
          } catch {
            // Keep as object if parse fails
            parsedCookies = { raw: dto.cookies };
          }
        } else {
          parsedCookies = dto.cookies;
        }
      }

      const updateData: Partial<ICredentials> = {
        teamId: dto.teamId,
        accessToken: dto.accessToken,
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.deviceId && { deviceId: dto.deviceId }),
        ...(dto.sessionId && { sessionId: dto.sessionId }),
        ...(dto.userObjectId && { userObjectId: dto.userObjectId }),
        ...(dto.tenantId && { tenantId: dto.tenantId }),
        ...(parsedCookies && { cookies: parsedCookies }),
        ...(dto.loginEmail && { loginEmail: dto.loginEmail }),
        ...(dto.loginPassword && { loginPassword: dto.loginPassword }),
        ...(dto.tokenExpiresAt && { tokenExpiresAt: dto.tokenExpiresAt }),
      };

      const doc = await CredentialsModel.findOneAndUpdate(
        { userId: dto.userId },
        { $set: updateData },
        {
          upsert: true,
          new: true,
          select: '+loginPassword',
        }
      );

      return this.toStoredCredentials(doc);
    } catch (error) {
      console.error('Error saving credentials', {
        userId: dto.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update specific fields
   */
  async update(userId: string, data: Partial<StoredCredentials>): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {};

      if (data.access_token !== undefined) {
        updateData.accessToken = data.access_token;
      }
      if (data.cookies !== undefined) {
        updateData.cookies = data.cookies ? JSON.parse(data.cookies) : null;
      }
      if (data.login_email !== undefined) {
        updateData.loginEmail = data.login_email;
      }
      if (data.login_password !== undefined) {
        updateData.loginPassword = data.login_password;
      }

      if (Object.keys(updateData).length === 0) {
        return false;
      }

      const result = await CredentialsModel.updateOne(
        { userId },
        { $set: updateData }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error updating credentials', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete credentials by user ID
   */
  async delete(userId: string): Promise<boolean> {
    try {
      const result = await CredentialsModel.deleteOne({ userId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting credentials', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if credentials exist
   */
  async exists(userId: string): Promise<boolean> {
    try {
      const count = await CredentialsModel.countDocuments({ userId });
      return count > 0;
    } catch (error) {
      console.error('Error checking credentials existence', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update access token only
   */
  async updateToken(userId: string, accessToken: string, expiresAt?: Date): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = { accessToken };
      if (expiresAt) {
        updateData.tokenExpiresAt = expiresAt;
      }

      const result = await CredentialsModel.updateOne(
        { userId },
        { $set: updateData }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error updating token', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update cookies only
   */
  async updateCookies(userId: string, cookies: string | object): Promise<boolean> {
    try {
      let cookiesData = cookies;
      if (typeof cookies === 'string') {
        try {
          cookiesData = JSON.parse(cookies);
        } catch {
          // Keep as string if parse fails
        }
      }

      const result = await CredentialsModel.updateOne(
        { userId },
        { $set: { cookies: cookiesData } }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error updating cookies', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if token is expiring soon (within 5 minutes)
   */
  async isTokenExpiringSoon(userId: string): Promise<boolean> {
    try {
      const doc = await CredentialsModel.findOne({ userId })
        .select('tokenExpiresAt')
        .lean();

      if (!doc || !doc.tokenExpiresAt) {
        return false;
      }

      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      return doc.tokenExpiresAt <= fiveMinutesFromNow;
    } catch (error) {
      console.error('Error checking token expiry', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get credentials that need refresh (token expired or expiring soon)
   */
  async findExpiredCredentials(): Promise<StoredCredentials[]> {
    try {
      const now = new Date();
      const docs = await CredentialsModel.find({
        tokenExpiresAt: { $lte: now },
      })
        .select('+loginPassword')
        .lean();

      return docs.map((doc) => this.toStoredCredentials(doc as ICredentials));
    } catch (error) {
      console.error('Error finding expired credentials', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Singleton instance
export const credentialsMongoRepository = new CredentialsMongoRepository();
