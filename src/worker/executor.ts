'use strict';

import { query, getLocalModels, pullModel } from '../shared';
import {
  validateDataset,
  applyDefaults,
  PartialTrainingConfig,
  unsloth as unslothAdapter,
  axolotl as axolotlAdapter,
  mlx as mlxAdapter,
} from '../training';
import { createLogEmitter, removeLogEmitter } from './logStore';

interface Adapter {
  run(config: PartialTrainingConfig, logEmitter: import('events').EventEmitter): Promise<{ outputPath: string }>;
}

const ADAPTERS: Record<string, Adapter> = {
  unsloth: unslothAdapter,
  axolotl: axolotlAdapter,
  mlx: mlxAdapter,
};

// On Apple Silicon, use MLX for all free-tier training regardless of the
// framework requested — it's Metal-optimized and outperforms Unsloth/Axolotl locally.
function resolveFramework(requested: string): string {
  if (process.platform === 'darwin' && process.arch === 'arm64' && requested !== 'mlx') {
    return 'mlx';
  }
  return requested;
}

export async function executeJob(jobId: string, rawConfig: PartialTrainingConfig): Promise<void> {
  const config = applyDefaults(rawConfig);
  const resolvedFramework = resolveFramework(config.framework);

  if (resolvedFramework !== config.framework) {
    console.log(`[executor] Apple Silicon detected — switching ${config.framework} → mlx`);
  }
  console.log(`[executor] Starting job ${jobId} — ${resolvedFramework}/${config.baseModel}`);

  try {
    validateDataset(config.datasetPath);
  } catch (err) {
    await setStatus(jobId, 'failed', { error: (err as Error).message });
    throw err;
  }

  try {
    await ensureModel(config.baseModel);
  } catch (err) {
    await setStatus(jobId, 'failed', { error: `Failed to pull base model: ${(err as Error).message}` });
    return;
  }

  await setStatus(jobId, 'running');

  const logEmitter = createLogEmitter(jobId);
  logEmitter.on('log', (line: string) => {
    console.log(`[job:${jobId}] ${line}`);
  });

  const adapter = ADAPTERS[resolvedFramework];
  if (!adapter) {
    removeLogEmitter(jobId);
    await setStatus(jobId, 'failed', { error: `Unknown framework: ${resolvedFramework}` });
    return;
  }

  const resolvedConfig: PartialTrainingConfig = {
    ...rawConfig,
    framework: resolvedFramework as PartialTrainingConfig['framework'],
  };

  try {
    const { outputPath } = await adapter.run(resolvedConfig, logEmitter);
    await setStatus(jobId, 'completed', { outputPath });
  } catch (err) {
    await setStatus(jobId, 'failed', { error: (err as Error).message });
  } finally {
    removeLogEmitter(jobId);
  }
}

async function setStatus(
  jobId: string,
  status: 'running' | 'completed' | 'failed',
  data: { outputPath?: string; error?: string } = {},
): Promise<void> {
  const now = new Date().toISOString();

  switch (status) {
    case 'running':
      await query('UPDATE training_jobs SET status = ?, started_at = ? WHERE id = ?', [status, now, jobId]);
      break;
    case 'completed':
      await query('UPDATE training_jobs SET status = ?, completed_at = ?, output_path = ? WHERE id = ?', [
        status,
        now,
        data.outputPath ?? null,
        jobId,
      ]);
      break;
    case 'failed':
      await query('UPDATE training_jobs SET status = ?, completed_at = ?, error = ? WHERE id = ?', [
        status,
        now,
        data.error ?? null,
        jobId,
      ]);
      break;
  }
}

async function ensureModel(modelName: string): Promise<void> {
  const models = await getLocalModels();
  const found = models.find((m) => m.name === modelName || m.name.startsWith(modelName));
  if (!found) {
    await pullModel(modelName);
  }
}
