'use strict';

import { FastifyRequest, FastifyReply } from 'fastify';
import { DEFAULT_RATE_LIMIT_RPM, DEFAULT_RATE_WINDOW_SECONDS, RateLimitError, type ApiKey } from '../../shared';

type RequestWithApiKey = FastifyRequest & { apiKey?: ApiKey };

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();

export async function rateLimiter(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { apiKey } = req as RequestWithApiKey;
  if (!apiKey) return;

  const limit = apiKey.rate_limit_rpm || DEFAULT_RATE_LIMIT_RPM;
  const windowMs = (apiKey.rate_window_seconds || DEFAULT_RATE_WINDOW_SECONDS) * 1000;
  const now = Date.now();

  let entry = windows.get(apiKey.id);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    windows.set(apiKey.id, entry);
  }

  entry.count++;

  const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);

  reply.header('X-RateLimit-Limit', limit);
  reply.header('X-RateLimit-Remaining', Math.max(0, limit - entry.count));
  reply.header('X-RateLimit-Reset', Math.floor(entry.resetAt / 1000));

  if (entry.count > limit) {
    throw new RateLimitError(retryAfterSeconds);
  }
}
