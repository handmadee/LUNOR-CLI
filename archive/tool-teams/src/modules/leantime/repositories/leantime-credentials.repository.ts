import { db } from '../../../infrastructure/database/sqlite.connection';
import { encryptionUtil } from '../../../shared/utils/encryption.util';

export interface StoredLeantimeCredentials {
  id: number;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  session_cookie: string | null;
  leantime_url: string;
  created_at: string;
  updated_at: string;
}

export interface SaveLeantimeCredentialsDto {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  sessionCookie?: string;
  leantimeUrl: string;
}

class LeantimeCredentialsRepository {
  findById(userId: string): StoredLeantimeCredentials | null {
    const stmt = db.prepare('SELECT * FROM leantime_credentials WHERE user_id = ?');
    return (stmt.get(userId) as StoredLeantimeCredentials) ?? null;
  }

  save(dto: SaveLeantimeCredentialsDto): StoredLeantimeCredentials {
    const existing = this.findById(dto.userId);

    const encryptedAccess = dto.accessToken ? encryptionUtil.encrypt(dto.accessToken) : null;
    const encryptedRefresh = dto.refreshToken ? encryptionUtil.encrypt(dto.refreshToken) : null;
    const encryptedSession = dto.sessionCookie ? encryptionUtil.encrypt(dto.sessionCookie) : null;

    if (existing) {
      db.prepare(`
        UPDATE leantime_credentials SET
          access_token = COALESCE(?, access_token),
          refresh_token = COALESCE(?, refresh_token),
          session_cookie = COALESCE(?, session_cookie),
          leantime_url = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(encryptedAccess, encryptedRefresh, encryptedSession, dto.leantimeUrl, dto.userId);
    } else {
      db.prepare(`
        INSERT INTO leantime_credentials (user_id, access_token, refresh_token, session_cookie, leantime_url)
        VALUES (?, ?, ?, ?, ?)
      `).run(dto.userId, encryptedAccess, encryptedRefresh, encryptedSession, dto.leantimeUrl);
    }

    return this.findById(dto.userId)!;
  }

  findAll(): StoredLeantimeCredentials[] {
    const stmt = db.prepare('SELECT * FROM leantime_credentials');
    return stmt.all() as StoredLeantimeCredentials[];
  }

  delete(userId: string): boolean {
    const result = db.prepare('DELETE FROM leantime_credentials WHERE user_id = ?').run(userId);
    return result.changes > 0;
  }
}

export const leantimeCredentialsRepository = new LeantimeCredentialsRepository();
