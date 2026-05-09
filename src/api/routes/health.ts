'use strict';

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { checkOllama } from '../services/ollama';
import { query } from '../../shared';
import { isProUser, callCloudHealth, getCloudToken } from '../../cloud/client';
import type { ServiceHealth, HealthResponse } from '../types';

async function timedCheck(fn: () => Promise<void>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

async function checkSQLite(): Promise<void> {
  await query('SELECT 1');
}

export default async function healthRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_req: FastifyRequest, reply: FastifyReply) => {
    const pro = isProUser();

    const checks: Array<[string, () => Promise<void>]> = [
      ['ollama', checkOllama],
      ['sqlite', checkSQLite],
    ];

    if (pro) {
      const token = getCloudToken()!;
      checks.push([
        'cloud',
        () =>
          callCloudHealth(`Bearer ${token}`).then((r) => {
            if (!r.ok) throw new Error(`Cloud health returned ${r.status}`);
          }),
      ]);
    }

    const results = await Promise.allSettled(checks.map(([, fn]) => timedCheck(fn)));

    const services: Record<string, ServiceHealth> = {};
    let allOk = true;

    results.forEach((result, i) => {
      const name = checks[i][0];
      const ok = result.status === 'fulfilled';
      if (!ok) allOk = false;
      services[name] = ok
        ? { ok: true, responseMs: result.value }
        : { ok: false, error: (result as PromiseRejectedResult).reason?.message };
    });

    const response: HealthResponse = {
      status: allOk ? 'ok' : 'degraded',
      mode: pro ? 'pro' : 'free',
      services,
    };

    return reply.send(response);
  });
}
