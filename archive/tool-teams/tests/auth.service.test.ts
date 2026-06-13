
import { authService, SaveTokenDto } from '../src/modules/auth/services/auth.service';
import { credentialsRepository } from '../src/modules/auth/repositories/credentials.repository';
import { tokenRefreshService } from '../src/modules/auth/services/token-refresh.service';
import { encryptionUtil } from '../src/shared/utils/encryption.util';

// Mock dependencies
jest.mock('../src/modules/auth/repositories/credentials.repository');
jest.mock('../src/modules/auth/services/token-refresh.service');
jest.mock('../src/shared/utils/encryption.util');
jest.mock('../src/core/logger');

describe('AuthService', () => {
  const mockUserId = 'test-user';
  const mockToken = 'mock-token';
  const mockEncryptedToken = 'encrypted-token';
  const mockCookies = [{ name: 'test', value: 'cookie', domain: '.teams.microsoft.com', path: '/' }];
  const mockEncryptedCookies = 'encrypted-cookies';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup encryption mocks
    (encryptionUtil.encrypt as jest.Mock).mockImplementation((val) => `encrypted-${val}`);
    (encryptionUtil.decrypt as jest.Mock).mockImplementation((val) => val.replace('encrypted-', ''));
  });

  describe('saveCredentials', () => {
    it('should save credentials with default userId if not provided', () => {
      const dto: SaveTokenDto = {
        accessToken: mockToken,
        teamId: 'team-id',
      };

      authService.saveCredentials(dto);

      expect(credentialsRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'default',
        accessToken: `encrypted-${mockToken}`,
      }));
    });

    it('should save credentials with provided userId', () => {
      const dto: SaveTokenDto = {
        userId: 'custom-user',
        accessToken: mockToken,
        teamId: 'team-id',
      };

      authService.saveCredentials(dto);

      expect(credentialsRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'custom-user',
      }));
    });
  });

  describe('getCredentials', () => {
    it('should return decrypted credentials', () => {
      (credentialsRepository.findById as jest.Mock).mockReturnValue({
        user_id: mockUserId,
        team_id: 'team-id',
        access_token: `encrypted-${mockToken}`,
        cookies: `encrypted-${JSON.stringify(mockCookies)}`,
      });

      const result = authService.getCredentials(mockUserId);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(mockUserId);
      expect(result?.accessToken).toBe(mockToken);
      expect(result?.cookies).toEqual(mockCookies);
    });

    it('should return null if not found', () => {
      (credentialsRepository.findById as jest.Mock).mockReturnValue(null);
      const result = authService.getCredentials('non-existent');
      expect(result).toBeNull();
    });

     it('should fallback to first user if default is requested but missing', () => {
      (credentialsRepository.findById as jest.Mock).mockReturnValue(null);
      (credentialsRepository.findAll as jest.Mock).mockReturnValue([{
          user_id: 'fallback-user',
          team_id: 'team-id',
          access_token: `encrypted-${mockToken}`,
      }]);

      const result = authService.getCredentials('default');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('fallback-user');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Mock existing credentials
      (credentialsRepository.findById as jest.Mock).mockReturnValue({
        user_id: mockUserId,
        access_token: `encrypted-${mockToken}`,
        cookies: `encrypted-${JSON.stringify(mockCookies)}`,
      });

      // Mock refresh result
      (tokenRefreshService.refreshWithCookies as jest.Mock).mockResolvedValue({
        success: true,
        accessToken: 'new-token',
        cookies: mockCookies,
      });

      (credentialsRepository.updateToken as jest.Mock).mockReturnValue(true);

      const result = await authService.refreshToken(mockUserId);

      expect(result).toBe('new-token');
      expect(tokenRefreshService.refreshWithCookies).toHaveBeenCalled();
      expect(credentialsRepository.updateToken).toHaveBeenCalled();
    });

    it('should return null if no credentials found', async () => {
      (credentialsRepository.findById as jest.Mock).mockReturnValue(null);
      const result = await authService.refreshToken(mockUserId);
      expect(result).toBeNull();
    });
  });
});
