'use strict';

import { ServerResponse } from 'http';
import {
  getLocalModels,
  streamChat,
  createNdjsonParser,
  ProviderError,
  PROVIDERS,
  Provider,
  Router,
  ChatBody,
  UsageMetrics,
  SSEHelpers,
} from '../../shared';
import { callCloudInference, ProSubscriptionRequiredError } from '../../cloud/client';

export async function createLocalRouter(): Promise<Router> {
  return {
    async resolve(requestedModel: string, isProUser: boolean): Promise<Provider> {
      if (!requestedModel) {
        return isProUser ? PROVIDERS.REMOTE : PROVIDERS.NOT_FOUND;
      }
      try {
        const models = await getLocalModels();
        if (models.find((m) => m.name === requestedModel)) return PROVIDERS.LOCAL;
        const prefix = requestedModel.split(':')[0];
        if (models.find((m) => m.name.startsWith(prefix))) return PROVIDERS.LOCAL;
      } catch (err) {
        // Ollama unavailable — log and fall through to remote/not_found
        console.warn('[router] Ollama unreachable:', (err as Error).message);
      }
      return isProUser ? PROVIDERS.REMOTE : PROVIDERS.NOT_FOUND;
    },

    async stream(
      provider: Provider,
      body: ChatBody,
      rawRes: ServerResponse,
      sse: SSEHelpers,
      signal?: AbortSignal,
      authHeader?: string,
    ): Promise<{ usage: UsageMetrics }> {
      const startTime = Date.now();
      const chatId = sse.generateChatId();
      const isStreaming = body.stream !== false;
      const tokensIn = sse.estimateTokens(body.messages);

      const usage: UsageMetrics = {
        model: body.model,
        provider,
        tokensIn,
        tokensOut: 0,
        latencyMs: 0,
        ttfbMs: 0,
        status: 200,
      };

      try {
        if (provider === PROVIDERS.LOCAL) {
          const content = await streamFromOllama(body, rawRes, usage, chatId, isStreaming, startTime, sse, signal);
          if (!isStreaming) {
            const response = sse.buildCompletion(body.model, content, usage);
            rawRes.setHeader('Content-Type', 'application/json');
            rawRes.end(JSON.stringify(response));
          }
        } else {
          await streamFromCloudProxy(body, rawRes, usage, isStreaming, signal, authHeader ?? '');
        }

        usage.latencyMs = Date.now() - startTime;
        return { usage };
      } catch (err) {
        // Pro-subscription failures are NOT a connection problem — they're a
        // billing problem. Surface them to the caller with a clean 403 +
        // upgrade URL instead of falling back to local or returning 503.
        if (err instanceof ProSubscriptionRequiredError) {
          usage.status = 403;
          usage.latencyMs = Date.now() - startTime;
          if (!rawRes.headersSent) {
            rawRes.setHeader('Content-Type', 'application/json');
            rawRes.writeHead(403);
            rawRes.end(
              JSON.stringify({
                error: 'pro_subscription_required',
                message: err.message,
                upgrade_url: err.upgradeUrl,
              }),
            );
          } else if (isStreaming) {
            sse.writeSSEError(rawRes, `Pro subscription not active. Manage at: ${err.upgradeUrl}`);
          }
          throw err;
        }

        console.error('[local-router] streaming failed:', err);
        usage.status = 503;
        usage.latencyMs = Date.now() - startTime;

        if (isStreaming) {
          sse.writeSSEError(rawRes, 'Provider unavailable');
        } else {
          rawRes.setHeader('Content-Type', 'application/json');
          rawRes.writeHead(503);
          rawRes.end(JSON.stringify({ error: 'Provider unavailable' }));
        }

        throw new ProviderError();
      }
    },
  };
}

async function streamFromOllama(
  body: ChatBody,
  rawRes: ServerResponse,
  usage: UsageMetrics,
  chatId: string,
  isStreaming: boolean,
  startTime: number,
  sse: SSEHelpers,
  signal?: AbortSignal,
): Promise<string> {
  const ollamaRes = await streamChat(body, signal);
  if (!ollamaRes.body) throw new Error('Ollama returned no body');

  const reader = ollamaRes.body.getReader();
  const decoder = new TextDecoder();
  const parser = createNdjsonParser();
  let firstChunk = true;
  let collectedContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const objects = parser.feed(chunk);

      for (const obj of objects) {
        const o = obj as Record<string, unknown>;
        if (firstChunk) {
          usage.ttfbMs = Date.now() - startTime;
          firstChunk = false;
        }

        const content = (o?.message as Record<string, unknown>)?.content as string | undefined;
        if (content) {
          usage.tokensOut++;
          collectedContent += content;
          if (isStreaming) sse.writeSSE(rawRes, sse.buildChunk(body.model, content, chatId));
        }

        if (o?.done === true) {
          if (typeof o.prompt_eval_count === 'number') usage.tokensIn = o.prompt_eval_count;
          if (typeof o.eval_count === 'number') usage.tokensOut = o.eval_count;
        }
      }
    }

    const remaining = parser.flush();
    for (const obj of remaining) {
      const o = obj as Record<string, unknown>;
      const content = (o?.message as Record<string, unknown>)?.content as string | undefined;
      if (content) {
        usage.tokensOut++;
        collectedContent += content;
        if (isStreaming) sse.writeSSE(rawRes, sse.buildChunk(body.model, content, chatId));
      }
      if (o?.done === true) {
        if (typeof o.prompt_eval_count === 'number') usage.tokensIn = o.prompt_eval_count;
        if (typeof o.eval_count === 'number') usage.tokensOut = o.eval_count;
      }
    }

    if (isStreaming) {
      sse.writeSSE(rawRes, sse.buildChunk(body.model, null, chatId, 'stop'));
      sse.endSSE(rawRes);
    }

    return collectedContent;
  } finally {
    reader.releaseLock();
  }
}

async function streamFromCloudProxy(
  body: ChatBody,
  rawRes: ServerResponse,
  usage: UsageMetrics,
  isStreaming: boolean,
  signal: AbortSignal | undefined,
  authHeader: string,
): Promise<string> {
  if (!authHeader) throw new ProviderError();

  const startTime = Date.now();
  const cloudRes = await callCloudInference(body, authHeader, signal);

  if (!cloudRes.ok) {
    throw new ProviderError();
  }
  if (!cloudRes.body) {
    throw new ProviderError();
  }

  if (!rawRes.headersSent) {
    if (isStreaming) {
      rawRes.setHeader('Content-Type', 'text/event-stream');
      rawRes.setHeader('Cache-Control', 'no-cache');
      rawRes.setHeader('Connection', 'keep-alive');
    } else {
      rawRes.setHeader('Content-Type', 'application/json');
    }
    rawRes.writeHead(200);
  }

  const reader = cloudRes.body.getReader();
  let firstChunk = true;
  let collectedContent = '';
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (firstChunk) {
        usage.ttfbMs = Date.now() - startTime;
        firstChunk = false;
      }

      rawRes.write(value);
      collectedContent += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
    rawRes.end();
  }

  return collectedContent;
}
