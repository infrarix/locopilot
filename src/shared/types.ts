import { ServerResponse } from 'http';
import { Provider } from './constants';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatBody {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

export interface UsageMetrics {
  model: string;
  provider: Provider;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  ttfbMs: number;
  status: number;
}

export interface SSEHelpers {
  writeSSE(res: ServerResponse, data: unknown): void;
  endSSE(res: ServerResponse): void;
  writeSSEError(res: ServerResponse, message: string): void;
  buildChunk(model: string, content: string | null, chatId: string, finishReason?: string | null): unknown;
  buildCompletion(model: string, content: string, usage: Pick<UsageMetrics, 'tokensIn' | 'tokensOut'>): unknown;
  generateChatId(): string;
  estimateTokens(messages: ChatMessage[]): number;
}

export interface Router {
  resolve(requestedModel: string, isProUser: boolean): Promise<Provider>;
  stream(
    provider: Provider,
    body: ChatBody,
    rawRes: ServerResponse,
    sse: SSEHelpers,
    signal?: AbortSignal,
    authHeader?: string,
  ): Promise<{ usage: UsageMetrics }>;
}

export interface ApiKey {
  id: string;
  rate_limit_rpm: number;
  rate_window_seconds: number;
  name?: string;
}

export interface AuthMiddleware {
  validate(authHeader: string | undefined): Promise<ApiKey | null>;
}

export interface UsageData {
  apiKeyId: string;
  model: string;
  provider: Provider;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  ttfbMs?: number;
  status?: number;
}

export interface UsageTracker {
  record(data: UsageData): Promise<void>;
}
