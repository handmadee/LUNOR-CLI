import { db } from '../../../infrastructure/database/sqlite.connection';

/**
 * Scheduler Config Entity
 */
export interface SchedulerConfigEntity {
  id: number;
  is_enabled: number;
  morning_clock_in: string;
  morning_clock_out: string;
  afternoon_clock_in: string;
  afternoon_clock_out: string;
  updated_at: string;
}

/**
 * DTO for updating scheduler config
 */
export interface UpdateSchedulerConfigDto {
  isEnabled?: boolean;
  morningClockIn?: string;
  morningClockOut?: string;
  afternoonClockIn?: string;
  afternoonClockOut?: string;
}

/**
 * Scheduler Config Repository
 * 
 * Handles persistence for scheduler configuration.
 */
class SchedulerConfigRepository {
  /**
   * Get current config (there's only one row)
   */
  getConfig(): SchedulerConfigEntity | null {
    const stmt = db.prepare('SELECT * FROM scheduler_config LIMIT 1');
    return (stmt.get() as SchedulerConfigEntity) ?? null;
  }

  /**
   * Update scheduler config
   */
  update(dto: UpdateSchedulerConfigDto): SchedulerConfigEntity {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (dto.isEnabled !== undefined) {
      fields.push('is_enabled = ?');
      values.push(dto.isEnabled ? 1 : 0);
    }
    if (dto.morningClockIn !== undefined) {
      fields.push('morning_clock_in = ?');
      values.push(dto.morningClockIn);
    }
    if (dto.morningClockOut !== undefined) {
      fields.push('morning_clock_out = ?');
      values.push(dto.morningClockOut);
    }
    if (dto.afternoonClockIn !== undefined) {
      fields.push('afternoon_clock_in = ?');
      values.push(dto.afternoonClockIn);
    }
    if (dto.afternoonClockOut !== undefined) {
      fields.push('afternoon_clock_out = ?');
      values.push(dto.afternoonClockOut);
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      const sql = `UPDATE scheduler_config SET ${fields.join(', ')} WHERE id = 1`;
      db.prepare(sql).run(...values);
    }

    return this.getConfig()!;
  }

  /**
   * Check if scheduler is enabled
   */
  isEnabled(): boolean {
    const config = this.getConfig();
    return config?.is_enabled === 1;
  }

  /**
   * Enable scheduler
   */
  enable(): void {
    db.prepare('UPDATE scheduler_config SET is_enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run();
  }

  /**
   * Disable scheduler
   */
  disable(): void {
    db.prepare('UPDATE scheduler_config SET is_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run();
  }
}

// Singleton instance
export const schedulerConfigRepository = new SchedulerConfigRepository();
