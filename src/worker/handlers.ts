'use strict';

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  query,
  ValidationError,
  NotFoundError,
  VALID_FRAMEWORKS,
  LOG_EMITTER_WAIT_MS,
  JOB_STATUS_POLL_MS,
  EMITTER_POLL_TICK_MS,
} from '../shared';
import {
  callCloudTrain,
  callCloudTrainStatus,
  callCloudTrainLogs,
  ProSubscriptionRequiredError,
} from '../cloud/client';
import { validateDataset, applyDefaults, PartialTrainingConfig } from '../training';
import { executeJob } from './executor';
import { getLogEmitter } from './logStore';
import type { CreateJobBody, JobRow, JobStatusRow, JobStatus, JobStatusOnlyRow } from './types';

const TERMINAL_STATES: ReadonlySet<JobStatus> = new Set(['completed', 'failed']);

// Poll for the log emitter to be created — handles the race between job creation and SSE connect
async function waitForEmitter(jobId: string, timeoutMs: number): Promise<EventEmitter | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const emitter = getLogEmitter(jobId);
    if (emitter) return emitter;
    await new Promise<void>((r) => setTimeout(r, EMITTER_POLL_TICK_MS));
  }
  return undefined;
}

export const create = async (req: FastifyRequest<{ Body: CreateJobBody }>, reply: FastifyReply): Promise<void> => {
  const body = req.body ?? {};
  const authHeader = req.headers.authorization;

  // Pro tier: proxy to cloud backend
  if (authHeader?.startsWith('Bearer qs_')) {
    let cloudRes: Response;
    try {
      cloudRes = await callCloudTrain(body, authHeader);
    } catch (err) {
      // Surface the upstream 403 verbatim — never silently fall back to
      // local for an explicit cloud request, otherwise users could bypass
      // the subscription guard by re-trying.
      if (err instanceof ProSubscriptionRequiredError) {
        return reply.code(403).send({
          error: 'pro_subscription_required',
          message: err.message,
          upgrade_url: err.upgradeUrl,
        });
      }
      throw new Error(`Cloud backend unreachable: ${(err as Error).message}`);
    }
    const data = await cloudRes.json();
    return reply.code(cloudRes.status).send(data);
  }

  // Free tier: validate and run in-process
  if (!body.framework || !(VALID_FRAMEWORKS as readonly string[]).includes(body.framework)) {
    throw new ValidationError(`framework is required and must be one of: ${VALID_FRAMEWORKS.join(', ')}`);
  }
  if (!body.baseModel || typeof body.baseModel !== 'string') {
    throw new ValidationError('baseModel is required and must be a string');
  }
  if (!body.datasetPath || typeof body.datasetPath !== 'string') {
    throw new ValidationError('datasetPath is required and must be a string');
  }
  if (!body.outputDir || typeof body.outputDir !== 'string') {
    throw new ValidationError('outputDir is required and must be a string');
  }

  const config = applyDefaults(body as PartialTrainingConfig);

  try {
    validateDataset(config.datasetPath);
  } catch (err) {
    throw new ValidationError((err as Error).message);
  }

  // Generate the UUID in JS — SQLite doesn't support INSERT...RETURNING
  const jobId = randomUUID();
  const now = new Date().toISOString();

  await query(
    `INSERT INTO training_jobs (id, framework, base_model, dataset_path, config_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [jobId, config.framework, config.baseModel, config.datasetPath, JSON.stringify(config), now],
  );

  const job: JobRow = {
    id: jobId,
    status: 'pending',
    framework: config.framework,
    base_model: config.baseModel,
    dataset_path: config.datasetPath,
    created_at: now,
  };

  // Fire-and-forget; errors logged inside executeJob
  executeJob(jobId, config).catch((err: Error) => {
    console.error(`[worker] Job ${jobId} failed:`, err.message);
  });

  return reply.code(201).send(job);
};

export const getStatus = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // Pro tier: proxy to cloud
  if (authHeader?.startsWith('Bearer qs_')) {
    let cloudRes: Response;
    try {
      cloudRes = await callCloudTrainStatus(req.params.id, authHeader);
    } catch (err) {
      throw new Error(`Cloud backend unreachable: ${(err as Error).message}`);
    }
    const data = await cloudRes.json();
    return reply.code(cloudRes.status).send(data);
  }

  const { rows } = await query<JobStatusRow>(
    `SELECT id, status, framework, base_model, output_path, error,
            created_at, started_at, completed_at
     FROM training_jobs WHERE id = ?`,
    [req.params.id],
  );

  if (!rows.length) throw new NotFoundError('Job');
  return reply.send(rows[0]);
};

export const streamLogs = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> => {
  const jobId = req.params.id;
  const authHeader = req.headers.authorization;

  // Pro tier: proxy SSE stream from cloud using iterative reads (no recursion)
  if (authHeader?.startsWith('Bearer qs_')) {
    reply.hijack();
    let cloudRes: Response;
    try {
      cloudRes = await callCloudTrainLogs(jobId, authHeader);
    } catch {
      reply.raw.end();
      return;
    }
    if (!cloudRes.ok || !cloudRes.body) {
      reply.raw.end();
      return;
    }
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    const reader = cloudRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply.raw.write(value);
      }
    } catch {
      // client disconnected or cloud stream ended
    } finally {
      reader.releaseLock();
      reply.raw.end();
    }
    return;
  }

  // Free tier: verify job exists
  const { rows } = await query<JobStatusOnlyRow>('SELECT status FROM training_jobs WHERE id = ?', [jobId]);
  if (!rows.length) throw new NotFoundError('Job');

  reply.hijack();

  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');

  if (TERMINAL_STATES.has(rows[0].status)) {
    reply.raw.write(`data: Job already ${rows[0].status}\n\n`);
    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
    return;
  }

  // Wait for the executor to create the emitter (handles SSE-connect / job-create race)
  const logEmitter = await waitForEmitter(jobId, LOG_EMITTER_WAIT_MS);
  if (!logEmitter) {
    reply.raw.write('data: No active log stream — job may have completed or not yet started\n\n');
    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
    return;
  }

  const onLog = (line: string): void => {
    reply.raw.write(`data: ${line}\n\n`);
  };
  logEmitter.on('log', onLog);

  const statusInterval = setInterval(async () => {
    try {
      const { rows: statusRows } = await query<JobStatusOnlyRow>('SELECT status FROM training_jobs WHERE id = ?', [
        jobId,
      ]);
      if (statusRows.length && TERMINAL_STATES.has(statusRows[0].status)) {
        reply.raw.write(`data: Job ${statusRows[0].status}\n\n`);
        reply.raw.write('data: [DONE]\n\n');
        reply.raw.end();
        cleanup();
      }
    } catch {
      // ignore status check errors
    }
  }, JOB_STATUS_POLL_MS);

  const cleanup = (): void => {
    clearInterval(statusInterval);
    logEmitter.off('log', onLog);
  };

  req.raw.socket?.on('close', cleanup);
};
