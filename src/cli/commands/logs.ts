'use strict';

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import { CONFIG_PATH, loadEnv } from '../utils/paths';

interface LogsOptions {
  job: string;
}

function readToken(): string | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Record<string, unknown>;
    const t = data.token;
    return typeof t === 'string' && t.startsWith('qs_') ? t : null;
  } catch {
    return null;
  }
}

const cmd = new Command('logs').description('Stream logs for a training job');
cmd.requiredOption('--job <id>', 'Training job ID');

cmd.action(async (opts: LogsOptions) => {
  loadEnv();
  const base = `http://localhost:${process.env.API_PORT ?? '8080'}`;
  const token = readToken();

  const url = `${base}/v1/locopilot/training/jobs/${opts.job}/logs`;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  console.log(chalk.gray(`\n  Streaming logs for job ${opts.job}...\n`));

  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(600_000) });
  } catch (err) {
    console.error(chalk.red(`  Could not connect to API: ${(err as Error).message}`));
    console.error(chalk.gray('  Is LocoPilot running? Try: locopilot start'));
    process.exit(1);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}) as Record<string, unknown>)) as { error?: string };
    console.error(chalk.red(`  API error ${res.status}:`), body.error ?? 'Unknown error');
    if (res.status === 404) {
      console.error(chalk.gray('  Check the job ID: locopilot train --config <file>'));
    }
    process.exit(1);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    console.error(chalk.red('  No response body from server.'));
    process.exit(1);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          console.log(chalk.green('\n  Stream ended.\n'));
          return;
        }
        if (data) process.stdout.write(data + '\n');
      }
    }

    // Flush remaining buffer
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6).trim();
      if (data && data !== '[DONE]') process.stdout.write(data + '\n');
    }

    console.log(chalk.gray('\n  Log stream closed. Job may still be running.'));
    console.log(chalk.gray(`  Re-run: locopilot logs --job ${opts.job}\n`));
  } catch (err) {
    console.error(chalk.yellow(`\n  Stream ended: ${(err as Error).message}`));
    console.error(chalk.gray(`  Re-run: locopilot logs --job ${opts.job}\n`));
  } finally {
    reader.releaseLock();
  }
});

export default cmd;
