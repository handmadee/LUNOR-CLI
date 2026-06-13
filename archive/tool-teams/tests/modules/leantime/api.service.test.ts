
import { LeantimeApiService } from '../../../src/modules/leantime/services/leantime-api.service';
import { leantimeCredentialsRepository } from '../../../src/modules/leantime/repositories/leantime-credentials.repository';
import { encryptionUtil } from '../../../src/shared/utils/encryption.util';
import axios from 'axios';

// Mock Axios
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  defaults: { baseURL: '' },
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  isAxiosError: jest.fn((payload) => payload?.isAxiosError === true),
}));

jest.mock('../../../src/modules/leantime/repositories/leantime-credentials.repository');
jest.mock('../../../src/shared/utils/encryption.util');
jest.mock('../../../src/core/logger/logger.service');

// Concrete implementation for testing
class TestService extends LeantimeApiService {
  constructor() {
    super('test-user');
  }
  
  public async testCall() {
    return this.client.get('/test');
  }
}

describe('LeantimeApiService (Base)', () => {
  let service: TestService;
  let requestInterceptor: any;
  let responseInterceptor: any;
  let responseErrorInterceptor: any;

  beforeAll(() => {
    // Instantiate directly
    service = new TestService();
    
    // Capture interceptors
    if (mockAxiosInstance.interceptors.request.use.mock.calls.length > 0) {
       requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
    }
    if (mockAxiosInstance.interceptors.response.use.mock.calls.length > 0) {
       responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
       responseErrorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (encryptionUtil.encrypt as jest.Mock).mockImplementation((val) => `encrypted-${val}`);
    (encryptionUtil.decrypt as jest.Mock).mockImplementation((val) => val.replace('encrypted-', ''));
  });

  describe('Request Interceptor', () => {
    it('should attach authentication cookies', async () => {
      expect(requestInterceptor).toBeDefined();

      (leantimeCredentialsRepository.findById as jest.Mock).mockReturnValue({
        user_id: 'test-user',
        leantime_url: 'https://leantime.test',
        session_cookie: 'encrypted-sess',
        access_token: 'encrypted-acc',
        refresh_token: 'encrypted-ref'
      });

      const config = { headers: {}, baseURL: '' };
      const enhanced = await requestInterceptor(config);

      expect(enhanced.baseURL).toBe('https://leantime.test/api/jsonrpc');
      expect(enhanced.headers['Cookie']).toContain('leantime_session=sess');
    });
  });

  describe('Response Logic', () => {
    it('should capture cookies from response', async () => {
      expect(responseInterceptor).toBeDefined();
      
      const response = {
        headers: {
          'set-cookie': ['leantime_session=new-sess; path=/']
        }
      };
      
      await responseInterceptor(response);
      
      expect(leantimeCredentialsRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        sessionCookie: 'new-sess'
      }));
    });
  });

  describe('Refresh Logic', () => {
    it('should call static refresh handler on 401', async () => {
      expect(responseErrorInterceptor).toBeDefined();

      const refreshSpy = jest.fn().mockResolvedValue(true);
      LeantimeApiService.setRefreshHandler(refreshSpy);

      const error = {
        response: { status: 401 },
        config: { _retry: false }
      };

      // The interceptor retries the request using this.client(originalRequest)
      // We mock this.client call by mocking axiosInstance call?
      // actually, this.client(...) call is complex to mock in interceptor logic.
      // But we check if refreshHandler was called.
      
      try {
        await responseErrorInterceptor(error);
      } catch (e) {
        // intended, as the retry call might fail or return mock promise
      }

      expect(refreshSpy).toHaveBeenCalledWith('test-user');
    });
  });
});
