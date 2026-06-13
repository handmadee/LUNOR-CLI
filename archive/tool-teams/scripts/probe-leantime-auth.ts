
import axios from 'axios';

const TEST_CREDENTIALS = {
  email: process.env.LEANTIME_TEST_EMAIL || 'test@example.com',
  password: process.env.LEANTIME_TEST_PASSWORD || 'change-me',
  url: process.env.LEANTIME_TEST_URL || 'https://project.hilab.cloud'
};

async function probe() {
  const rpcUrl = `${TEST_CREDENTIALS.url}/api/jsonrpc`;
  console.log(`Probing RPC Auth at ${rpcUrl}...`);

  const methods = [
    'leantime.rpc.auth.login',
    'leantime.rpc.users.login',
    'leantime.rpc.auth.signIn',
    'leantime.rpc.Auth.login', // Capitalized?
  ];

  for (const method of methods) {
    try {
      console.log(`\nTesting method: ${method}`);
      const response = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        method: method,
        id: 1,
        params: {
          username: TEST_CREDENTIALS.email,
          password: TEST_CREDENTIALS.password,
          email: TEST_CREDENTIALS.email
        }
      });
      
      console.log(`Status: ${response.status}`);
      if (response.data.error) {
        console.log('RPC Error:', response.data.error);
      } else {
        console.log('✅ RPC Success! Result:', JSON.stringify(response.data.result, null, 2));
        if (response.headers['set-cookie']) {
            console.log('✅ Set-Cookie:', response.headers['set-cookie']);
        }
        return; // Found it
      }
    } catch (e) {
      console.log('HTTP Error:', (e as any).message);
      if (axios.isAxiosError(e) && e.response) {
          console.log('Response data:', e.response.data);
      }
    }
  }

  // 3. Test Basic Auth on RPC
  console.log('\nTesting Basic Auth on RPC...');
  const authHeader = 'Basic ' + Buffer.from(`${TEST_CREDENTIALS.email}:${TEST_CREDENTIALS.password}`).toString('base64');
  
  try {
      const response = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        method: 'leantime.rpc.users.getMyProfile', // Valid method to test auth
        id: 1,
        params: {}
      }, {
          headers: {
              'Authorization': authHeader
          }
      });
      
      console.log(`Status: ${response.status}`);
      if (response.data.error) {
           console.log('Basic Auth RPC Error:', response.data.error);
      } else {
           console.log('✅ Basic Auth RPC Success!', JSON.stringify(response.data.result, null, 2));
           return;
      }
  } catch (e) {
      console.log('Basic Auth Error:', (e as any).message);
      if (axios.isAxiosError(e) && e.response) {
          console.log('Response data:', e.response.data);
      }
  }

  // 4. Test Session Cookie on RPC (re-verify)
  // Need to get session first... skipped for brevity as verified in main script.
}

probe();
