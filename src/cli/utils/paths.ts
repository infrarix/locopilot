'use strict';

import path from 'path';
import os from 'os';
import fs from 'fs';
import dotenv from 'dotenv';

export const HOME_DIR = path.join(os.homedir(), '.quickslug');
export const ENV_PATH = path.join(HOME_DIR, '.env');
export const DATA_DIR = path.join(HOME_DIR, 'data');
export const CONFIG_PATH = path.join(HOME_DIR, 'config.json');
export const SQLITE_PATH = path.join(HOME_DIR, 'db.sqlite');

export function ensureHomeDir(): void {
  if (!fs.existsSync(HOME_DIR)) fs.mkdirSync(HOME_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Load .env from an explicit path. dotenv internally calls process.cwd() even
 * when given an explicit path, which throws if the shell is in a deleted dir.
 * Wrap in try/catch so env loading is best-effort and never crashes the CLI.
 */
export function loadEnv(envPath: string = ENV_PATH): void {
  try {
    dotenv.config({ path: envPath });
  } catch {
    // best-effort: continue without env
  }
}
