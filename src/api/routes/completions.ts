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
import { PROVIDERS, ChatBody } from '../../shared';
import type { CompletionsRequestBody } from '../types';

const sseHelpers = {
  writeSSE,
  endSSE,
  writeSSEError,
  buildChunk,
  buildCompletion,
  generateChatId,
  estimateTokens,
};

export default async function completionsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: CompletionsRequestBody }>(
    '/completions',
    {
      schema: {
        body: {
          type: 'object',
          required: ['model', 'prompt'],
          properties: {
            model: { type: 'string', minLength: 1, maxLength: 256 },
            prompt: { type: 'string', minLength: 1, maxLength: 131072 },
            stream: { type: 'boolean', default: false },
            max_tokens: { type: 'integer', minimum: 1, maximum: 65536 },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            stop: {},
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: CompletionsRequestBody }>, reply: FastifyReply) => {
      const { model, prompt, stream: isStreaming, max_tokens, temperature, stop } = req.body;
      const apiKey = req.apiKey;
      const isProUser = apiKey !== undefined;

      const chatBody: ChatBody = {
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: isStreaming ?? false,
        ...(max_tokens !== undefined && { max_tokens }),
        ...(temperature !== undefined && { temperature }),
        ...(stop !== undefined && { stop }),
      };

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
          chatBody,
          reply.raw,
          sseHelpers,
          abortController.signal,
          req.headers.authorization,
        );

        if (isProUser && apiKey) {
          fastify.tracker
            .record({ apiKeyId: apiKey.id, ...usage })
            .catch((err: Error) => req.log.error({ err }, 'Usage tracking failed'));
        }
      } catch (err) {
        req.log.error({ err }, 'Legacy completions error');
      }
    },
  );
}
