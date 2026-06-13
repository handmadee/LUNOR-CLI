import { Request, Response, NextFunction } from 'express';
import { authService, SaveTokenDto } from '../services/auth.service';
import { teamsLoginService } from '../services/teams-login.service';
import { oauth2Service } from '../services/oauth2.service';
import { responseUtil } from '../../../shared/utils/response.util';
import { createErrorResponse } from '../../../core/constants/error-codes';
import { analyzeToken, printTokenDiagnostics } from '../utils/token-diagnostics';

/**
 * Auth Controller
 * 
 * Handles HTTP requests for authentication operations.
 */
class AuthController {
  /**
   * Login with MS Teams credentials
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, teamId } = req.body;

      if (!email || !password) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Email and password are required'));
        return;
      }

      const result = await teamsLoginService.login(email, password);

      if (result.success && result.accessToken) {
        // Save credentials
        const saved = authService.saveCredentials({
          userId: email, // Use email as userId
          accessToken: result.accessToken,
          teamId: teamId || result.teamId || 'default',
          userObjectId: result.userObjectId,
          tenantId: result.tenantId,
          cookies: result.cookies,
        });

        responseUtil.success(res, {
          message: 'Login successful',
          credentials: authService.getCredentialsInfo(saved.user_id),
          hasCookies: Boolean(result.cookies?.length),
        });
      } else {
        res.status(401).json(createErrorResponse('LOGIN_FAILED', result.error || 'Login failed'));
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login with MS Teams credentials using OAuth2 (Recommended)
   * POST /api/auth/oauth2-login
   *
   * This method uses proper OAuth2 flow to get tokens with correct audience/scope
   */
  async oauth2Login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, teamId, tenantId, clientId } = req.body;

      if (!email || !password) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Email and password are required'));
        return;
      }

      if (!tenantId || !clientId) {
        res.status(400).json(
          createErrorResponse(
            'BAD_REQUEST',
            'tenantId and clientId are required for OAuth2 login. Add them to .env: MS_TENANT_ID and MS_CLIENT_ID'
          )
        );
        return;
      }

      const result = await oauth2Service.loginWithCredentials(email, password, tenantId, clientId);

      if (result.success && result.accessToken) {
        // Save credentials
        const saved = authService.saveCredentials({
          userId: email,
          displayName: result.displayName,
          accessToken: result.accessToken,
          teamId: teamId || 'default',
          userObjectId: result.userId,
          tenantId: result.tenantId,
        });

        responseUtil.success(res, {
          message: 'OAuth2 login successful',
          credentials: authService.getCredentialsInfo(saved.user_id),
          region: result.region,
          hasRefreshToken: Boolean(result.refreshToken),
        });
      } else {
        res.status(401).json(createErrorResponse('LOGIN_FAILED', result.error || 'OAuth2 login failed'));
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh token
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId = 'default' } = req.body;

      const newToken = await authService.refreshToken(userId);

      if (newToken) {
        responseUtil.success(res, {
          refreshed: true,
          credentials: authService.getCredentialsInfo(userId),
        }, 'Token refreshed successfully');
      } else {
        res.status(401).json(createErrorResponse('REFRESH_FAILED', 'Could not refresh token. Please login again.'));
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save MS Teams token manually
   * POST /api/auth/save-token
   */
  saveToken(req: Request, res: Response, next: NextFunction): void {
    try {
      const dto: SaveTokenDto = req.body;

      if (!dto.accessToken) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Access token is required'));
        return;
      }
      if (!dto.teamId) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Team ID is required'));
        return;
      }

      const result = authService.saveCredentials(dto);
      responseUtil.created(res, authService.getCredentialsInfo(result.user_id), 'Credentials saved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update access token
   * PUT /api/auth/token
   */
  updateToken(req: Request, res: Response, next: NextFunction): void {
    try {
      const { accessToken, userId = 'default' } = req.body;

      if (!accessToken) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Access token is required'));
        return;
      }

      const updated = authService.updateToken(accessToken, userId);
      responseUtil.success(res, { updated }, updated ? 'Token updated' : 'User not found');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get credentials status
   * GET /api/auth/status
   */
  getStatus(req: Request, res: Response, next: NextFunction): void {
    try {
      const { userId = 'default' } = req.query;
      const hasCredentials = authService.hasCredentials(userId as string);

      if (hasCredentials) {
        responseUtil.success(res, {
          configured: true,
          credentials: authService.getCredentialsInfo(userId as string),
        });
      } else {
        responseUtil.success(res, {
          configured: false,
          message: 'No credentials found. Please login or save your MS Teams token.',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear credentials
   * DELETE /api/auth/clear
   */
  clearCredentials(req: Request, res: Response, next: NextFunction): void {
    try {
      const { userId = 'default' } = req.query;
      const deleted = authService.deleteCredentials(userId as string);
      responseUtil.success(res, { deleted }, deleted ? 'Credentials cleared' : 'No credentials found');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Diagnose token - Check if token has correct audience
   * GET /api/auth/diagnose
   */
  diagnoseToken(req: Request, res: Response, next: NextFunction): void {
    try {
      const { userId = 'default' } = req.query;
      const credentials = authService.getCredentials(userId as string);

      if (!credentials) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'No credentials found for this user'));
        return;
      }

      const tokenInfo = analyzeToken(credentials.accessToken);

      // Print to console/logs
      printTokenDiagnostics(credentials.accessToken, userId as string);

      // Return detailed analysis
      responseUtil.success(res, {
        userId: credentials.userId,
        tokenInfo: {
          valid: tokenInfo.valid,
          audience: tokenInfo.audience,
          issuer: tokenInfo.issuer,
          expiresAt: tokenInfo.expiresAt,
          subject: tokenInfo.subject,
          appId: tokenInfo.appId,
          reason: tokenInfo.reason,
        },
        recommendation: !tokenInfo.valid
          ? 'The current token cannot be used for Shifts API operations. Please re-authenticate using POST /api/auth/login'
          : 'Token is valid for Shifts API operations',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
