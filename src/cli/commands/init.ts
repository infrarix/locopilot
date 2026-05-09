'use strict';

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import { execFileSync, execSync, spawn } from 'child_process';
import os from 'os';
import * as paths from '../utils/paths';
import { printBanner } from '../utils/banner';
import { query } from '../../shared';

const cmd = new Command('init').description(
  'Initialize QuickSlug — installs Ollama, sets up local database, writes config',
);

cmd.action(async () => {
  printBanner();
  console.log(chalk.bold('  QuickSlug Setup\n'));

  paths.ensureHomeDir();

  const platform = process.platform;
  const arch = process.arch;

  // ── 1. Ollama ────────────────────────────────────────────────────────────
  console.log(chalk.cyan('  [1/4] Checking Ollama...'));
  await ensureOllamaInstalled(platform);
  await ensureOllamaRunning(platform);

  // ── 2. Python 3 ──────────────────────────────────────────────────────────
  console.log(chalk.cyan('\n  [2/4] Checking Python 3 (required for training adapters)...'));
  checkPython(platform);

  // ── 3. Database ──────────────────────────────────────────────────────────
  console.log(chalk.cyan('\n  [3/4] Initializing local database...'));
  process.env.SQLITE_PATH = paths.SQLITE_PATH;
  const dbSpinner = ora('  Creating tables...').start();
  try {
    await initializeSQLite();
    dbSpinner.succeed(chalk.green(`  SQLite ready at ${paths.SQLITE_PATH}`));
  } catch (err) {
    dbSpinner.fail(chalk.red(`  Database error: ${(err as Error).message}`));
    process.exit(1);
  }

  // ── 4. Config file ───────────────────────────────────────────────────────
  console.log(chalk.cyan('\n  [4/4] Writing default config...'));
  if (!fs.existsSync(paths.ENV_PATH)) {
    fs.writeFileSync(
      paths.ENV_PATH,
      [
        '# QuickSlug local config — edit as needed',
        `SQLITE_PATH=${paths.SQLITE_PATH}`,
        'OLLAMA_HOST=http://localhost:11434',
        'API_PORT=8080',
        '',
        '# Uncomment to override the QuickSlug Cloud URL (for local dev):',
        '# QUICKSLUG_CLOUD_URL=http://localhost:8081',
      ].join('\n') + '\n',
      { encoding: 'utf8' },
    );
    console.log(chalk.green(`  ✔ Config written to ${paths.ENV_PATH}`));
  } else {
    console.log(chalk.gray(`  Config already exists at ${paths.ENV_PATH}`));
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(chalk.bold('\n  Setup complete!\n'));

  if (platform === 'darwin' && arch === 'arm64') {
    console.log(chalk.gray('  Apple Silicon detected — training will use the MLX adapter (mlx-lm).'));
    console.log(chalk.gray('  Install: ') + chalk.white('pip3 install mlx-lm\n'));
  } else {
    console.log(chalk.gray('  Training uses Unsloth or Axolotl (Linux/Windows).'));
    console.log(chalk.gray('  Install: ') + chalk.white('pip3 install unsloth trl transformers datasets\n'));
  }

  console.log(chalk.gray('  Run ') + chalk.white('quickslug start') + chalk.gray(' to launch the local API.'));
  console.log(chalk.gray('  Run ') + chalk.white('quickslug models pull llama3') + chalk.gray(' to download a model.'));
  console.log(
    chalk.gray('  Run ') +
      chalk.white('quickslug login') +
      chalk.gray(' to enable Pro tier (cloud GPU, remote models).\n'),
  );
});

// ── Ollama install ────────────────────────────────────────────────────────────

async function ensureOllamaInstalled(platform: string): Promise<void> {
  // Check if ollama binary is already available
  if (isCommandAvailable('ollama')) {
    let version = '';
    try {
      version = execFileSync('ollama', ['--version'], { encoding: 'utf8' }).trim();
    } catch {
      /* ignore */
    }
    console.log(chalk.green(`  ✔ Ollama installed ${version ? chalk.gray(`(${version})`) : ''}`));
    return;
  }

  console.log(chalk.yellow('  Ollama not found — attempting installation...'));
  const spinner = ora('  Installing Ollama...').start();

  try {
    if (platform === 'darwin') {
      // Prefer brew cask; fall back to formula (headless)
      if (isCommandAvailable('brew')) {
        execSync('brew install --cask ollama', { stdio: 'ignore' });
      } else {
        spinner.fail(chalk.red('  Homebrew not found. Install Homebrew first: https://brew.sh'));
        console.log(chalk.gray('  Then run: brew install --cask ollama'));
        console.log(chalk.gray('  Or download from: https://ollama.ai/download'));
        process.exit(1);
      }
    } else if (platform === 'linux') {
      execSync('curl -fsSL https://ollama.com/install.sh | sh', { stdio: 'ignore', shell: '/bin/sh' });
    } else if (platform === 'win32') {
      if (isCommandAvailable('winget')) {
        execSync('winget install -e --id Ollama.Ollama', { stdio: 'ignore', shell: 'cmd.exe' });
      } else {
        spinner.fail(chalk.red('  winget not found.'));
        console.log(chalk.gray('  Download Ollama from: https://ollama.ai/download'));
        process.exit(1);
      }
    } else {
      spinner.fail(chalk.yellow(`  Unsupported platform: ${platform}`));
      console.log(chalk.gray('  Install manually: https://ollama.ai/download'));
      return;
    }
    spinner.succeed(chalk.green('  Ollama installed successfully'));
  } catch (err) {
    spinner.fail(chalk.yellow(`  Auto-install failed: ${(err as Error).message}`));
    console.log(chalk.gray('  Install manually: https://ollama.ai/download'));
  }
}

// ── Ollama service start ──────────────────────────────────────────────────────

async function ensureOllamaRunning(platform: string): Promise<void> {
  const host = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

  // First check: is it already running?
  try {
    const res = await fetch(host, { signal: AbortSignal.timeout(3_000) });
    if (res.ok) {
      console.log(chalk.green('  ✔ Ollama service running'));
      return;
    }
  } catch {
    /* not running */
  }

  // If the binary isn't on PATH, there's nothing to start — installation
  // earlier must have failed. Print clear instructions and return rather
  // than crashing on spawn ENOENT.
  if (!isCommandAvailable('ollama')) {
    console.log(chalk.yellow('  ⚠ Ollama binary not available — skipping service start.'));
    printOllamaInstallHint(platform);
    return;
  }

  console.log(chalk.yellow('  Ollama service not running — attempting to start...'));

  if (platform === 'darwin') {
    try {
      execSync('brew services start ollama', { stdio: 'ignore' });
    } catch {
      startOllamaBackground();
    }
  } else if (platform === 'linux') {
    try {
      execSync('systemctl --user start ollama 2>/dev/null || ollama serve &', {
        stdio: 'ignore',
        shell: '/bin/sh',
      });
    } catch {
      startOllamaBackground();
    }
  } else if (platform === 'win32') {
    // On Windows, Ollama runs as a tray application — launch it.
    startOllamaBackground();
  } else {
    startOllamaBackground();
  }

  // Wait up to 10 s for Ollama to come up
  const spinner = ora('  Waiting for Ollama to start...').start();
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(host, { signal: AbortSignal.timeout(1_000) });
      if (res.ok) {
        spinner.succeed(chalk.green('  Ollama service ready'));
        return;
      }
    } catch {
      /* keep waiting */
    }
  }

  spinner.warn(chalk.yellow('  Ollama did not respond within 10 s.'));
  console.log(chalk.gray('  Make sure Ollama is running before using QuickSlug.'));
  console.log(chalk.gray('  On macOS/Linux: ') + chalk.white('ollama serve'));
  console.log(chalk.gray('  On Windows: open Ollama from Start menu\n'));
}

function startOllamaBackground(): void {
  try {
    const proc = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
      shell: false,
    });
    // spawn() does not throw synchronously on ENOENT — it emits an 'error'
    // event. Without a listener, Node treats it as unhandled and crashes.
    proc.on('error', () => {
      /* binary missing or failed; surface elsewhere */
    });
    proc.unref();
  } catch {
    /* synchronous failures (rare) */
  }
}

function printOllamaInstallHint(platform: string): void {
  console.log(chalk.gray('  Install Ollama and re-run `quickslug init`:'));
  if (platform === 'darwin') {
    console.log(chalk.gray('    macOS:   ') + chalk.white('brew install --cask ollama'));
    console.log(chalk.gray('             ') + chalk.gray('or download from https://ollama.ai/download'));
  } else if (platform === 'linux') {
    console.log(chalk.gray('    Linux:   ') + chalk.white('curl -fsSL https://ollama.com/install.sh | sh'));
  } else if (platform === 'win32') {
    console.log(chalk.gray('    Windows: ') + chalk.white('winget install Ollama.Ollama'));
    console.log(chalk.gray('             ') + chalk.gray('or download from https://ollama.ai/download'));
  } else {
    console.log(chalk.gray('    Manual:  https://ollama.ai/download'));
  }
}

// ── Python check ─────────────────────────────────────────────────────────────

function checkPython(platform: string): void {
  // On Windows: try 'python', 'python3' (py launcher). On Unix: 'python3'.
  const candidates = platform === 'win32' ? ['python3', 'python', 'py'] : ['python3'];

  for (const cmd of candidates) {
    try {
      const out = execFileSync(cmd, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const version = (out || '').trim();
      if (/Python 3\.\d+/.test(version)) {
        console.log(chalk.green(`  ✔ ${version} (${cmd})`));
        return;
      }
    } catch {
      /* try next */
    }
  }

  console.log(chalk.yellow('  ⚠ Python 3 not found.'));
  console.log(chalk.gray('    Training adapters require Python 3.9+.'));
  if (platform === 'darwin') {
    console.log(chalk.gray('    Install: ') + chalk.white('brew install python3'));
  } else if (platform === 'win32') {
    console.log(chalk.gray('    Install from: ') + chalk.white('https://www.python.org/downloads/'));
  } else {
    console.log(chalk.gray('    Install: ') + chalk.white('sudo apt install python3   # or your distro equivalent'));
  }
}

// ── SQLite schema ─────────────────────────────────────────────────────────────

async function initializeSQLite(): Promise<void> {
  // UUIDv4-compatible blob default for SQLite
  const uuidDefault = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

  await query(`
    CREATE TABLE IF NOT EXISTS inference_logs (
      id          TEXT PRIMARY KEY DEFAULT ${uuidDefault},
      api_key_id  TEXT,
      model       TEXT NOT NULL,
      provider    TEXT NOT NULL,
      tokens_in   INTEGER,
      tokens_out  INTEGER,
      latency_ms  INTEGER,
      ttfb_ms     INTEGER,
      status      INTEGER,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS training_jobs (
      id           TEXT PRIMARY KEY,
      framework    TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      base_model   TEXT NOT NULL,
      dataset_path TEXT NOT NULL,
      output_path  TEXT,
      config_json  TEXT NOT NULL DEFAULT '{}',
      error        TEXT,
      started_at   TEXT,
      completed_at TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_training_jobs_status ON training_jobs(status)`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCommandAvailable(cmd: string): boolean {
  const which = process.platform === 'win32' ? 'where' : 'which';
  try {
    execFileSync(which, [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export default cmd;
