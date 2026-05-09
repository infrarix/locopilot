'use strict';

import { FastifyInstance } from 'fastify';
import { trainingHandlers } from '../../worker';
import type { CreateJobBody } from '../../worker/types';

interface JobIdParams {
  id: string;
}

export default async function trainingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: CreateJobBody }>('/training/jobs', trainingHandlers.create);
  fastify.get<{ Params: JobIdParams }>('/training/jobs/:id', trainingHandlers.getStatus);
  fastify.get<{ Params: JobIdParams }>('/training/jobs/:id/logs', trainingHandlers.streamLogs);
}
