import { LeantimeApiService } from './leantime-api.service';
import { LoginLeantimeDto, LeantimeTokens } from '../dto/auth.dto';
import { leantimeCredentialsRepository } from '../repositories/leantime-credentials.repository';
import * as cheerio from 'cheerio';
import FormData from 'form-data';
import { logger } from '../../../core/logger/logger.service';

export class LeantimeAuthService extends LeantimeApiService {
  constructor(userId: string = 'default') {
    super(userId);
    // Register this instance's refresh logic as the global handler
    LeantimeApiService.setRefreshHandler(this.handleRefreshToken.bind(this));
  }

  /**
   * Login to Leantime and save credentials
   */
  async login(dto: LoginLeantimeDto): Promise<boolean> {
    try {
      const email = dto.email || process.env.LEANTIME_EMAIL;
      const password = dto.password || process.env.LEANTIME_PASSWORD;
      const leantimeUrl = dto.leantimeUrl || process.env.LEANTIME_URL;

      if (!email || !password || !leantimeUrl) {
        throw new Error('Missing Leantime credentials. Check params or ENV.');
      }

      this.client.defaults.baseURL = leantimeUrl;

      // 1. Get login page to fetch CSRF token (if any) and session cookie
      const loginPage = await this.client.get('/auth/login');
      const $ = cheerio.load(loginPage.data);
      const cookies = loginPage.headers['set-cookie']; // Initial session

      // 2. Prepare login data
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      // 'login' must be 'Login' based on successful curl
      formData.append('login', 'Login'); 
      // Required to prevent 500 error
      formData.append('redirectUrl', `${leantimeUrl}/dashboard/home`); 

      // 3. Submit login
      const loginResponse = await this.client.post('/auth/login', formData, {
        headers: {
          ...formData.getHeaders(),
          'Cookie': cookies,
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      // 4. Extract tokens from cookies (Initial Session)
      const responseCookies = loginResponse.headers['set-cookie'];
      if (!responseCookies) throw new Error('No cookies returned from login');
      
      // Parse initial cookies (likely just session)
      let tokens = this.parseCookies(responseCookies);
      logger.info('DEBUG: Initial Login Response Cookies', { cookies: responseCookies });

      // 5. If Access Token is missing, GET dashboard and inspect HTML
      if (!tokens.accessToken) {
         logger.info('Access Token missing in cookies. Inspecting Dashboard HTML...');
         
         const dashboardResponse = await this.client.get('/dashboard/home', {
            headers: { 'Cookie': responseCookies.join('; ') }
         });

         const html = dashboardResponse.data;
         
         // 1. Look for accessToken in JS variables
         // explicit assignment: var accessToken = "..."; or leantime.accessToken = "...";
         const tokenMatch = html.match(/accessToken\s*=\s*['"]([^'"]+)['"]/);
         if (tokenMatch) {
             logger.info('DEBUG: Found accessToken in HTML content');
             tokens.accessToken = tokenMatch[1];
         } else {
             logger.warn('DEBUG: accessToken NOT found in HTML');
         }

         // 2. Look for refreshToken
         const refreshMatch = html.match(/refreshToken\s*=\s*['"]([^'"]+)['"]/);
         if (refreshMatch) {
             tokens.refreshToken = refreshMatch[1];
         }

         // 3. Look for CSRF Token (meta tag)
         const csrfMatch = html.match(/name="csrf-token" content="([^"]+)"/);
         if (csrfMatch) {
             console.log('DEBUG: Found CSRF Token in HTML');
             // We can store this in the repository or just use it for the session
             // For now, let's attach it to the service client defaults for verification
             // But we are using a fresh repository instance in the main script... 
             // We need to pass it to the service manually or store it.
             // Let's store it as 'access_token' temporarily or just use it in the headers below?
             // No, let's just log it and try to USE it in the Verify Script part.
             // But tokens object is returned and saved to DB.
             // We can save CSRF as 'accessToken' if we want to hack it, but that's wrong.
             // Let's just log it for now.
             logger.info('DEBUG: CSRF Token found', { csrf: csrfMatch[1] });
             // Hack: Attach to client defaults for this instance to persist through to next calls (if same instance used)
             this.client.defaults.headers.common['X-CSRF-Token'] = csrfMatch[1];
         }
      }
      
      // Save to DB (using email/userId associated effectively)

      // Save to DB (using email/userId associated effectively)
      // Note: we might want to store it under the specific email used
      const targetUserId = this.userId === 'default' ? email : this.userId;
      
      leantimeCredentialsRepository.save({
        userId: targetUserId,
        leantimeUrl: leantimeUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionCookie: tokens.sessionCookie,
      });

      logger.info(`Leantime login successful for ${targetUserId}`);
      return true;

    } catch (error) {
      logger.error('LEANTIME_AUTH_FAILED', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Refresh the access token using refresh token
   * Registered as static handler in base class
   */
  protected async handleRefreshToken(userId: string): Promise<void> {
    const creds = leantimeCredentialsRepository.findById(userId);
    if (!creds || !creds.refresh_token) {
      throw new Error('No refresh token available');
    }

    // Logic to refresh token - depends on Leantime's specific refresh endpoint
    // Usually it's hitting an authenticated endpoint or a specific refresh route
    // For now, we assume simple session extension or re-login if needed
    // If API uses specific refresh flow, implement here.
    
    // Placeholder: Log warning
    logger.warn('Token refresh requested but specific endpoint logic needs verification. Triggering re-login flow might be needed.');
  }

  private parseCookies(cookies: string[]): LeantimeTokens {
    let accessToken = '';
    let refreshToken = '';
    let sessionCookie = '';

    cookies.forEach(cookie => {
      if (cookie.includes('accessToken=')) {
        accessToken = cookie.split('accessToken=')[1].split(';')[0];
      }
      if (cookie.includes('refreshToken=')) {
        refreshToken = cookie.split('refreshToken=')[1].split(';')[0];
      }
      if (cookie.includes('leantime_session=')) {
        sessionCookie = cookie.split('leantime_session=')[1].split(';')[0];
      }
    });

    return { accessToken, refreshToken, sessionCookie };
  }
}

export const leantimeAuthService = new LeantimeAuthService();
