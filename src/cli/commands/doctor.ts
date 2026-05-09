'use strict';

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';
import * as paths from '../utils/paths';
import { callCloudAuthVerify } from '../../cloud/client';

async function check(label: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    console.log(chalk.green(`  ✔ ${label}`));
    return true;
  } catch (e) {
    console.log(chalk.red(`  ✖ ${label}`) + chalk.gray(` — ${(e as Error).message}`));
    return false;
  }
}

function readToken(): string | null {
  try {
    if (!fs.existsSync(paths.CONFIG_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(paths.CONFIG_PATH, 'utf8')) as Record<string, unknown>;
    const t = data.token;
    return typeof t === 'string' && t.startsWith('qs_') ? t : null;
  } catch {
    return null;
  }
}

function getPythonVersion(platform: string): string | null {
  const candidates = platform === 'win32' ? ['python3', 'python', 'py'] : ['python3'];
  for (const cmd of candidates) {
    try {
      const out = execFileSync(cmd, ['--version'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const version = (out || '').trim();
      if (/Python 3\.\d+/.test(version)) return `${version} (${cmd})`;
    } catch {
      /* try next */
    }
  }
  return null;
}

function isCommandAvailable(cmd: string): boolean {
  const which = process.platform === 'win32' ? 'where' : 'which';
  try {
    execFileSync(which, [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const cmd = new Command('doctor').description('Run pre-flight checks');

cmd.action(async () => {
  paths.loadEnv();
  const platform = process.platform;
  const arch = process.arch;

  console.log(chalk.bold('\n  QuickSlug Doctor\n'));
  console.log(chalk.gray(`  Platform: ${platform} / ${arch} / Node.js ${process.version}\n`));

  const results: boolean[] = [];

  // ── Ollama ────────────────────────────────────────────────────────────────
  results.push(
    await check('Ollama reachable', async () => {
      const host = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
      const res = await fetch(`${host}/`, { signal: AbortSignal.timeout(5_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }),
  );

  results.push(
    await check('Ollama CLI installed', async () => {
      if (!isCommandAvailable('ollama')) {
        const hint =
          platform === 'darwin'
            ? 'brew install --cask ollama'
            : platform === 'linux'
              ? 'curl -fsSL https://ollama.com/install.sh | sh'
              : 'winget install Ollama.Ollama';
        throw new Error(`Not found — ${hint}`);
      }
      let version = '';
      try {
        version = execFileSync('ollama', ['--version'], { encoding: 'utf8' }).trim();
      } catch {
        /* non-fatal */
      }
      if (version) return; // attach version to label
    }),
  );

  // ── Home dir + SQLite ─────────────────────────────────────────────────────
  results.push(
    await check('Home directory writable', async () => {
      paths.ensureHomeDir();
      const tmp = `${paths.SQLITE_PATH}.tmp`;
      fs.writeFileSync(tmp, '');
      fs.unlinkSync(tmp);
    }),
  );

  results.push(
    await check('SQLite database exists', async () => {
      if (!fs.existsSync(paths.SQLITE_PATH)) {
        throw new Error('Not found — run: quickslug init');
      }
      const stat = fs.statSync(paths.SQLITE_PATH);
      if (stat.size === 0) throw new Error('Database is empty — run: quickslug init');
    }),
  );

  // ── Disk space ────────────────────────────────────────────────────────────
  results.push(
    await check('Disk space (> 500 MB free)', async () => {
      // fs.statfsSync added in Node 19.6 / 20.0
      const statfsSync = (fs as unknown as { statfsSync?: (p: string) => { bavail: number; bsize: number } })
        .statfsSync;
      if (typeof statfsSync !== 'function') return; // skip on older Node
      const stats = statfsSync(paths.HOME_DIR);
      const freeMB = (stats.bavail * stats.bsize) / (1024 * 1024);
      if (freeMB < 500) {
        throw new Error(`Only ${Math.floor(freeMB)} MB free — models require several GB`);
      }
    }),
  );

  // ── Python 3 (for training adapters) ─────────────────────────────────────
  console.log('');
  results.push(
    await check('Python 3 (for training adapters)', async () => {
      const version = getPythonVersion(platform);
      if (!version) {
        const hint =
          platform === 'darwin'
            ? 'brew install python3'
            : platform === 'win32'
              ? 'https://www.python.org/downloads/'
              : 'sudo apt install python3';
        throw new Error(`Not found — ${hint}`);
      }
    }),
  );

  // ── Training adapter hint ─────────────────────────────────────────────────
  if (platform === 'darwin' && arch === 'arm64') {
    const mlxOk = await check('MLX adapter (mlx-lm)', async () => {
      execFileSync('python3', ['-c', 'import mlx_lm'], {
        stdio: ['ignore', 'ignore', 'pipe'],
      });
    });
    if (!mlxOk) {
      console.log(chalk.gray('    Install: pip3 install mlx-lm'));
    }
  } else {
    const unslothOk = await check('Unsloth adapter', async () => {
      const py = platform === 'win32' ? 'python' : 'python3';
      execFileSync(py, ['-c', 'import unsloth'], { stdio: ['ignore', 'ignore', 'pipe'] });
    });
    if (!unslothOk) {
      console.log(chalk.gray('    Install: pip3 install unsloth trl transformers datasets'));
    }
  }

  // ── API server ────────────────────────────────────────────────────────────
  console.log('');
  results.push(
    await check('Local API server reachable', async () => {
      const port = process.env.API_PORT ?? '8080';
      const res = await fetch(`http://localhost:${port}/v1/quickslug/health`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }),
  );

  // ── Pro-tier checks ───────────────────────────────────────────────────────
  console.log('');
  const token = readToken();
  if (!token) {
    console.log(chalk.gray('  Pro: not logged in — run `quickslug login` to enable cloud features'));
  } else {
    results.push(
      await check('(Pro) QuickSlug Cloud reachable', async () => {
        const res = await callCloudAuthVerify(`Bearer ${token}`);
        if (res.status === 401) throw new Error('Invalid API key — run: quickslug login');
        if (!res.ok) throw new Error(`Cloud returned HTTP ${res.status}`);
      }),
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  const allOk = results.every(Boolean);
  if (allOk) {
    const mode = token ? 'Pro' : 'Free';
    console.log(chalk.green.bold(`  ${mode} tier ready.\n`));
  } else {
    const failCount = results.filter((r) => !r).length;
    console.log(chalk.yellow.bold(`  ${failCount} check(s) failed. Fix the issues above and retry.\n`));
    process.exitCode = 1;
  }
});

export default cmd;
