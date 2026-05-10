'use strict';

/**
 * Worker route + DB types — shared between handlers, executor, and logStore.
 *
 * Job state machine: pending → running → (completed | failed). The DB column
 * type is TEXT in SQLite; we keep the value space tight via the JobStatus union.
 */

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

// ── HTTP request body for POST /v1/locopilot/training/jobs ─────────────────

export interface CreateJobBody {
  framework?: string;
  baseModel?: string;
  datasetPath?: string;
  outputDir?: string;
  // Per-config overrides allowed; full schema in src/training/types.ts
  [key: string]: unknown;
}

// ── DB rows from the training_jobs table (SQLite) ───────────────────────────

export interface JobRow {
  id: string;
  status: JobStatus;
  framework: string;
  base_model: string;
  dataset_path: string;
  created_at: string;
}

export interface JobStatusRow extends JobRow {
  output_path: string | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

// Used by streamLogs handler to verify a job exists before subscribing
export interface JobStatusOnlyRow {
  status: JobStatus;
}
