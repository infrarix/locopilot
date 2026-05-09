'use strict';

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getLocalModels } from '../services/ollama';
import { isProUser, getCloudToken, callCloudModels } from '../../cloud/client';
import type { CloudModelsResponse, ModelEntry } from '../types';

type CloudModel = CloudModelsResponse['data'][number];

async function fetchCloudModels(token: string, log: { warn: (o: object, m: string) => void }): Promise<CloudModel[]> {
  try {
    const res = await callCloudModels(`Bearer ${token}`);
    if (!res.ok) {
      log.warn({ status: res.status }, 'cloud /api/models returned non-OK; pro users see local-only list');
      return [];
    }
    const body = (await res.json()) as CloudModelsResponse;
    return Array.isArray(body.data) ? body.data : [];
  } catch (err) {
    log.warn({ err: (err as Error).message }, 'cloud /api/models unreachable; pro users see local-only list');
    return [];
  }
}

export default async function modelsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/models', async (req: FastifyRequest, reply: FastifyReply) => {
    let localModels: Array<{ name: string }> = [];
    try {
      localModels = await getLocalModels();
    } catch (err) {
      req.log.warn({ err }, 'Ollama unavailable — local model list will be empty');
    }

    const localData: ModelEntry[] = localModels.map((m) => ({
      id: m.name,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'local',
    }));

    // Free tier: local-only. Pro tier: merge cloud-managed remote model manifest.
    if (!isProUser()) {
      return reply.send({ object: 'list', data: localData });
    }

    const token = getCloudToken();
    if (!token) return reply.send({ object: 'list', data: localData });

    const cloudData = await fetchCloudModels(token, req.log);

    return reply.send({
      object: 'list',
      data: [...localData, ...cloudData],
    });
  });
}
