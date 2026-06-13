import { db } from './infrastructure/database/sqlite.connection';
import { mongodbConnection } from './infrastructure/database/mongodb.connection';
import { CredentialsModel, AttendanceLogModel, SchedulerConfigModel, LeantimeCredentialsModel, ErrorLogModel } from './infrastructure/database/models';
import { logger } from './core/logger';

/**
 * Data Migration Script: SQLite → MongoDB
 *
 * Migrates all data from SQLite to MongoDB while preserving data integrity.
 *
 * Usage:
 *   ts-node src/migrate-to-mongodb.ts
 */

interface MigrationStats {
  credentials: { total: number; migrated: number; failed: number };
  attendanceLogs: { total: number; migrated: number; failed: number };
  schedulerConfig: { total: number; migrated: number; failed: number };
  leantimeCredentials: { total: number; migrated: number; failed: number };
  errorLogs: { total: number; migrated: number; failed: number };
}

async function migrateData(): Promise<void> {
  const stats: MigrationStats = {
    credentials: { total: 0, migrated: 0, failed: 0 },
    attendanceLogs: { total: 0, migrated: 0, failed: 0 },
    schedulerConfig: { total: 0, migrated: 0, failed: 0 },
    leantimeCredentials: { total: 0, migrated: 0, failed: 0 },
    errorLogs: { total: 0, migrated: 0, failed: 0 },
  };

  logger.info('🚀 Starting data migration from SQLite to MongoDB...');

  try {
    // Connect to MongoDB
    await mongodbConnection.connect();
    logger.info('✅ MongoDB connected');

    // 1. Migrate Credentials
    logger.info('\n📦 Migrating credentials...');
    const credentials = db.prepare('SELECT * FROM credentials').all() as any[];
    stats.credentials.total = credentials.length;

    for (const cred of credentials) {
      try {
        // Parse cookies if string
        let cookies = null;
        if (cred.cookies) {
          try {
            cookies = JSON.parse(cred.cookies);
          } catch {
            cookies = cred.cookies;
          }
        }

        await CredentialsModel.findOneAndUpdate(
          { userId: cred.user_id },
          {
            $set: {
              userId: cred.user_id,
              displayName: cred.display_name,
              teamId: cred.team_id,
              accessToken: cred.access_token,
              deviceId: cred.device_id,
              sessionId: cred.session_id,
              userObjectId: cred.user_object_id,
              tenantId: cred.tenant_id,
              cookies,
              loginEmail: cred.login_email,
              loginPassword: cred.login_password,
              createdAt: new Date(cred.created_at),
              updatedAt: new Date(cred.updated_at),
            },
          },
          { upsert: true }
        );

        stats.credentials.migrated++;
        logger.info(`  ✓ Migrated credentials for user: ${cred.user_id}`);
      } catch (error) {
        stats.credentials.failed++;
        console.error(`  ✗ Failed to migrate credentials for user: ${cred.user_id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 2. Migrate Attendance Logs
    logger.info('\n📦 Migrating attendance logs...');
    const attendanceLogs = db.prepare('SELECT * FROM attendance_logs').all() as any[];
    stats.attendanceLogs.total = attendanceLogs.length;

    for (const log of attendanceLogs) {
      try {
        // Parse response if string
        let response = null;
        if (log.response) {
          try {
            response = JSON.parse(log.response);
          } catch {
            response = log.response;
          }
        }

        await AttendanceLogModel.create({
          type: log.type,
          shift: log.shift,
          timecardId: log.timecard_id,
          status: log.status,
          response,
          errorMessage: log.error_message,
          createdAt: new Date(log.created_at),
        });

        stats.attendanceLogs.migrated++;
      } catch (error) {
        stats.attendanceLogs.failed++;
        console.error(`  ✗ Failed to migrate attendance log ID: ${log.id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    logger.info(`  ✓ Migrated ${stats.attendanceLogs.migrated} attendance logs`);

    // 3. Migrate Scheduler Config
    logger.info('\n📦 Migrating scheduler config...');
    const schedulerConfig = db.prepare('SELECT * FROM scheduler_config ORDER BY id DESC LIMIT 1').get() as any;

    if (schedulerConfig) {
      stats.schedulerConfig.total = 1;
      try {
        await SchedulerConfigModel.create({
          isEnabled: schedulerConfig.is_enabled === 1,
          morningClockIn: schedulerConfig.morning_clock_in,
          morningClockOut: schedulerConfig.morning_clock_out,
          afternoonClockIn: schedulerConfig.afternoon_clock_in,
          afternoonClockOut: schedulerConfig.afternoon_clock_out,
          updatedAt: new Date(schedulerConfig.updated_at),
        });

        stats.schedulerConfig.migrated++;
        logger.info('  ✓ Migrated scheduler config');
      } catch (error) {
        stats.schedulerConfig.failed++;
        console.error('  ✗ Failed to migrate scheduler config', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 4. Migrate Leantime Credentials
    logger.info('\n📦 Migrating Leantime credentials...');
    const leantimeCreds = db.prepare('SELECT * FROM leantime_credentials').all() as any[];
    stats.leantimeCredentials.total = leantimeCreds.length;

    for (const leanCred of leantimeCreds) {
      try {
        await LeantimeCredentialsModel.findOneAndUpdate(
          { userId: leanCred.user_id },
          {
            $set: {
              userId: leanCred.user_id,
              accessToken: leanCred.access_token,
              refreshToken: leanCred.refresh_token,
              sessionCookie: leanCred.session_cookie,
              leantimeUrl: leanCred.leantime_url,
              createdAt: new Date(leanCred.created_at),
              updatedAt: new Date(leanCred.updated_at),
            },
          },
          { upsert: true }
        );

        stats.leantimeCredentials.migrated++;
        logger.info(`  ✓ Migrated Leantime credentials for user: ${leanCred.user_id}`);
      } catch (error) {
        stats.leantimeCredentials.failed++;
        console.error(`  ✗ Failed to migrate Leantime credentials for user: ${leanCred.user_id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 5. Migrate Error Logs (last 30 days only)
    logger.info('\n📦 Migrating error logs (last 30 days)...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const errorLogs = db
      .prepare('SELECT * FROM error_logs WHERE created_at > ? ORDER BY created_at DESC')
      .all(thirtyDaysAgo) as any[];
    stats.errorLogs.total = errorLogs.length;

    for (const errLog of errorLogs) {
      try {
        // Parse context if string
        let context = null;
        if (errLog.context) {
          try {
            context = JSON.parse(errLog.context);
          } catch {
            context = errLog.context;
          }
        }

        await ErrorLogModel.create({
          errorCode: errLog.error_code,
          errorMessage: errLog.error_message,
          stackTrace: errLog.stack_trace,
          context,
          createdAt: new Date(errLog.created_at),
        });

        stats.errorLogs.migrated++;
      } catch (error) {
        stats.errorLogs.failed++;
        console.error(`  ✗ Failed to migrate error log ID: ${errLog.id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    logger.info(`  ✓ Migrated ${stats.errorLogs.migrated} error logs`);

    // Print migration summary
    logger.info('\n✅ Migration completed!');
    logger.info('\n📊 Migration Summary:');
    logger.info(`  Credentials: ${stats.credentials.migrated}/${stats.credentials.total} (failed: ${stats.credentials.failed})`);
    logger.info(`  Attendance Logs: ${stats.attendanceLogs.migrated}/${stats.attendanceLogs.total} (failed: ${stats.attendanceLogs.failed})`);
    logger.info(`  Scheduler Config: ${stats.schedulerConfig.migrated}/${stats.schedulerConfig.total} (failed: ${stats.schedulerConfig.failed})`);
    logger.info(`  Leantime Credentials: ${stats.leantimeCredentials.migrated}/${stats.leantimeCredentials.total} (failed: ${stats.leantimeCredentials.failed})`);
    logger.info(`  Error Logs: ${stats.errorLogs.migrated}/${stats.errorLogs.total} (failed: ${stats.errorLogs.failed})`);

    const totalMigrated =
      stats.credentials.migrated +
      stats.attendanceLogs.migrated +
      stats.schedulerConfig.migrated +
      stats.leantimeCredentials.migrated +
      stats.errorLogs.migrated;

    const totalFailed =
      stats.credentials.failed +
      stats.attendanceLogs.failed +
      stats.schedulerConfig.failed +
      stats.leantimeCredentials.failed +
      stats.errorLogs.failed;

    logger.info(`\n  Total: ${totalMigrated} migrated, ${totalFailed} failed`);

    if (totalFailed > 0) {
      logger.warn('\n⚠️  Some records failed to migrate. Check logs for details.');
    } else {
      logger.info('\n🎉 All records migrated successfully!');
    }
  } catch (error) {
    console.error('❌ Migration failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await mongodbConnection.disconnect();
  }
}

// Run migration
if (require.main === module) {
  migrateData()
    .then(() => {
      logger.info('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed', { error });
      process.exit(1);
    });
}

export { migrateData };
