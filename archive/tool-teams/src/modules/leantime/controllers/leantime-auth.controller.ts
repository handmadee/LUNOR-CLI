import { Request, Response } from 'express';
import { leantimeAuthService } from '../services/leantime-auth.service';
import { LoginLeantimeDto } from '../dto/auth.dto';
import { leantimeCredentialsRepository } from '../repositories/leantime-credentials.repository';

export class LeantimeAuthController {
  async login(req: Request, res: Response) {
    try {
      const dto: LoginLeantimeDto = req.body;
      if (!dto.email || !dto.password || !dto.leantimeUrl) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: email, password, leantimeUrl'
        });
      }

      // Explicitly set user ID from body if needed, otherwise it uses 'default' from service
      // But service is singleton with 'default'. We might need to handle multi-user better.
      // For this implementation, we'll support specific user if passed, or default.
      // Ideally, the service should accept userId in method or be instantiated per request.
      
      // Let's update service to be instantiated or accept key.
      // Current implementation: new LeantimeAuthService('default').
      // We will create a fresh instance for this login to save correctly.
      
      // Actually, the service manages 'default' user. If we want multi-user support we need to change that.
      // For now, let's stick to the 'default' user pattern used in Teams module, 
      // but assuming the login email is the unique identifier is better.
      
      // HACK: Re-instantiate service for this user
      // Ideally we shouldn't export a singleton if state (userId) matters.
      const authService = new (require('../services/leantime-auth.service').LeantimeAuthService)(dto.email); // Use email as userId
      
      await authService.login(dto);

      return res.status(200).json({
        success: true,
        message: 'Leantime login successful'
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Login failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getStatus(req: Request, res: Response) {
    try {
      const userId = req.query.userId?.toString() || 'default';
      // If default is passed but nothing found, maybe try to find any?
      // Repository findById returns specific.
      
      let credentials = leantimeCredentialsRepository.findById(userId);
      
      // Fallback to first found if default and empty
      // (Similar logic to MS Teams auth service)
      if (!credentials && userId === 'default') {
         // We'd need findAll, but let's stick to basic find for now
      }

      if (!credentials) {
        return res.status(404).json({
          success: false,
          error: 'No credentials found'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          userId: credentials.user_id,
          leantimeUrl: credentials.leantime_url,
          hasToken: !!credentials.session_cookie,
          updatedAt: credentials.updated_at
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export const leantimeAuthController = new LeantimeAuthController();
