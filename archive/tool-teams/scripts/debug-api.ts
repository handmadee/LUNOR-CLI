
/**
 * DEBUG SCRIPT for Leantime API
 * Run this to verify if the API actually returns data.
 * Usage: npx ts-node scripts/debug-api.ts
 */

import 'dotenv/config';
import { LeantimeTasksService } from '../src/modules/leantime/services/leantime-tasks.service';
import { leantimeCredentialsRepository } from '../src/modules/leantime/repositories/leantime-credentials.repository';
import { LeantimeUsersService } from '../src/modules/leantime/services/leantime-users.service';

async function run() {
  console.log('🔍 Starting API Debug...');
  
  // 1. Get first available credential
  const allCreds = leantimeCredentialsRepository.findAll();
  if (allCreds.length === 0) {
    console.error('❌ No credentials found in DB. Please login via Telegram first.');
    return;
  }
  
  const cred = allCreds[0];
  console.log(`👤 Using user: ${cred.user_id}`);
  
  const service = new LeantimeTasksService(cred.user_id);
  const usersService = new LeantimeUsersService(cred.user_id);
  
  try {
    // 2. Resolve Leantime User ID
    console.log('🆔 resolving Leantime User ID...');
    const leantimeUserId = await usersService.getUserIdByEmail(cred.user_id);
    console.log(`✅ Leantime ID: ${leantimeUserId}`);

    // 3. Test getAllTasks with Project ID 5
    const projectId = 5;
    console.log(`🚀 Calling getAllTasks({ projectId: ${projectId} })...`);
    
    // Check if we need to pass a number or string
    // Try both or check what happens
    const tasks = await service.getAllTasks({ projectId: projectId });
    
    console.log(`📦 Response received!`);
    console.log(`📊 Total tasks: ${tasks.length}`);
    
    if (tasks.length > 0) {
      console.log('📝 First task sample:', JSON.stringify(tasks[0], null, 2));
    }
    
    // 4. Simulate Filter
    const today = new Date().toISOString().slice(0, 10);
    console.log(`📅 Today: ${today}`);
    
    const doneTasks = tasks.filter((t: any) => {
      const statusNum = typeof t.status === 'number' ? t.status : parseInt(t.status, 10);
      return statusNum === 0; // Done
    });
    console.log(`✅ Tasks with status 0 (Done): ${doneTasks.length}`);

    if (doneTasks.length > 0) {
      const sampleId = doneTasks[0].id;
      console.log(`🕵️‍♀️ Fetching FULL DETAILS for Task ${sampleId}...`);
      
      try {
        const details = await service.getTask(sampleId) as any;
        console.log('📝 Task Details Keys:', Object.keys(details));
        console.log('   date:', details.date);
        console.log('   dateModified:', details.dateModified || 'N/A');
        console.log('   modified:', details.modified || 'N/A');
        console.log('   editFrom:', details.editFrom || 'N/A');
      } catch (e) {
        console.error('Failed to get task details:', e);
      }
    }

  } catch (error) {
    console.error('❌ API Call Failed:', error);
    if ((error as any).response) {
       console.error('🔴 Response Data:', (error as any).response.data);
    }
  }
}

run();
