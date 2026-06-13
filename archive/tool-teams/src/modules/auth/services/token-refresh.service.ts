import puppeteer, { Browser } from 'puppeteer';
import { CookieData } from './auth.service';
import { logger } from '../../../core/logger';

/**
 * Token Refresh Result
 */
interface RefreshResult {
  success: boolean;
  accessToken?: string;
  cookies?: CookieData[];
  error?: string;
}

/**
 * Token Refresh Service
 * 
 * Handles automatic token refresh using stored cookies.
 */
class TokenRefreshService {
  /**
   * Refresh token using cookies
   */
  async refreshWithCookies(cookies: CookieData[]): Promise<RefreshResult> {
    if (!cookies || cookies.length === 0) {
      return { success: false, error: 'No cookies available for refresh' };
    }

    let browser: Browser | null = null;

    try {
      logger.info('Starting token refresh with cookies...');

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
      );

      // Set cookies
      const puppeteerCookies = cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        httpOnly: c.httpOnly ?? false,
        secure: c.secure ?? true,
      }));
      await page.setCookie(...puppeteerCookies);

      // Navigate to Shifts
      await page.goto('https://flw.teams.cloud.microsoft/shifts-web-app', {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract token from localStorage/sessionStorage
      const token = await page.evaluate(() => {
        const keys = Object.keys(window.localStorage);
        for (const key of keys) {
          const value = window.localStorage.getItem(key);
          if (value && value.includes('eyJ')) {
            try {
              const parsed = JSON.parse(value);
              if (parsed.accessToken || parsed.token) {
                return parsed.accessToken || parsed.token;
              }
            } catch {
              if (value.startsWith('eyJ')) {
                return value;
              }
            }
          }
        }

        const sessionKeys = Object.keys(window.sessionStorage);
        for (const key of sessionKeys) {
          const value = window.sessionStorage.getItem(key);
          if (value && value.startsWith('eyJ')) {
            return value;
          }
        }

        return null;
      });

      // Get updated cookies
      const newCookies = await page.cookies();
      const cookieData: CookieData[] = newCookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
      }));

      await browser.close();
      browser = null;

      if (token) {
        logger.info('Token refresh successful');
        return {
          success: true,
          accessToken: token,
          cookies: cookieData,
        };
      }

      return { success: false, error: 'Could not extract token after refresh' };
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Token refresh failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}

// Singleton instance
export const tokenRefreshService = new TokenRefreshService();
