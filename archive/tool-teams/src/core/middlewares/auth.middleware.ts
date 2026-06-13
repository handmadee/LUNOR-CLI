import { Request, Response, NextFunction } from 'express';
import { authService } from '../../modules/auth/services/auth.service';
import { createErrorResponse } from '../constants/error-codes';

/**
 * Require Credentials Middleware
 * 
 * Checks if MS Teams credentials are configured before allowing access.
 */
export function requireCredentials(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { userId = 'default' } = req.query;
  
  if (!authService.hasCredentials(userId as string)) {
    res.status(401).json(createErrorResponse(
      'CREDENTIALS_NOT_FOUND',
      'Please save your MS Teams token first using POST /api/auth/save-token'
    ));
    return;
  }

  next();
}
