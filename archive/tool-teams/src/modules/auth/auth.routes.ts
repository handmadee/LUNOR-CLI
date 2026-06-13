import { Router } from 'express';
import { authController } from './controllers/auth.controller';

const router = Router();

/**
 * Auth Routes
 * 
 * /api/auth
 */

// Login with email/password (uses Puppeteer)
router.post('/login', authController.login.bind(authController));

// Login with OAuth2 (Recommended - gets token with correct scope)
router.post('/oauth2-login', authController.oauth2Login.bind(authController));

// Refresh token using cookies
router.post('/refresh', authController.refreshToken.bind(authController));

// Save token manually
router.post('/save-token', authController.saveToken.bind(authController));

// Update token
router.put('/token', authController.updateToken.bind(authController));

// Get credentials status
router.get('/status', authController.getStatus.bind(authController));

// Diagnose token (check audience and validity)
router.get('/diagnose', authController.diagnoseToken.bind(authController));

// Clear credentials
router.delete('/clear', authController.clearCredentials.bind(authController));

export default router;
