import { leantimeAuthService } from '../src/modules/leantime/services/leantime-auth.service';
import { leantimeCredentialsRepository } from '../src/modules/leantime/repositories/leantime-credentials.repository';
import axios from 'axios';

// verifyLogin();
const TEST_CREDENTIALS = {
  email: process.env.LEANTIME_TEST_EMAIL || 'test@example.com',
  password: process.env.LEANTIME_TEST_PASSWORD || 'change-me',
  url: process.env.LEANTIME_TEST_URL || 'https://project.hilab.cloud'
};

async function verifyLogin() {
  try {
    console.log(`Testing Leantime Login to ${TEST_CREDENTIALS.url}...`);
    
    // Attempt Login
    const success = await leantimeAuthService.login({
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
      leantimeUrl: TEST_CREDENTIALS.url 
    });

    if (success) {
      console.log('✅ Login Successful!');
      
      // Check credentials for the specific user we logged in as
      const creds = leantimeCredentialsRepository.findById(TEST_CREDENTIALS.email); 
      
      console.log(`Stored Credentials (User: ${TEST_CREDENTIALS.email}):`, {
        found: !!creds,
        leantimeUrl: creds?.leantime_url,
        hasSession: !!creds?.session_cookie,
        hasToken: !!creds?.access_token
      });

      if (!creds) {
          console.error('❌ Credentials not saved for user!');
          return;
      }

      // Test getting projects directly
      console.log('Testing Get Projects with LeantimeProjectsService...');
      // Note: We use dynamic require if needed, or import. 
      // Since this is a standalone script, we need to ensure we get the Class constructor.
      // leantime-projects.service.ts exports `export class LeantimeProjectsService`
      const { LeantimeProjectsService } = require('../src/modules/leantime/services/leantime-projects.service');
      const projectService = new LeantimeProjectsService(TEST_CREDENTIALS.email);
      
      try {
        const projects = await projectService.getMyProjects();
        console.log(`✅ Found ${projects.length} projects`);
        if(projects.length > 0) console.log('First project:', projects[0]);
      } catch (e) {
        console.error('❌ Project fetch failed:', (e as Error).message);
      }
      
    } else {
      console.error('❌ Login Failed');
    }
  } catch (error) {
    console.error('❌ Error during login test:', error);
    if (axios.isAxiosError(error)) {
        console.error('Response Data:', error.response?.data);
        console.error('Response Status:', error.response?.status);
    }
  }
}

verifyLogin();
