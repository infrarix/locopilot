'use strict';

import crypto from 'crypto';
import { ServerResponse } from 'http';
import type { ChatMessage } from '../../shared';

export function setSSEHeaders(res: ServerResponse): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
}

export function buildChunk(
  model: string,
  content: string | null,
  chatId: string,
  finishReason: string | null = null,
): object {
  return {
    id: chatId,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: content !== null ? { content } : {},
        finish_reason: finishReason,
      },
    ],
  };
}

export function buildCompletion(
  model: string,
  content: string,
  usage: { tokensIn: number; tokensOut: number },
): object {
  return {
    id: generateChatId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: usage.tokensIn,
      completion_tokens: usage.tokensOut,
      total_tokens: usage.tokensIn + usage.tokensOut,
    },
  };
}

export function writeSSE(res: ServerResponse, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function endSSE(res: ServerResponse): void {
  res.write('data: [DONE]\n\n');
  res.end();
}

export function writeSSEError(res: ServerResponse, message: string): void {
  res.write(`data: ${JSON.stringify({ error: { message } })}\n\n`);
  endSSE(res);
}

export function generateChatId(): string {
  return `chatcmpl-${crypto.randomBytes(12).toString('base64url')}`;
}

export function estimateTokens(messages: ChatMessage[]): number {
  if (!Array.isArray(messages)) return 0;
  const totalChars = messages.reduce((sum, m) => {
    return sum + (typeof m.content === 'string' ? m.content.length : 0);
  }, 0);
  return Math.ceil(totalChars / 4);
}
