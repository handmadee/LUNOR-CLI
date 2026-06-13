/**
 * Seed Credentials Script
 * 
 * Seeds default credentials from ENV variables.
 * Run with: npx ts-node scripts/seed-credentials.ts
 */

import 'dotenv/config';
import { credentialsRepository } from '../src/modules/auth/repositories/credentials.repository';
import { encryptionUtil } from '../src/shared/utils/encryption.util';
import { logger } from '../src/core/logger/logger.service';

interface SeedConfig {
  // MS Teams
  msTeamsEmail?: string;
  msTeamsTeamId?: string;
  msTeamsToken?: string;
  
  // Leantime
  leantimeUrl?: string;
  leantimeEmail?: string;
  leantimePassword?: string;
}

function loadConfigFromEnv(): SeedConfig {
  return {
    msTeamsEmail: process.env.MS_TEAMS_EMAIL,
    msTeamsTeamId: process.env.MS_TEAMS_TEAM_ID,
    msTeamsToken: process.env.MS_TEAMS_TOKEN,
    leantimeUrl: process.env.LEANTIME_URL,
    leantimeEmail: process.env.LEANTIME_EMAIL,
    leantimePassword: process.env.LEANTIME_PASSWORD,
  };
}

async function seedMsTeamsCredentials(config: SeedConfig): Promise<void> {
  if (!config.msTeamsEmail || !config.msTeamsTeamId) {
    console.log('⚠️  MS Teams credentials not configured in ENV (MS_TEAMS_EMAIL, MS_TEAMS_TEAM_ID)');
    return;
  }

  const userId = config.msTeamsEmail;
  const existing = credentialsRepository.findById(userId);

  if (existing) {
    // Update existing - only update teamId if different
    if (existing.team_id !== config.msTeamsTeamId) {
      console.log(`🔄 Updating teamId for ${userId}: ${existing.team_id} → ${config.msTeamsTeamId}`);
      
      credentialsRepository.save({
        userId,
        teamId: config.msTeamsTeamId,
        accessToken: existing.access_token, // Keep existing encrypted token
        deviceId: existing.device_id || undefined,
        sessionId: existing.session_id || undefined,
      });
      
      console.log('✅ TeamId updated');
    } else {
      console.log(`✅ MS Teams credentials already up-to-date for ${userId}`);
    }
  } else {
    // Create new entry
    console.log(`📝 Creating new MS Teams credentials for ${userId}`);
    
    const token = config.msTeamsToken || 'PLACEHOLDER_TOKEN';
    
    credentialsRepository.save({
      userId,
      teamId: config.msTeamsTeamId,
      accessToken: encryptionUtil.encrypt(token),
      deviceId: `DEV_SEED_${Date.now()}`,
      sessionId: `SESSION_SEED_${Date.now()}`,
    });
    
    console.log('✅ MS Teams credentials created');
  }

  // Also update 'default' user if different from email
  if (userId !== 'default') {
    const defaultCreds = credentialsRepository.findById('default');
    if (defaultCreds && defaultCreds.team_id !== config.msTeamsTeamId) {
      console.log(`🔄 Updating default user teamId...`);
      credentialsRepository.save({
        userId: 'default',
        teamId: config.msTeamsTeamId,
        accessToken: defaultCreds.access_token,
        deviceId: defaultCreds.device_id || undefined,
        sessionId: defaultCreds.session_id || undefined,
      });
      console.log('✅ Default user updated');
    }
  }
}

async function main() {
  console.log('🌱 Starting credential seeding...\n');
  
  const config = loadConfigFromEnv();
  
  console.log('📋 Config from ENV:');
  console.log(`   MS_TEAMS_EMAIL: ${config.msTeamsEmail || '(not set)'}`);
  console.log(`   MS_TEAMS_TEAM_ID: ${config.msTeamsTeamId || '(not set)'}`);
  console.log(`   LEANTIME_URL: ${config.leantimeUrl || '(not set)'}`);
  console.log(`   LEANTIME_EMAIL: ${config.leantimeEmail || '(not set)'}`);
  console.log('');
  
  await seedMsTeamsCredentials(config);
  
  console.log('\n🎉 Seeding complete!');
}

main().catch(console.error);
