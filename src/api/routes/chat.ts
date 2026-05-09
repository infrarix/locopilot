'use strict';

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  setSSEHeaders,
  writeSSE,
  endSSE,
  writeSSEError,
  buildChunk,
  buildCompletion,
  generateChatId,
  estimateTokens,
} from '../utils/sse';
import { PROVIDERS } from '../../shared';
import type { ChatRequestBody } from '../types';

const sseHelpers = {
  writeSSE,
  endSSE,
  writeSSEError,
  buildChunk,
  buildCompletion,
  generateChatId,
  estimateTokens,
};

export default async function chatRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: ChatRequestBody }>(
    '/chat/completions',
    {
      schema: {
        body: {
          type: 'object',
          required: ['model', 'messages'],
          properties: {
            model: { type: 'string', minLength: 1, maxLength: 256 },
            messages: {
              type: 'array',
              minItems: 1,
              maxItems: 500,
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                  content: { type: 'string', maxLength: 131072 }, // 128 KB per message
                },
              },
            },
            stream: { type: 'boolean', default: false },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            max_tokens: { type: 'integer', minimum: 1, maximum: 65536 },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: ChatRequestBody }>, reply: FastifyReply) => {
      const { model, stream: isStreaming } = req.body;
      const apiKey = req.apiKey; // may be undefined for Free tier
      const isProUser = apiKey !== undefined;

      const provider = await fastify.router.resolve(model, isProUser);

      if (provider === PROVIDERS.NOT_FOUND) {
        return reply.code(404).send({
          error: 'model_not_found',
          message: `Model '${model}' is not available locally. Upgrade to Pro for remote GPU access.`,
        });
      }

      reply.hijack();

      const abortController = new AbortController();
      req.raw.on('close', () => {
        abortController.abort();
      });

      if (isStreaming) {
        setSSEHeaders(reply.raw);
        reply.raw.writeHead(200);
      }

      try {
        const { usage } = await fastify.router.stream(
          provider,
          req.body,
          reply.raw,
          sseHelpers,
          abortController.signal,
          req.headers.authorization,
        );

        if (isProUser && apiKey) {
          fastify.tracker
            .record({ apiKeyId: apiKey.id, ...usage })
            .catch((err) => req.log.error({ err }, 'Usage tracking failed'));
        }
      } catch (err) {
        req.log.error({ err }, isStreaming ? 'Streaming error' : 'Completion error');
      }
    },
  );
}
