'use strict';

import { OLLAMA_HOST } from '../../constants';

const HEALTH_TIMEOUT_MS = 5_000;
const LIST_TIMEOUT_MS = 8_000;
const STREAM_TIMEOUT_MS = 30_000;
const PULL_TIMEOUT_MS = 300_000; // model pulls can take minutes

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export async function getLocalModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
    signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Ollama unreachable: ${res.status}`);
  const data = (await res.json()) as { models?: OllamaModel[] };
  return data.models ?? [];
}

export async function streamChat(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(STREAM_TIMEOUT_MS);
  const effectiveSignal = signal
    ? AbortSignal.any
      ? AbortSignal.any([timeoutSignal, signal])
      : timeoutSignal
    : timeoutSignal;

  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true }),
    signal: effectiveSignal,
  });
  if (!res.ok) throw new Error(`Ollama chat error: ${res.status}`);
  return res;
}

export async function checkOllama(): Promise<void> {
  const res = await fetch(`${OLLAMA_HOST}/`, {
    signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Ollama health check failed: ${res.status}`);
}

export async function pullModel(modelName: string): Promise<void> {
  const res = await fetch(`${OLLAMA_HOST}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName }),
    signal: AbortSignal.timeout(PULL_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Failed to pull model ${modelName}: ${res.status}`);
}
