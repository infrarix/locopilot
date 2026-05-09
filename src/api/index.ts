'use strict';

import Fastify, { FastifyInstance } from 'fastify';
import { AppError } from '../shared';
import { createLocalRouter } from './services/localRouter';
import { createAuthMiddleware, createUsageTracker } from './services/localStubs';
import { isProUser } from '../cloud/client';

import chatRoute from './routes/chat';
import modelsRoute from './routes/models';
import legacyRoute from './routes/completions';
import healthRoute from './routes/health';
import trainingRoutes from './routes/training';
import { rateLimiter } from './middleware/rateLimiter';

const PUBLIC_ROUTES = new Set(['/v1/models', '/v1/quickslug/health']);

async function build(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    disableRequestLogging: false,
  });

  const router = await createLocalRouter();
  const auth = await createAuthMiddleware();
  const tracker = await createUsageTracker();

  app.decorate('router', router);
  app.decorate('auth', auth);
  app.decorate('tracker', tracker);

  await app.register(require('@fastify/cors'));

  app.setErrorHandler(
    (error: Error & { statusCode?: number; validation?: unknown; toJSON?: () => object }, req, reply) => {
      const statusCode = error.statusCode ?? 500;

      if (error instanceof AppError) {
        return reply.code(statusCode).send(error.toJSON());
      }

      if (error.validation) {
        return reply.code(400).send({ error: error.message });
      }

      req.log.error(error);
      return reply.code(statusCode).send({
        error: statusCode === 500 ? 'Internal server error' : error.message,
      });
    },
  );

  app.addHook('onRequest', async (req, _reply) => {
    if (PUBLIC_ROUTES.has(req.url) || PUBLIC_ROUTES.has(req.routeOptions?.url ?? '')) return;
    if (req.method === 'OPTIONS') return;

    const apiKey = await auth.validate(req.headers.authorization);
    req.apiKey = apiKey ?? undefined;
  });

  app.addHook('preHandler', rateLimiter);

  await app.register(chatRoute, { prefix: '/v1' });
  await app.register(modelsRoute, { prefix: '/v1' });
  await app.register(legacyRoute, { prefix: '/v1' });
  await app.register(healthRoute, { prefix: '/v1/quickslug' });
  await app.register(trainingRoutes, { prefix: '/v1/quickslug' });

  return app;
}

const pro = isProUser();
console.log(pro ? '🐌 Starting in Pro Tier mode (Cloud-augmented)' : '🐌 Starting in Free Tier mode (Local SQLite)');

build()
  .then((app) => {
    const port = parseInt(process.env.API_PORT ?? '') || 8080;
    return app.listen({ port, host: '0.0.0.0' });
  })
  .then(() => {
    console.log(`🐌 QuickSlug API running on port ${parseInt(process.env.API_PORT ?? '') || 8080}`);
  })
  .catch(async (err: Error) => {
    console.error('Failed to start QuickSlug API:', err);
    process.exit(1);
  });

process.on('SIGTERM', () => {
  process.exit(0);
});
process.on('SIGINT', () => {
  process.exit(0);
});
