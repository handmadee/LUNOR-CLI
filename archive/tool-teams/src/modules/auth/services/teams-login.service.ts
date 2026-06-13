import puppeteer, { Browser, Page, HTTPRequest } from 'puppeteer';
import { CookieData } from './auth.service';
import { logger } from '../../../core/logger';

/**
 * Login Result
 */
export interface LoginResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;  // OAuth refresh token for token renewal
  teamId?: string;
  userObjectId?: string;
  tenantId?: string;
  deviceId?: string;
  sessionId?: string;
  cookies?: CookieData[];
  error?: string;
  displayName?: string;
}

/**
 * Helper function to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Teams Login Service
 * 
 * Automates MS Teams login using Puppeteer to extract tokens and cookies.
 * Intercepts network requests to capture Bearer token.
 */
class TeamsLoginService {
  /**
   * Login to MS Teams and extract access token + cookies
   */
  async login(email: string, password: string): Promise<LoginResult> {
    let browser: Browser | null = null;
    let capturedShiftsToken: string | undefined;
    let capturedFallbackToken: string | undefined;
    let capturedRefreshToken: string | undefined;
    let capturedHeaders: Record<string, string> = {};

    try {
      logger.info(`Starting MS Teams login for ${email}...`);

      browser = await puppeteer.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1280,800',
        ],
        defaultViewport: { width: 1280, height: 800 },
      });

      const page = await browser.newPage();

      // Intercept RESPONSES from OAuth endpoint to capture tokens
      // Priority: 
      // 1. StaffHub API token with Shift.ReadWrite.All scope (for internal Shifts API)
      // 2. Graph API token with Schedule.ReadWrite.All scope  
      // 3. General Graph API token (fallback)
      page.on('response', async (response) => {
        const url = response.url();
        
        // Check if this is an OAuth token response
        if (url.includes('login.microsoftonline.com') && 
            url.includes('/oauth2/v2.0/token') &&
            response.status() === 200) {
          try {
            const data = await response.json() as any;
            
            if (data.access_token) {
              const tokenAudience = this.getTokenAudience(data.access_token);
              const scopes = data.scope || '';
              
              // Check for important scopes
              const hasShiftScope = scopes.includes('Shift.ReadWrite.All');
              const hasScheduleScope = scopes.includes('Schedule.ReadWrite.All');
              const isStaffHubAudience = tokenAudience?.includes('staffhub.office.com') || 
                                          tokenAudience?.includes('api.manage.staffhub');
              const isGraphAudience = tokenAudience === 'https://graph.microsoft.com' ||
                                       tokenAudience?.includes('graph.microsoft.com');
              
              // Log all captured tokens for debugging
              logger.info(`📋 OAuth token captured:`);
              logger.info(`   Audience: ${tokenAudience}`);
              logger.info(`   hasShiftScope: ${hasShiftScope}, hasScheduleScope: ${hasScheduleScope}`);
              logger.info(`   Scopes: ${scopes.substring(0, 150)}...`);
              
              // Priority 1: StaffHub token with Shift.ReadWrite.All scope (BEST for internal API)
              if (isStaffHubAudience && hasShiftScope) {
                capturedShiftsToken = data.access_token;
                capturedRefreshToken = data.refresh_token;
                logger.info('✅ PRIORITY 1: StaffHub API token with Shift.ReadWrite.All captured!');
                logger.info('   This is the IDEAL token for clock-in/out via internal API');
              }
              // Priority 2: Graph API token with Schedule.ReadWrite.All scope
              else if (isGraphAudience && hasScheduleScope && !capturedShiftsToken) {
                capturedShiftsToken = data.access_token;
                capturedRefreshToken = data.refresh_token;
                logger.info('✅ PRIORITY 2: Graph API token with Schedule.ReadWrite.All captured!');
              }
              // Priority 3: StaffHub token without explicit Shift scope (still usable)
              else if (isStaffHubAudience && !capturedShiftsToken) {
                capturedShiftsToken = data.access_token;
                capturedRefreshToken = data.refresh_token;
                logger.info('✅ PRIORITY 3: StaffHub API token captured (no explicit Shift scope)');
              }
              // Priority 4: Graph API token without Schedule scope (fallback)
              else if (isGraphAudience && !capturedShiftsToken) {
                capturedFallbackToken = data.access_token;
                // Also capture refresh token here for exchange logic later
                if (data.refresh_token) {
                  capturedRefreshToken = data.refresh_token; 
                }
                logger.info(`ℹ️ FALLBACK: Graph API token captured (no Schedule scope)`);
              }
            }
          } catch (e) {
            // Not JSON or parse error - ignore
          }
        }
      });

      // Intercept requests to capture Bearer token
      // Priority:
      // 1. Token with audience = https://graph.microsoft.com (Graph API - most reliable)
      // 2. Token with audience = aa580612-c342-4ace-9055-8edee43ccb89 (Teams Shifts app ID)
      // 3. Token with audience = staffhub.office.com
      // 4. Token from flw.teams.cloud.microsoft API requests
      await page.setRequestInterception(true);
      page.on('request', (request: HTTPRequest) => {
        const url = request.url();
        const authHeader = request.headers()['authorization'];

        if (authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 100) {
          const token = authHeader.replace('Bearer ', '');

          // Check if this is a Shifts API token by decoding JWT audience
          const tokenAudience = this.getTokenAudience(token);

          // Check if request is to Shifts API (flw.teams.cloud.microsoft with /api/ path)
          const isShiftsApiRequest = url.includes('flw.teams.cloud.microsoft') &&
                                     (url.includes('/api/') || url.includes('/svc-'));
          
          // Check if request is to Graph API
          const isGraphApiRequest = url.includes('graph.microsoft.com');

          // Skip tokens with Skype/Spaces/IC3 audience (these are for Teams chat, not Shifts)
          if (tokenAudience?.includes('api.spaces.skype.com') || 
              tokenAudience?.includes('ic3.teams.office.com')) {
            logger.info(`⏭️ Skipping ${tokenAudience?.includes('skype') ? 'Skype/Spaces' : 'IC3'} token (not for Shifts API)`);
            request.continue();
            return;
          }

          // Priority 1: Microsoft Graph API token (most reliable for Shifts operations)
          if (tokenAudience === 'https://graph.microsoft.com' || 
              tokenAudience === '00000003-0000-0000-c000-000000000000') {
            capturedShiftsToken = token;
            logger.info('✅ Graph API token captured (https://graph.microsoft.com)');
          }
          // Priority 2: Token with Teams Shifts app ID audience
          else if (tokenAudience === 'aa580612-c342-4ace-9055-8edee43ccb89') {
            if (!capturedShiftsToken) {
              capturedShiftsToken = token;
              logger.info('✅ Shifts API token captured (Teams Shifts app ID)');
            }
          }
          // Priority 3: Token with staffhub.office.com audience
          else if (tokenAudience?.includes('staffhub.office.com')) {
            if (!capturedShiftsToken) {
              capturedShiftsToken = token;
              logger.info('✅ Shifts API token captured (staffhub.office.com)');
            }
          }
          // Priority 4: Token from Graph API or Shifts API request
          else if ((isShiftsApiRequest || isGraphApiRequest) && !capturedShiftsToken) {
            capturedShiftsToken = token;
            logger.info(`✅ API token captured from ${url.split('/').slice(0, 4).join('/')} (audience: ${tokenAudience || 'unknown'})`);
          }
          // Fallback: Keep first non-Skype/IC3 token
          else if (!capturedFallbackToken) {
            capturedFallbackToken = token;
            logger.info(`📋 Bearer token captured as fallback (audience: ${tokenAudience || 'unknown'})`);
          }

          // Capture other useful headers
          const headers = request.headers();
          if (headers['clientsessionid']) capturedHeaders['sessionId'] = headers['clientsessionid'];
          if (headers['x-ms-shft-dev']) {
            try {
              const decoded = Buffer.from(headers['x-ms-shft-dev'], 'base64').toString();
              const deviceInfo = JSON.parse(decoded);
              if (deviceInfo.deviceId) capturedHeaders['deviceId'] = deviceInfo.deviceId;
            } catch {}
          }
        }
        request.continue();
      });

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
      );

      // Navigate to Teams login
      logger.info('Navigating to MS Teams login...');
      await page.goto('https://teams.microsoft.com', {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Enter email
      logger.info('Entering email...');
      await page.waitForSelector('input[type="email"]', { timeout: 30000 });
      await page.type('input[type="email"]', email, { delay: 30 });
      await page.click('input[type="submit"]');

      // Wait and enter password
      await delay(2000);
      logger.info('Entering password...');
      await page.waitForSelector('input[type="password"]', { timeout: 30000 });
      await page.type('input[type="password"]', password, { delay: 30 });
      await page.click('input[type="submit"]');

      // Handle "Stay signed in?" prompt
      try {
        await page.waitForSelector('input[type="submit"][value="Yes"]', { timeout: 10000 });
        await page.click('input[type="submit"][value="Yes"]');
        logger.info('Clicked "Stay signed in"');
      } catch {
        logger.info('No "Stay signed in" prompt');
      }

      // Wait for Teams to fully load
      logger.info('Waiting for Teams to load...');
      await delay(8000);

      // Navigate to Shifts to trigger API calls with token
      logger.info('Navigating to Shifts app...');
      await page.goto('https://flw.teams.cloud.microsoft/shifts-web-app', {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Wait for initial load
      await delay(3000);

      // Try to interact with Shifts app to trigger staffhub API calls
      logger.info('Interacting with Shifts app to capture Shifts API token...');
      
      // Try clicking on team selector or schedule elements that trigger staffhub API
      try {
        // Wait for the page to fully load with Shifts content
        await page.waitForSelector('[data-testid], [class*="shifts"], [class*="schedule"], button, [role="button"]', { 
          timeout: 15000 
        });
        
        // Click on any available schedule/shift elements
        const clickableElements = await page.$$('[data-testid*="team"], [data-testid*="shift"], [class*="team-picker"], button[class*="schedule"]');
        for (const el of clickableElements.slice(0, 3)) {
          try {
            await el.click();
            await delay(1000);
          } catch {}
        }
        
        // Try clicking on time clock button if available
        try {
          const clockButton = await page.$('[data-testid*="clock"], [class*="time-clock"], button:has-text("Clock")');
          if (clockButton) {
            await clockButton.click();
            await delay(2000);
          }
        } catch {}
        
      } catch (e) {
        logger.info('Could not find specific Shifts UI elements, continuing...');
      }

      // Wait more for any triggered API calls
      await delay(5000);
      
      // If still no Shifts token, try navigating to specific team
      if (!capturedShiftsToken) {
        logger.info('Shifts token not yet captured, trying team-specific navigation...');
        try {
          // Try to get teamId from URL or env
          const envTeamId = process.env.MS_TEAMS_TEAM_ID;
          if (envTeamId) {
            const teamIdClean = envTeamId.replace('TEAM_', '');
            await page.goto(`https://flw.teams.cloud.microsoft/shifts-web-app/teams/${teamIdClean}/schedule`, {
              waitUntil: 'networkidle0',
              timeout: 30000,
            });
            await delay(5000);
          }
        } catch {}
      }

      // Final attempt: Inject fetch request to Shifts API to force token request
      if (!capturedShiftsToken) {
        logger.info('Attempting direct API call injection to capture Shifts token...');
        try {
          const envTeamId = process.env.MS_TEAMS_TEAM_ID;
          if (envTeamId) {
            const teamIdClean = envTeamId.replace('TEAM_', '');
            
            // Execute fetch from browser context - this forces OAuth to request Shifts token
            await page.evaluate(async (teamId) => {
              try {
                // Try both Graph API and internal Shifts API
                const endpoints = [
                  `https://graph.microsoft.com/v1.0/teams/${teamId}/schedule/timeCards`,
                  `https://flw.teams.cloud.microsoft/svc-apac1/api/v2/teams/${teamId}/timeclock`,
                ];
                
                for (const url of endpoints) {
                  try {
                    await fetch(url, {
                      method: 'GET',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                    });
                  } catch {}
                }
              } catch {}
            }, teamIdClean);
            
            await delay(3000);
          }
        } catch (e) {
          logger.info('Direct API call injection failed, continuing...');
        }
      }

      // Extract cookies
      const cookies = await this.extractCookies(page);

      // Extract URL params for teamId, userObjectId, tenantId
      const urlInfo = await this.extractFromUrl(page);

      await browser.close();
      browser = null;

      if (capturedShiftsToken || capturedFallbackToken) {
        // Prefer Shifts API token, fallback to any captured token
        let finalToken = capturedShiftsToken || capturedFallbackToken;
        let finalRefreshToken = capturedRefreshToken;

        // Validate the token audience
        const validation = this.validateTokenAudience(finalToken!);

        // If we don't have a valid Shifts token, try to exchange refresh_token for StaffHub token
        if (!capturedShiftsToken && capturedRefreshToken && urlInfo.tenantId) {
          logger.info('🔄 Attempting to exchange refresh_token for StaffHub token...');
          try {
            const { oauth2Service } = await import('./oauth2.service');
            const TEAMS_SHIFTS_CLIENT_ID = 'aa580612-c342-4ace-9055-8edee43ccb89';
            
            const exchangeResult = await oauth2Service.refreshToken(
              capturedRefreshToken,
              urlInfo.tenantId,
              TEAMS_SHIFTS_CLIENT_ID
            );

            if (exchangeResult.success && exchangeResult.accessToken) {
              logger.info('✅ Successfully exchanged refresh_token for StaffHub token!');
              finalToken = exchangeResult.accessToken;
              finalRefreshToken = exchangeResult.refreshToken || capturedRefreshToken;
              
              // Validate new token
              const newValidation = this.validateTokenAudience(finalToken);
              logger.info(`   New token audience: ${newValidation.audience}`);
            } else {
              logger.warn(`⚠️ Failed to exchange refresh_token: ${exchangeResult.error}`);
            }
          } catch (error: any) {
            logger.warn(`⚠️ Error exchanging refresh_token: ${error.message}`);
          }
        } else if (capturedShiftsToken) {
          if (validation.valid) {
            logger.info(`✅ Login successful! Using validated Shifts API token (audience: ${validation.audience})`);
          } else {
            logger.warn(`⚠️ Captured Shifts token has invalid audience: ${validation.audience || 'unknown'}`);
            logger.warn(`Reason: ${validation.reason}`);
            logger.warn('This token may not work for clock-in/out operations.');
          }
        } else {
          logger.warn(`⚠️ Shifts API token not captured. Using fallback token (audience: ${validation.audience || 'unknown'})`);
          if (!validation.valid) {
            logger.warn(`⚠️ Fallback token validation failed: ${validation.reason}`);
            logger.warn('This token may not work for clock-in/out operations.');
          }
        }

        // Fetch user profile (display name)
        const profile = await this.fetchUserProfile(finalToken!);

        logger.info(`Profile fetched: ${profile.displayName || 'N/A'}`);

        return {
          success: true,
          accessToken: finalToken!,
          refreshToken: finalRefreshToken,
          teamId: urlInfo.teamId,
          userObjectId: urlInfo.userObjectId,
          tenantId: urlInfo.tenantId,
          deviceId: capturedHeaders['deviceId'],
          sessionId: capturedHeaders['sessionId'],
          cookies,
          displayName: profile.displayName,
        };
      }

      // Fallback: return cookies anyway for manual token update
      return {
        success: false,
        error: 'Could not capture token automatically. Cookies saved - you can update token manually.',
        cookies,
        teamId: urlInfo.teamId,
        userObjectId: urlInfo.userObjectId,
        tenantId: urlInfo.tenantId,
      };
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Login failed: ${errorMessage}`);
      return {
        success: false,
        error: `Login failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Fetch user profile from Microsoft Graph
   */
  private async fetchUserProfile(token: string): Promise<{ displayName?: string }> {
    try {
      // Try Microsoft Graph first
      const axios = require('axios');
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { displayName: response.data.displayName };
    } catch (error) {
      logger.warn('Failed to fetch profile from Graph API. Trying fallback...');
      return {};
    }
  }

  /**
   * Extract JWT audience from token (for filtering Shifts API tokens)
   */
  private getTokenAudience(token: string): string | undefined {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return undefined;

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.aud;
    } catch {
      return undefined;
    }
  }

  /**
   * Validate token audience - check if token is suitable for Shifts API
   */
  private validateTokenAudience(token: string): { valid: boolean; audience?: string; reason?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, reason: 'Invalid JWT format' };
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const audience = payload.aud;

      // Valid audiences for Shifts API
      const validAudiences = [
        'aa580612-c342-4ace-9055-8edee43ccb89', // Teams Shifts app ID
        'staffhub.office.com',                    // Staffhub API
      ];

      // Invalid audiences
      if (audience?.includes('api.spaces.skype.com')) {
        return { valid: false, audience, reason: 'Token is for Skype/Spaces API, not Shifts' };
      }

      if (validAudiences.some(valid => audience === valid || audience?.includes(valid))) {
        return { valid: true, audience };
      }

      return { valid: false, audience, reason: 'Audience does not match Shifts API requirements' };
    } catch (error) {
      return { valid: false, reason: 'Failed to parse token' };
    }
  }

  /**
   * Extract info from URL
   */
  private async extractFromUrl(page: Page): Promise<{
    teamId?: string;
    userObjectId?: string;
    tenantId?: string;
  }> {
    try {
      const url = page.url();
      
      // Try to get from URL params
      const urlObj = new URL(url);
      const teamId = urlObj.searchParams.get('teamId') || undefined;
      const tid = urlObj.searchParams.get('tid') || undefined;
      
      // Try to get from page content
      const pageData = await page.evaluate(() => {
        // Try to find in page scripts or data
        const scripts = document.querySelectorAll('script');
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          const content = script.textContent || '';
          const teamIdMatch = content.match(/teamId['":\s]+(['"])(TEAM_[^'"]+)\1/);
          const userMatch = content.match(/userObjectId['":\s]+(['"])([^'"]+)\1/);
          const tenantMatch = content.match(/tenantId['":\s]+(['"])([^'"]+)\1/);
          
          if (teamIdMatch || userMatch || tenantMatch) {
            return {
              teamId: teamIdMatch?.[2],
              userObjectId: userMatch?.[2],
              tenantId: tenantMatch?.[2],
            };
          }
        }
        return {};
      });

      return {
        teamId: teamId || pageData.teamId,
        userObjectId: pageData.userObjectId,
        tenantId: tid || pageData.tenantId,
      };
    } catch {
      return {};
    }
  }

  /**
   * Extract cookies from page
   */
  private async extractCookies(page: Page): Promise<CookieData[]> {
    try {
      const cookies = await page.cookies();
      return cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
      }));
    } catch {
      return [];
    }
  }
}

// Singleton instance
export const teamsLoginService = new TeamsLoginService();
