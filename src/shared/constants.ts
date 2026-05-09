'use strict';

export const SSE_FLUSH_INTERVAL_MS = 50;

export const DEFAULT_RATE_LIMIT_RPM = parseInt(process.env.RATE_LIMIT_RPM ?? '') || 60;

export const DEFAULT_RATE_WINDOW_SECONDS = 60;

// Free-tier training defaults — conservative for consumer hardware.
// Pro tier uses larger values set cloud-side by the private adapters.
export const TRAINING_DEFAULTS = Object.freeze({
  epochs: 3,
  batchSize: 2, // conservative for local VRAM
  gradientAccumulation: 4,
  learningRate: 2e-4,
  loraR: 8, // smaller rank = less memory on free tier
  loraAlpha: 16, // matched to loraR ratio
  maxSeqLength: 2048,
} as const);

export const MIN_DATASET_EXAMPLES = 10;

export const DATASET_VALIDATION_LINES = 5;

export const VALID_FRAMEWORKS = Object.freeze(['unsloth', 'axolotl', 'mlx'] as const);

export type Framework = (typeof VALID_FRAMEWORKS)[number];

export const PROVIDERS = Object.freeze({
  LOCAL: 'local',
  REMOTE: 'remote',
  NOT_FOUND: 'not_found',
} as const);

export type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

export const API_PORT = parseInt(process.env.API_PORT ?? '') || 8080;

export const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

export const CHARS_PER_TOKEN = 4;

// ── Ollama HTTP timeouts ────────────────────────────────────────────────────
export const OLLAMA_LIST_TIMEOUT_MS = 8_000;
export const OLLAMA_HEALTH_TIMEOUT_MS = 5_000;

// ── Training worker SSE polling ─────────────────────────────────────────────
// How long to wait for the executor to register a log emitter after the job
// is created (handles client SSE-connect race) and how often to poll for
// terminal state once a stream is open.
export const LOG_EMITTER_WAIT_MS = 5_000;
export const JOB_STATUS_POLL_MS = 5_000;
export const EMITTER_POLL_TICK_MS = 100;
