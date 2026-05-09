'use strict';

import { OLLAMA_HOST, OLLAMA_LIST_TIMEOUT_MS, OLLAMA_HEALTH_TIMEOUT_MS } from '../../shared';

export interface OllamaModel {
  name: string;
}

export async function getLocalModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
    signal: AbortSignal.timeout(OLLAMA_LIST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Ollama unreachable: ${res.status}`);
  const data = (await res.json()) as { models?: OllamaModel[] };
  return data.models ?? [];
}

export async function checkOllama(): Promise<void> {
  const res = await fetch(`${OLLAMA_HOST}/`, {
    signal: AbortSignal.timeout(OLLAMA_HEALTH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Ollama health check failed: ${res.status}`);
}
