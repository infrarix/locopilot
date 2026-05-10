'use strict';

/**
 * API route types — request/response shapes used by Fastify handlers.
 *
 * Runtime types shared across the codebase (ChatBody, UsageMetrics, Router, …)
 * live in `src/shared/types.ts`. This file is for HTTP-surface types that are
 * specific to the public Fastify gateway.
 */

import type { ChatBody, UsageMetrics, ApiKey } from '../shared';

// ── /v1/chat/completions ────────────────────────────────────────────────────

export type ChatRequestBody = ChatBody;

// ── /v1/completions (legacy) ────────────────────────────────────────────────

export interface CompletionsRequestBody {
  model: string;
  prompt: string;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  stop?: unknown;
}

// ── /v1/locopilot/health ────────────────────────────────────────────────────

export interface ServiceHealth {
  ok: boolean;
  responseMs?: number;
  error?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  mode: 'free' | 'pro';
  services: Record<string, ServiceHealth>;
}

// ── /v1/models ──────────────────────────────────────────────────────────────

export interface ModelEntry {
  id: string;
  object: 'model';
  created: number;
  owned_by: 'local' | 'remote';
  context_length?: number;
}

export interface ModelsResponse {
  object: 'list';
  data: ModelEntry[];
}

// Cloud /api/models response shape — what the cloud backend returns.
export interface CloudModelsResponse {
  object: 'list';
  data: Array<{
    id: string;
    object: string;
    created?: number;
    owned_by: string;
    context_length?: number;
  }>;
}

// ── Error envelope ──────────────────────────────────────────────────────────

export interface ErrorBody {
  error: string;
  message?: string;
  statusCode?: number;
}

// ── Re-exports for convenient route imports ─────────────────────────────────

export type { UsageMetrics, ApiKey };
