import 'fastify';
import type { Router } from '../../shared';
import type { AuthMiddleware, ApiKey } from '../../shared';
import type { UsageTracker } from '../../shared';

declare module 'fastify' {
  interface FastifyInstance {
    router: Router;
    auth: AuthMiddleware;
    tracker: UsageTracker;
  }

  interface FastifyRequest {
    apiKey?: ApiKey;
  }
}
