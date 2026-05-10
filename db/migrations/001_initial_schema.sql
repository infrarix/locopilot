-- Migration: 001_initial_schema
-- Run via: node-pg-migrate up
-- All tables from LocoPilot MVP Spec v1.0 §4

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── API Keys (§4.1) ────────────────────────────────────────────────────────

CREATE TABLE api_keys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash            TEXT NOT NULL UNIQUE,
  name                TEXT,
  rate_limit_rpm      INT NOT NULL DEFAULT 60,
  rate_window_seconds INT NOT NULL DEFAULT 60,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Fast lookup by hash — auth middleware does this on every request
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ── Inference Logs (§4.2) ──────────────────────────────────────────────────

CREATE TABLE inference_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id   UUID NOT NULL REFERENCES api_keys(id),
  model        TEXT NOT NULL,
  provider     TEXT NOT NULL CHECK (provider IN ('local', 'remote')),
  tokens_in    INT,
  tokens_out   INT,
  latency_ms   INT,
  ttfb_ms      INT,
  status       INT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inference_logs_api_key ON inference_logs(api_key_id);
CREATE INDEX idx_inference_logs_created ON inference_logs(created_at DESC);

-- ── Training Jobs (§4.3) ───────────────────────────────────────────────────

CREATE TABLE training_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id     UUID NOT NULL REFERENCES api_keys(id),
  framework      TEXT NOT NULL CHECK (framework IN ('unsloth', 'axolotl', 'mlx')),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  base_model     TEXT NOT NULL,
  dataset_path   TEXT NOT NULL,
  output_path    TEXT,
  config_json    JSONB NOT NULL DEFAULT '{}',
  error          TEXT,
  started_at     TIMESTAMP,
  completed_at   TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_jobs_status ON training_jobs(status);
CREATE INDEX idx_training_jobs_api_key ON training_jobs(api_key_id);

-- ── Usage Events (§4.4) ────────────────────────────────────────────────────

CREATE TABLE usage_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id   UUID NOT NULL REFERENCES api_keys(id),
  model        TEXT NOT NULL,
  provider     TEXT NOT NULL CHECK (provider IN ('local', 'remote')),
  tokens       INT NOT NULL,
  cost         FLOAT NOT NULL DEFAULT 0,
  timestamp    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_events_api_key ON usage_events(api_key_id);
CREATE INDEX idx_usage_events_timestamp ON usage_events(timestamp DESC);
