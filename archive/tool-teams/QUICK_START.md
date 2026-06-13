# 🚀 Quick Start Guide

## Setup (5 Minutes)

### 1. Configure Environment
```bash
# Copy example
cp .env.example .env

# Edit .env
MONGODB_URI=mongodb+srv://handmadee38_db_user:JRw5fdRt3IN1cIGh@lunorcluster.y8es43a.mongodb.net/?appName=lunorCluster
ENCRYPTION_KEY=change-this-to-secure-key-32-chars
```

### 2. Migrate Data (If you have existing SQLite data)
```bash
npm run migrate
```

### 3. Start Server
```bash
npm run dev
```

## Key Changes for Your Code

### Before (SQLite)
```typescript
import { credentialsRepository } from './repositories/credentials.repository';

// Sync calls
const creds = credentialsRepository.findById(userId);
credentialsRepository.save(dto);
```

### After (MongoDB)
```typescript
import { credentialsMongoRepository } from './repositories/credentials-mongo.repository';

// Async calls
const creds = await credentialsMongoRepository.findById(userId);
await credentialsMongoRepository.save(dto);
```

## Auto Token Refresh - Usage Example

```typescript
import { createAxiosWithTokenRefresh, ITokenRefreshHandler } from '@/core/http/token-refresh-interceptor';
import { credentialsMongoRepository } from '@/modules/auth/repositories/credentials-mongo.repository';

class TeamsTokenHandler implements ITokenRefreshHandler {
  constructor(private userId: string) {}

  async refreshToken(): Promise<string | null> {
    // Call your existing refresh service
    const result = await tokenRefreshService.refresh(this.userId);
    if (result.success) {
      // Update MongoDB with new token
      await credentialsMongoRepository.updateToken(
        this.userId,
        result.accessToken,
        result.expiresAt
      );
      return result.accessToken;
    }
    return null;
  }

  async getAccessToken(): Promise<string | null> {
    const creds = await credentialsMongoRepository.findById(this.userId);
    return creds?.access_token || null;
  }

  async isTokenExpiringSoon(): Promise<boolean> {
    return await credentialsMongoRepository.isTokenExpiringSoon(this.userId);
  }
}

// Create API client with auto-refresh
const api = createAxiosWithTokenRefresh(
  new TeamsTokenHandler('user-123'),
  {
    baseURL: 'https://flw.teams.cloud.microsoft',
    timeout: 30000,
    maxRetries: 3,
    enableProactiveRefresh: true
  }
);

// Use normally - token refresh happens automatically!
try {
  const response = await api.post('/api/endpoint', data);
  // Success!
} catch (error) {
  // Token refresh failed or other error
}
```

## Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "database": {
    "mongodb": {
      "connected": true,
      "readyState": "connected"
    }
  }
}
```

## Common Tasks

### Update Token with Expiry
```typescript
await credentialsMongoRepository.updateToken(
  userId,
  newToken,
  new Date(Date.now() + 3600000) // 1 hour from now
);
```

### Check if Token Needs Refresh
```typescript
const needsRefresh = await credentialsMongoRepository.isTokenExpiringSoon(userId);
if (needsRefresh) {
  // Refresh token
}
```

### Find All Expired Credentials
```typescript
const expired = await credentialsMongoRepository.findExpiredCredentials();
for (const cred of expired) {
  // Auto-refresh each
}
```

## Troubleshooting

### Can't Connect to MongoDB
```bash
# Check connection string
echo $MONGODB_URI

# Verify network access in MongoDB Atlas
# Add your IP to whitelist
```

### Migration Errors
```bash
# Check SQLite file exists
ls -la src/data/toolteams.db

# Run migration with full logs
npm run migrate
```

### Token Not Refreshing
```typescript
// Ensure tokenExpiresAt is set when saving credentials
await credentialsMongoRepository.save({
  userId,
  teamId,
  accessToken,
  tokenExpiresAt: new Date('2025-01-20T10:00:00Z') // Important!
});
```

## Documentation

- **Full Guide**: `MONGODB_MIGRATION.md`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`
- **This File**: `QUICK_START.md`

## Next Steps

1. ✅ Test migration with your data
2. ✅ Update services to use MongoDB repositories
3. ✅ Test auto-refresh in development
4. 🚀 Deploy to production

---

**Need Help?** Check the detailed docs in `MONGODB_MIGRATION.md`
