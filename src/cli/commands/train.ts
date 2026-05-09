'use strict';

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { CONFIG_PATH, loadEnv } from '../utils/paths';
import {
  callCloudTrain,
  callCloudTrainStatus,
  callCloudTrainLogs,
  ProSubscriptionRequiredError,
} from '../../cloud/client';

interface TrainOptions {
  config: string;
  cloud: boolean;
}

interface TrainingConfigInput {
  framework?: string;
  baseModel?: string;
  datasetPath?: string;
  outputDir?: string;
  [key: string]: unknown;
}

interface JobResponse {
  id: string;
  status?: string;
  error?: string;
  output_path?: string;
  [key: string]: unknown;
}

interface QuickSlugConfig {
  token?: string;
}

function readProToken(): string | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as QuickSlugConfig;
    const t = cfg.token ?? null;
    return t && t.startsWith('qs_') ? t : null;
  } catch {
    return null;
  }
}

const cmd = new Command('train').description('Submit a fine-tuning job');
cmd.requiredOption('--config <file>', 'Path to training config JSON');
cmd.option('--cloud', 'Route job to QuickSlug Cloud (requires quickslug login)', false);

cmd.action(async (opts: TrainOptions) => {
  loadEnv();

  const configPath = path.resolve(opts.config);
  if (!fs.existsSync(configPath)) {
    console.error(chalk.red(`  Config file not found: ${configPath}`));
    process.exit(1);
  }

  let config: TrainingConfigInput;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as TrainingConfigInput;
  } catch (err) {
    console.error(chalk.red(`  Invalid JSON in config file: ${(err as Error).message}`));
    process.exit(1);
  }

  for (const field of ['framework', 'baseModel', 'datasetPath', 'outputDir'] as const) {
    if (!config[field]) {
      console.error(chalk.red(`  Config missing required field: ${field}`));
      process.exit(1);
    }
  }

  // Resolve relative paths relative to the config file's directory
  const configDir = path.dirname(configPath);
  if (config.datasetPath && !path.isAbsolute(config.datasetPath)) {
    config.datasetPath = path.resolve(configDir, config.datasetPath);
  }
  if (config.outputDir && !path.isAbsolute(config.outputDir)) {
    config.outputDir = path.resolve(configDir, config.outputDir);
  }

  // ── Cloud path ─────────────────────────────────────────────────────────
  if (opts.cloud) {
    const token = readProToken();
    if (!token) {
      console.error(chalk.red('  Not logged in. Run: quickslug login'));
      process.exit(1);
    }

    const authHeader = `Bearer ${token}`;
    console.log(chalk.bold('\n  Submitting cloud training job...\n'));

    let submitRes: Response;
    try {
      submitRes = await callCloudTrain(config, authHeader);
    } catch (err) {
      if (err instanceof ProSubscriptionRequiredError) {
        console.error(chalk.red('\n  ✖ Pro subscription not active.'));
        console.error(chalk.gray(`    Manage at: ${err.upgradeUrl}\n`));
        process.exit(1);
      }
      console.error(chalk.red(`  Could not connect to QuickSlug Cloud: ${(err as Error).message}`));
      process.exit(1);
    }

    const job = (await submitRes.json()) as JobResponse;
    if (!submitRes.ok) {
      console.error(chalk.red('  ✖ Job rejected:'), job.error ?? JSON.stringify(job));
      process.exit(1);
    }

    console.log(chalk.green(`  ✔ Job created: ${job.id}`));
    console.log(chalk.gray(`    Framework:  ${config.framework}`));
    console.log(chalk.gray(`    Base model: ${config.baseModel}`));
    console.log(chalk.bold('\n  Tailing logs...\n'));

    try {
      const logsRes = await callCloudTrainLogs(job.id, authHeader);
      await tailLogsFromResponse(logsRes);
    } catch (err) {
      console.error(chalk.yellow(`\n  Could not connect to log stream: ${(err as Error).message}`));
    }

    try {
      const statusRes = await callCloudTrainStatus(job.id, authHeader);
      await printFinalStatusFromResponse(statusRes);
    } catch {
      // best-effort
    }
    return;
  }

  // ── Free tier path ─────────────────────────────────────────────────────
  const base = `http://localhost:${process.env.API_PORT ?? '8080'}`;

  console.log(chalk.bold('\n  Submitting training job...\n'));

  let res: Response;
  try {
    res = await fetch(`${base}/v1/quickslug/training/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    console.error(chalk.red(`  Could not connect to API: ${(err as Error).message}`));
    console.error(chalk.gray('  Is QuickSlug running? Try: quickslug start'));
    process.exit(1);
  }

  const job = (await res.json()) as JobResponse;
  if (!res.ok) {
    console.error(chalk.red('  ✖ Job rejected:'), job.error ?? JSON.stringify(job));
    process.exit(1);
  }

  console.log(chalk.green(`  ✔ Job created: ${job.id}`));
  console.log(chalk.gray(`    Framework:  ${config.framework}`));
  console.log(chalk.gray(`    Base model: ${config.baseModel}`));
  console.log(chalk.bold('\n  Tailing logs...\n'));

  try {
    const logsRes = await fetch(`${base}/v1/quickslug/training/jobs/${job.id}/logs`, {
      signal: AbortSignal.timeout(600_000),
    });
    await tailLogsFromResponse(logsRes);
  } catch (err) {
    console.error(chalk.yellow(`\n  Could not connect to log stream: ${(err as Error).message}`));
  }

  try {
    const statusRes = await fetch(`${base}/v1/quickslug/training/jobs/${job.id}`, {
      signal: AbortSignal.timeout(10_000),
    });
    await printFinalStatusFromResponse(statusRes);
  } catch {
    // best-effort
  }
});

async function tailLogsFromResponse(res: Response): Promise<void> {
  if (!res.ok) {
    console.error(chalk.red(`  Log stream error ${res.status}`));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;

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
          // Stream ended — actual success/failure is reported by printFinalStatusFromResponse
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
  } catch (err) {
    console.error(chalk.yellow(`\n  Log stream ended: ${(err as Error).message}\n`));
  } finally {
    reader.releaseLock();
  }
}

async function printFinalStatusFromResponse(res: Response): Promise<void> {
  if (!res.ok) return;
  const job = (await res.json()) as JobResponse;
  const status = job.status ?? 'unknown';

  if (status === 'completed') {
    if (job.output_path) {
      console.log(chalk.green(`  Adapter saved to: ${job.output_path}\n`));
    }
  } else if (status === 'failed') {
    console.error(chalk.red(`  ✖ Job failed: ${job.error ?? 'unknown error'}\n`));
    process.exitCode = 1;
  } else {
    console.log(chalk.gray(`  Job status: ${status}\n`));
  }
}

export default cmd;
