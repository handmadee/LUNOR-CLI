import { logger } from '../../../core/logger';

/**
 * Token Diagnostics Utility
 *
 * Provides utilities to diagnose token issues and validate token audience.
 */

export interface TokenInfo {
  valid: boolean;
  audience?: string;
  issuer?: string;
  expiresAt?: string;
  subject?: string;
  appId?: string;
  reason?: string;
}

/**
 * Decode and analyze a JWT token
 */
export function analyzeToken(token: string): TokenInfo {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid JWT format (expected 3 parts)' };
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    const audience = payload.aud;
    const issuer = payload.iss;
    const expiresAt = payload.exp
      ? new Date(payload.exp * 1000).toISOString()
      : undefined;
    const subject = payload.sub;
    const appId = payload.appid;

    // Valid audiences for Shifts API (both internal API and Graph API)
    const validAudiences = [
      'aa580612-c342-4ace-9055-8edee43ccb89', // Teams Shifts app ID (internal API)
      'staffhub.office.com',                   // Staffhub API (internal)
      'https://api.manage.staffhub.office.com', // StaffHub managed API (for clock-in/out)
      'https://graph.microsoft.com',           // Microsoft Graph API
      '00000003-0000-0000-c000-000000000000', // MS Graph App ID
    ];

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return {
        valid: false,
        audience,
        issuer,
        expiresAt,
        subject,
        appId,
        reason: `Token expired at ${expiresAt}`,
      };
    }

    // Check for invalid audiences
    if (audience?.includes('api.spaces.skype.com')) {
      return {
        valid: false,
        audience,
        issuer,
        expiresAt,
        subject,
        appId,
        reason: 'Token is for Skype/Spaces API (not valid for Shifts API)',
      };
    }

    // Check for valid audience
    const hasValidAudience = validAudiences.some(
      valid => audience === valid || audience?.includes(valid)
    );

    if (!hasValidAudience) {
      return {
        valid: false,
        audience,
        issuer,
        expiresAt,
        subject,
        appId,
        reason: `Audience "${audience}" does not match Shifts API requirements. Expected: ${validAudiences.join(' or ')}`,
      };
    }

    return {
      valid: true,
      audience,
      issuer,
      expiresAt,
      subject,
      appId,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Failed to parse token: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Print detailed token diagnostics
 */
export function printTokenDiagnostics(token: string, userId: string = 'default'): void {
  const info = analyzeToken(token);

  logger.info('=== Token Diagnostics ===');
  logger.info(`User ID: ${userId}`);
  logger.info(`Valid for Shifts API: ${info.valid ? '✅ YES' : '❌ NO'}`);

  if (info.audience) {
    logger.info(`Audience: ${info.audience}`);
  }

  if (info.issuer) {
    logger.info(`Issuer: ${info.issuer}`);
  }

  if (info.expiresAt) {
    const isExpired = new Date(info.expiresAt) < new Date();
    logger.info(`Expires: ${info.expiresAt} ${isExpired ? '(EXPIRED ❌)' : '(Valid ✅)'}`);
  }

  if (info.subject) {
    logger.info(`Subject: ${info.subject}`);
  }

  if (info.appId) {
    logger.info(`App ID: ${info.appId}`);
  }

  if (info.reason) {
    logger.warn(`❌ Issue: ${info.reason}`);
  }

  if (!info.valid) {
    logger.warn('');
    logger.warn('🔧 RECOMMENDED ACTION:');
    logger.warn('The current token cannot be used for Shifts API operations.');
    logger.warn('Please re-authenticate to obtain a valid token with the correct audience.');
    logger.warn('Use: POST /auth/login with your Teams credentials');
  }

  logger.info('========================');
}

/**
 * Get a user-friendly error message for the audience mismatch error
 */
export function getAudienceMismatchHelp(currentAudience?: string): string {
  const validAudiences = [
    'aa580612-c342-4ace-9055-8edee43ccb89 (Microsoft Teams Shifts)',
    'staffhub.office.com (Staffhub API)',
  ];

  let message = '❌ OAuth Audience Mismatch Error\n\n';
  message += `Current token audience: ${currentAudience || 'unknown'}\n`;
  message += `Required audience: ${validAudiences.join(' or ')}\n\n`;
  message += 'This error occurs when the access token was issued for a different API.\n';
  message += 'For example, tokens for Teams Chat API (api.spaces.skype.com) cannot be used for Shifts API.\n\n';
  message += '🔧 SOLUTION:\n';
  message += '1. Re-authenticate using the login endpoint\n';
  message += '2. Ensure you navigate to the Shifts app during login\n';
  message += '3. The system will capture the correct token for Shifts operations\n';

  return message;
}
