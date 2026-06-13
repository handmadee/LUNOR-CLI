import { leantimeCredentialsRepository } from '../src/modules/leantime/repositories/leantime-credentials.repository';
import { LeantimeTasksService } from '../src/modules/leantime/services/leantime-tasks.service';
import { LeantimeProjectsService } from '../src/modules/leantime/services/leantime-projects.service';

const TEST_USER = 'datpx@hilab.asia';

async function testTasks() {
  try {
    console.log('========================================');
    console.log('🧪 LEANTIME TASKS API TEST');
    console.log('========================================\n');

    // Check credentials
    const creds = leantimeCredentialsRepository.findById(TEST_USER);
    if (!creds) {
      console.error('❌ No credentials found. Run /leantime_login first.');
      return;
    }
    console.log('✅ Credentials found for:', TEST_USER);
    console.log('   URL:', creds.leantime_url);
    console.log('   Has Session:', !!creds.session_cookie);

    // Get projects first
    console.log('\n📂 FETCHING PROJECTS...');
    const projectService = new LeantimeProjectsService(TEST_USER);
    const projects = await projectService.getMyProjects();
    console.log(`✅ Found ${projects.length} projects`);
    
    if (projects.length === 0) {
      console.log('⚠️ No projects found, cannot test tasks.');
      return;
    }

    // Use first project
    const testProjectId = projects[0].id;
    console.log(`\n📋 FETCHING TASKS FOR PROJECT ${testProjectId} (${projects[0].name})...`);

    const taskService = new LeantimeTasksService(TEST_USER);
    const tasks = await taskService.getAllTasks({ projectId: testProjectId });
    
    console.log(`\n✅ Found ${tasks.length} tasks`);
    
    if (tasks.length > 0) {
      console.log('\n📝 Sample tasks:');
      tasks.slice(0, 5).forEach((t: any, i: number) => {
        console.log(`  ${i + 1}. [${t.status || 'N/A'}] ${t.headline || 'Untitled'} (ID: ${t.id})`);
        console.log(`     Priority: ${t.priority || 'N/A'}, Project: ${t.projectId}`);
      });

      // Test single task fetch
      console.log('\n🔍 FETCHING SINGLE TASK DETAILS...');
      const singleTask = await taskService.getTask(tasks[0].id);
      console.log('✅ Task details:', JSON.stringify(singleTask, null, 2));
    } else {
      console.log('⚠️ No tasks in this project.');
    }

    console.log('\n========================================');
    console.log('✅ TEST COMPLETE');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if ((error as any).response?.data) {
      console.error('Response:', JSON.stringify((error as any).response.data, null, 2));
    }
  }
}

testTasks();
