import { AuthMiddleware, UsageTracker, UsageData, ApiKey } from '../../shared';

export async function createAuthMiddleware(): Promise<AuthMiddleware> {
  return {
    async validate(authHeader?: string): Promise<ApiKey | null> {
      // No header → Free tier (anonymous local user)
      if (!authHeader) return null;
      const raw = authHeader.replace(/^Bearer\s+/i, '');
      // Only qs_ tokens are Pro tokens. Anything else is treated as anonymous.
      // Actual token validation happens cloud-side when the request is proxied.
      if (!raw.startsWith('qs_')) return null;
      // Return a stub key with a very high local rate limit — cloud enforces the real limit.
      return { id: 'pro-user', name: 'pro', rate_limit_rpm: 9999, rate_window_seconds: 60 };
    },
  };
}

export async function createUsageTracker(): Promise<UsageTracker> {
  return {
    async record(_usage: UsageData): Promise<void> {
      // Usage tracking is cloud-side only (Pro tier); no-op locally.
    },
  };
}
