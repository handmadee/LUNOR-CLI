/**
 * Capture Shifts Token Script
 * 
 * Opens browser to Shifts app and waits for user to trigger clock-in/out
 * to capture the correct Shifts API token (aud: staffhub.office.com)
 * 
 * Run with: npx ts-node scripts/capture-shifts-token.ts
 */

import 'dotenv/config';
import puppeteer, { Browser, HTTPRequest } from 'puppeteer';
import { credentialsRepository } from '../src/modules/auth/repositories/credentials.repository';
import { encryptionUtil } from '../src/shared/utils/encryption.util';

const SHIFTS_API_AUDIENCE = 'staffhub.office.com';

interface TokenInfo {
  token: string;
  audience: string;
  expiresAt: Date;
}

function decodeToken(token: string): { aud?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  } catch {
    return null;
  }
}

async function main() {
  console.log('🔐 Shifts Token Capture Tool');
  console.log('=' .repeat(50));
  console.log('\n📋 Instructions:');
  console.log('1. Browser will open to MS Teams Shifts');
  console.log('2. Login if needed');
  console.log('3. Click on "Clock In" or "Clock Out" button');
  console.log('4. Token will be captured automatically');
  console.log('5. Press Ctrl+C when done\n');
  
  let browser: Browser | null = null;
  let capturedShiftsToken: TokenInfo | null = null;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1400,900',
      ],
      defaultViewport: { width: 1400, height: 900 },
    });

    const page = await browser.newPage();
    
    // Intercept requests to capture Shifts API token
    await page.setRequestInterception(true);
    page.on('request', (request: HTTPRequest) => {
      const url = request.url();
      const authHeader = request.headers()['authorization'];
      
      if (authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 100) {
        const token = authHeader.replace('Bearer ', '');
        const decoded = decodeToken(token);
        
        if (decoded?.aud?.includes(SHIFTS_API_AUDIENCE)) {
          capturedShiftsToken = {
            token,
            audience: decoded.aud,
            expiresAt: new Date((decoded.exp || 0) * 1000),
          };
          
          console.log('\n' + '='.repeat(50));
          console.log('✅ SHIFTS API TOKEN CAPTURED!');
          console.log('='.repeat(50));
          console.log(`Audience: ${decoded.aud}`);
          console.log(`Expires: ${capturedShiftsToken.expiresAt.toISOString()}`);
          console.log(`Token length: ${token.length} chars`);
          console.log('\nToken saved to database!');
          
          // Save token to database
          saveToken(token);
        } else if (url.includes('flw.teams.cloud.microsoft') && url.includes('/api/')) {
          console.log(`📡 API Request to: ${url.split('?')[0]}`);
          console.log(`   Token audience: ${decoded?.aud || 'unknown'}`);
        }
      }
      
      request.continue();
    });

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
    );

    // Navigate to Shifts app
    console.log('🌐 Opening Shifts app...');
    await page.goto('https://flw.teams.cloud.microsoft/shifts-web-app', {
      waitUntil: 'networkidle2',
      timeout: 120000,
    });

    console.log('\n⏳ Waiting for you to trigger a clock action...');
    console.log('   Click "Clock In" or "Clock Out" to capture the token.');
    console.log('   Press Ctrl+C when done.\n');
    
    // Keep browser open until user closes or token captured
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (capturedShiftsToken) {
          clearInterval(checkInterval);
          setTimeout(resolve, 3000); // Give time to see the message
        }
      }, 1000);
      
      // Also listen for page close
      page.on('close', () => {
        clearInterval(checkInterval);
        resolve(undefined);
      });
    });

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    if (browser) {
      await browser.close();
    }
    
    if (capturedShiftsToken) {
      console.log('\n🎉 Token capture complete!');
      console.log('You can now close this terminal and test clock-in.');
    } else {
      console.log('\n⚠️ No Shifts API token was captured.');
      console.log('Try clicking "Clock In" or "Clock Out" in the browser.');
    }
  }
}

function saveToken(token: string) {
  const encrypted = encryptionUtil.encrypt(token);
  const teamId = process.env.MS_TEAMS_TEAM_ID || 'UNKNOWN_TEAM';
  
  // Update both 'default' and email user
  ['default', process.env.MS_TEAMS_EMAIL].filter(Boolean).forEach(userId => {
    const existing = credentialsRepository.findById(userId!);
    if (existing) {
      credentialsRepository.save({
        userId: userId!,
        teamId: existing.team_id || teamId,
        accessToken: encrypted,
        deviceId: existing.device_id || undefined,
        sessionId: existing.session_id || undefined,
      });
      console.log(`✅ Token saved for ${userId}`);
    }
  });
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Exiting...');
  process.exit(0);
});

main().catch(console.error);
