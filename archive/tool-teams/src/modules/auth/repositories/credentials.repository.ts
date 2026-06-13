import { db } from '../../../infrastructure/database/sqlite.connection';

/**
 * Stored Credentials Entity
 */
export interface StoredCredentials {
  id: number;
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
  cookies?: string;
  loginEmail?: string;
  loginPassword?: string;
}

/**
 * Credentials Repository
 * 
 * Implements Repository Pattern for credentials persistence.
 * Single Responsibility: Only handles data access for credentials.
 */
class CredentialsRepository {
  /**
   * Find credentials by user ID
   */
  findById(userId: string): StoredCredentials | null {
    const stmt = db.prepare('SELECT * FROM credentials WHERE user_id = ?');
    return (stmt.get(userId) as StoredCredentials) ?? null;
  }

  /**
   * Find all credentials
   */
  findAll(): StoredCredentials[] {
    const stmt = db.prepare('SELECT * FROM credentials ORDER BY updated_at DESC');
    return stmt.all() as StoredCredentials[];
  }

  /**
   * Save or update credentials
   */
  save(dto: SaveCredentialsDto): StoredCredentials {
    const existing = this.findById(dto.userId);

    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE credentials SET
          team_id = ?,
          access_token = ?,
          display_name = COALESCE(?, display_name),
          device_id = COALESCE(?, device_id),
          session_id = COALESCE(?, session_id),
          user_object_id = COALESCE(?, user_object_id),
          tenant_id = COALESCE(?, tenant_id),
          cookies = COALESCE(?, cookies),
          login_email = COALESCE(?, login_email),
          login_password = COALESCE(?, login_password),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(
        dto.teamId,
        dto.accessToken,
        dto.displayName ?? null,
        dto.deviceId ?? null,
        dto.sessionId ?? null,
        dto.userObjectId ?? null,
        dto.tenantId ?? null,
        dto.cookies ?? null,
        dto.loginEmail ?? null,
        dto.loginPassword ?? null,
        dto.userId
      );
    } else {
      // Insert new
      db.prepare(`
        INSERT INTO credentials (
          user_id, display_name, team_id, access_token, device_id, session_id,
          user_object_id, tenant_id, cookies, login_email, login_password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        dto.userId,
        dto.displayName ?? null,
        dto.teamId,
        dto.accessToken,
        dto.deviceId ?? null,
        dto.sessionId ?? null,
        dto.userObjectId ?? null,
        dto.tenantId ?? null,
        dto.cookies ?? null,
        dto.loginEmail ?? null,
        dto.loginPassword ?? null
      );
    }

    return this.findById(dto.userId)!;
  }

  /**
   * Update specific fields
   */
  update(userId: string, data: Partial<StoredCredentials>): boolean {
    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (data.access_token !== undefined) {
      fields.push('access_token = ?');
      values.push(data.access_token);
    }
    if (data.cookies !== undefined) {
      fields.push('cookies = ?');
      values.push(data.cookies);
    }
    if (data.login_email !== undefined) {
      fields.push('login_email = ?');
      values.push(data.login_email);
    }
    if (data.login_password !== undefined) {
      fields.push('login_password = ?');
      values.push(data.login_password);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const sql = `UPDATE credentials SET ${fields.join(', ')} WHERE user_id = ?`;
    const result = db.prepare(sql).run(...values);
    return result.changes > 0;
  }

  /**
   * Delete credentials by user ID
   */
  delete(userId: string): boolean {
    const result = db.prepare('DELETE FROM credentials WHERE user_id = ?').run(userId);
    return result.changes > 0;
  }

  /**
   * Check if credentials exist
   */
  exists(userId: string): boolean {
    const stmt = db.prepare('SELECT id FROM credentials WHERE user_id = ?');
    return stmt.get(userId) !== undefined;
  }

  /**
   * Update access token only
   */
  updateToken(userId: string, accessToken: string): boolean {
    const result = db.prepare(`
      UPDATE credentials 
      SET access_token = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = ?
    `).run(accessToken, userId);
    return result.changes > 0;
  }

  /**
   * Update cookies only
   */
  updateCookies(userId: string, cookies: string): boolean {
    const result = db.prepare(`
      UPDATE credentials 
      SET cookies = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = ?
    `).run(cookies, userId);
    return result.changes > 0;
  }
}

// Singleton instance
export const credentialsRepository = new CredentialsRepository();
