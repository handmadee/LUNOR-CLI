import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../../config';

/**
 * SQLite Database Connection
 * 
 * Singleton pattern for database connection management.
 * Handles initialization, migrations, and cleanup.
 */
class DatabaseConnection {
  private static instance: DatabaseType | null = null;

  /**
   * Get database instance (lazy initialization)
   */
  public static getInstance(): DatabaseType {
    if (!DatabaseConnection.instance) {
      // Ensure data directory exists
      const dbPath = config.database.path;
      const dataDir = path.dirname(dbPath);
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      DatabaseConnection.instance = new Database(dbPath);
      DatabaseConnection.initTables();
      
      console.log(`[Database] Connected to ${dbPath}`);
    }
    return DatabaseConnection.instance;
  }

  /**
   * Initialize database tables
   */
  private static initTables(): void {
    const db = DatabaseConnection.instance!;

    // Credentials table - stores encrypted MS Teams tokens
    db.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        display_name TEXT,
        team_id TEXT NOT NULL,
        access_token TEXT NOT NULL,
        device_id TEXT,
        session_id TEXT,
        user_object_id TEXT,
        tenant_id TEXT,
        cookies TEXT,
        login_email TEXT,
        login_password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add display_name column if not exists (migration)
    try {
      const columns = db.prepare("PRAGMA table_info(credentials)").all() as { name: string }[];
      if (!columns.some(c => c.name === 'display_name')) {
        db.prepare("ALTER TABLE credentials ADD COLUMN display_name TEXT").run();
        console.log('[Database] Migrated: Added display_name to credentials table');
      }
    } catch (error) {
      console.error('[Database] Migration failed:', error);
    }

    // Attendance logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('clock_in', 'clock_out')),
        shift TEXT NOT NULL CHECK(shift IN ('morning', 'afternoon')),
        timecard_id TEXT,
        status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'pending')),
        response TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Scheduler config table
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheduler_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        is_enabled INTEGER DEFAULT 1,
        morning_clock_in TEXT DEFAULT '08:00',
        morning_clock_out TEXT DEFAULT '12:00',
        afternoon_clock_in TEXT DEFAULT '13:30',
        afternoon_clock_out TEXT DEFAULT '17:30',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default scheduler config if not exists
    const stmt = db.prepare('SELECT COUNT(*) as count FROM scheduler_config');
    const result = stmt.get() as { count: number };
    if (result.count === 0) {
      db.prepare(`
        INSERT INTO scheduler_config (
          is_enabled, 
          morning_clock_in, 
          morning_clock_out, 
          afternoon_clock_in, 
          afternoon_clock_out
        ) VALUES (1, ?, ?, ?, ?)
      `).run(
        config.scheduler.morningIn,
        config.scheduler.morningOut,
        config.scheduler.afternoonIn,
        config.scheduler.afternoonOut
      );
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS leantime_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        session_cookie TEXT,
        leantime_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        error_code TEXT NOT NULL,
        error_message TEXT NOT NULL,
        stack_trace TEXT,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Close database connection
   */
  public static close(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.close();
      DatabaseConnection.instance = null;
      console.log('[Database] Connection closed');
    }
  }
}

// Export singleton instance
export const db: DatabaseType = DatabaseConnection.getInstance();
export { DatabaseConnection };
