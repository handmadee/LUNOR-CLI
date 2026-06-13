
import { LeantimeAuthService } from '../../../src/modules/leantime/services/leantime-auth.service';
import { leantimeCredentialsRepository } from '../../../src/modules/leantime/repositories/leantime-credentials.repository';
import { encryptionUtil } from '../../../src/shared/utils/encryption.util';
import { LoginLeantimeDto } from '../../../src/modules/leantime/dto/auth.dto';

// Define mock instance at module scope but initialized lazily if possible? 
// No, simpler to just define 'axios' mock purely inline and assume it returns what we want.
// BUT we need to spy on it.
// Strategy: Mock axios to return an object we can modify.

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  defaults: { baseURL: '' },
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

// Jest hoisting means this runs before imports, so it can't see mockAxiosInstance if it's const.
// Unless we name it 'mock...' and declare it var? No, let's keep it simple.
// We will assign the functions to the mock AFTER creation? No.

// Proper Way: Use variable inside factory if it's standalone, 
// OR import from __mocks__ 
// OR use jest.fn() inside the factory and then spy on the result?
// OR use `require` inside the test.

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  isAxiosError: jest.fn((payload) => payload?.isAxiosError === true),
}));

// We must manually hoist the variable declaration or just ignore the error? 
// Actually, variables starting with 'mock' ARE allowed.
// But we used 'const'. 
// Let's rely on require() for the System Under Test.

jest.mock('../../../src/modules/leantime/repositories/leantime-credentials.repository');
jest.mock('../../../src/shared/utils/encryption.util');
jest.mock('../../../src/core/logger/logger.service');

describe('LeantimeAuthService', () => {
  let service: LeantimeAuthService;
  const mockUserId = 'default';
  const mockUrl = 'https://leantime.test';

  beforeAll(() => {
    // Dynamic import to ensure mock is active
    const module = require('../../../src/modules/leantime/services/leantime-auth.service');
    service = module.leantimeAuthService;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    (encryptionUtil.encrypt as jest.Mock).mockImplementation((val) => `encrypted-${val}`);
    (encryptionUtil.decrypt as jest.Mock).mockImplementation((val) => val.replace('encrypted-', ''));

    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
  });

  describe('login', () => {
    it('should login successfully and save credentials', async () => {
      const dto: LoginLeantimeDto = {
        email: 'test@example.com',
        password: 'password',
        leantimeUrl: mockUrl
      };

      // 1. Mock GET /auth/login
      mockAxiosInstance.get.mockResolvedValue({
        data: '<html><body>Login Page</body></html>',
        headers: {
          'set-cookie': ['leantime_session=initial_session; path=/']
        }
      });

      // 2. Mock POST /auth/login
      mockAxiosInstance.post.mockResolvedValue({
        headers: {
          'set-cookie': [
            'leantime_session=new_session; path=/',
            'accessToken=access123; path=/',
            'refreshToken=refresh123; path=/'
          ]
        },
        status: 200
      });

      const result = await service.login(dto);

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/login');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', expect.any(Object), expect.any(Object));

      expect(leantimeCredentialsRepository.save).toHaveBeenCalledWith({
        userId: 'test@example.com',
        leantimeUrl: mockUrl,
        accessToken: 'access123',
        refreshToken: 'refresh123',
        sessionCookie: 'new_session'
      });
    });

    it('should throw error if no cookies returned', async () => {
      const dto: LoginLeantimeDto = {
        email: 'test@example.com',
        password: 'password',
        leantimeUrl: mockUrl
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: '',
        headers: {}
      });
      mockAxiosInstance.post.mockResolvedValue({
        headers: {}, 
        status: 200
      });

      await expect(service.login(dto)).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should log warning (placeholder implementation)', async () => {
      const creds = {
        user_id: mockUserId,
        refresh_token: 'valid-refresh'
      };
      (leantimeCredentialsRepository.findById as jest.Mock).mockReturnValue(creds);

      await (service as any).refreshToken();
    });

    it('should throw if no refresh token in DB', async () => {
      (leantimeCredentialsRepository.findById as jest.Mock).mockReturnValue(null);
      await expect((service as any).refreshToken()).rejects.toThrow('No refresh token available');
    });
  });
});
