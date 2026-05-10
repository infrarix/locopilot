'use strict';

import { readFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Resolution order: LOCOPILOT_CLOUD_URL (legacy) → INFRARIX_API_URL
// (unified platform) → default. The unified Infrarix Platform backend
// preserves LocoPilot's /api/* contract end-to-end.
export const CLOUD_URL = process.env.LOCOPILOT_CLOUD_URL ?? process.env.INFRARIX_API_URL ?? 'https://api.infrarix.com';
const CLOUD_TIMEOUT_MS = 30_000;

const CONFIG_DIR = join(homedir(), '.locopilot');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

interface LocoPilotConfig {
  token: string;
}

/** Reads ~/.locopilot/config.json. Returns null if absent or invalid. */
export function readCloudConfig(): LocoPilotConfig | null {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw) as { token?: string };
    if (typeof cfg.token === 'string' && cfg.token.startsWith('qs_')) {
      return { token: cfg.token };
    }
  } catch {
    // file missing or malformed
  }
  return null;
}

/** Returns the stored qs_ token, or null if not logged in. */
export function getCloudToken(): string | null {
  return readCloudConfig()?.token ?? null;
}

/** True only when a valid qs_ token exists in ~/.locopilot/config.json.
 *  Note: this proves the user has *logged in*, NOT that they have an active
 *  Pro subscription. Subscription status is enforced server-side and may
 *  return 403 `pro_subscription_required` even with a valid token. */
export function isProUser(): boolean {
  return getCloudToken() !== null;
}

/** Thrown when the cloud backend rejects a request because the user's
 *  Pro subscription is missing, expired, past-due, or canceled. */
export class ProSubscriptionRequiredError extends Error {
  constructor(
    public upgradeUrl: string,
    message?: string,
  ) {
    super(message ?? 'pro_subscription_required');
    this.name = 'ProSubscriptionRequiredError';
  }
}

interface ProDeniedBody {
  error?: string;
  upgrade_url?: string;
  message?: string;
}

/** Inspects a 403 response. If body matches the Pro-required shape, throws
 *  ProSubscriptionRequiredError; otherwise returns the response unchanged.
 *  Reads via .clone() so callers can still consume the original body. */
export async function throwIfProRequired(res: Response): Promise<Response> {
  if (res.status !== 403) return res;
  let body: ProDeniedBody | null = null;
  try {
    body = (await res.clone().json()) as ProDeniedBody;
  } catch {
    return res;
  }
  if (body?.error === 'pro_subscription_required') {
    throw new ProSubscriptionRequiredError(body.upgrade_url ?? 'https://locopilot.com/dashboard', body.message);
  }
  return res;
}

// ── Cloud API calls ──────────────────────────────────────────────────────────

export async function callCloudInference(body: unknown, authHeader: string, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(`${CLOUD_URL}/api/inference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(CLOUD_TIMEOUT_MS),
  });
  return throwIfProRequired(res);
}

export async function callCloudTrain(body: unknown, authHeader: string): Promise<Response> {
  const res = await fetch(`${CLOUD_URL}/api/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CLOUD_TIMEOUT_MS),
  });
  return throwIfProRequired(res);
}

export async function callCloudTrainStatus(jobId: string, authHeader: string): Promise<Response> {
  return fetch(`${CLOUD_URL}/api/train/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: authHeader },
    signal: AbortSignal.timeout(CLOUD_TIMEOUT_MS),
  });
}

export async function callCloudTrainLogs(jobId: string, authHeader: string): Promise<Response> {
  return fetch(`${CLOUD_URL}/api/train/${encodeURIComponent(jobId)}/logs`, {
    headers: { Authorization: authHeader },
    signal: AbortSignal.timeout(CLOUD_TIMEOUT_MS),
  });
}

export async function callCloudHealth(authHeader: string): Promise<Response> {
  return fetch(`${CLOUD_URL}/api/health`, {
    headers: { Authorization: authHeader },
    signal: AbortSignal.timeout(5_000),
  });
}

export async function callCloudAuthVerify(authHeader: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${CLOUD_URL}/api/auth/verify`, {
    headers: { Authorization: authHeader },
    signal: signal ?? AbortSignal.timeout(10_000),
  });
}

export async function callCloudTunnel(authHeader: string, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(`${CLOUD_URL}/api/tunnel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: '{}',
    signal: signal ?? AbortSignal.timeout(CLOUD_TIMEOUT_MS),
  });
  return throwIfProRequired(res);
}

export async function callCloudAuthMe(authHeader: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${CLOUD_URL}/api/auth/me`, {
    headers: { Authorization: authHeader },
    signal: signal ?? AbortSignal.timeout(10_000),
  });
}

export async function callCloudUsage(authHeader: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${CLOUD_URL}/api/usage`, {
    headers: { Authorization: authHeader },
    signal: signal ?? AbortSignal.timeout(10_000),
  });
}

export async function callCloudModels(authHeader: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${CLOUD_URL}/api/models`, {
    headers: { Authorization: authHeader },
    signal: signal ?? AbortSignal.timeout(10_000),
  });
}

/** Ensures ~/.locopilot/ directory exists. Called from init and login commands. */
export function ensureConfigDir(): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
}
