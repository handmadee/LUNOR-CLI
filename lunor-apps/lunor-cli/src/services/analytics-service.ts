import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { UsageRecord, Provider } from '../types/index.js';

export class AnalyticsService {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.ensureDbDir(dbPath);
    this.db = new Database(dbPath);
    this.initialize();
  }

  private ensureDbDir(dbPath: string): void {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        preset TEXT,
        model TEXT NOT NULL,
        provider TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON usage(timestamp);
      CREATE INDEX IF NOT EXISTS idx_provider ON usage(provider);
      CREATE INDEX IF NOT EXISTS idx_action ON usage(action);
    `);
  }

  recordUsage(record: Omit<UsageRecord, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO usage (timestamp, action, preset, model, provider)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.timestamp,
      record.action,
      record.preset || null,
      record.model,
      record.provider
    );
  }

  getUsageStats(days: number = 7): UsageRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM usage
      WHERE datetime(timestamp) >= datetime('now', '-' || ? || ' days')
      ORDER BY timestamp DESC
    `);

    return stmt.all(days) as UsageRecord[];
  }

  getUsageByProvider(): Record<Provider, number> {
    const stmt = this.db.prepare(`
      SELECT provider, COUNT(*) as count
      FROM usage
      GROUP BY provider
    `);

    const results = stmt.all() as Array<{ provider: Provider; count: number }>;
    const stats: Record<string, number> = {};

    for (const result of results) {
      stats[result.provider] = result.count;
    }

    return stats as Record<Provider, number>;
  }

  getUsageByModel(limit: number = 10): Array<{ model: string; count: number }> {
    const stmt = this.db.prepare(`
      SELECT model, COUNT(*) as count
      FROM usage
      GROUP BY model
      ORDER BY count DESC
      LIMIT ?
    `);

    return stmt.all(limit) as Array<{ model: string; count: number }>;
  }

  getTotalUsage(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM usage');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  clearOldRecords(days: number = 90): number {
    const stmt = this.db.prepare(`
      DELETE FROM usage
      WHERE datetime(timestamp) < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(days);
    return result.changes;
  }

  exportData(): UsageRecord[] {
    const stmt = this.db.prepare('SELECT * FROM usage ORDER BY timestamp DESC');
    return stmt.all() as UsageRecord[];
  }

  close(): void {
    this.db.close();
  }
}
