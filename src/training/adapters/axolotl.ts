'use strict';

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { EventEmitter } from 'events';
import { applyDefaults, PartialTrainingConfig } from '../types';
import { isSharegptFormat } from '../validator';

const RUNNER = path.resolve(__dirname, 'axolotl_runner.py');

export async function run(config: PartialTrainingConfig, logEmitter: EventEmitter): Promise<{ outputPath: string }> {
  const cfg = applyDefaults(config);

  let datasetType: 'alpaca' | 'sharegpt' = 'alpaca';
  try {
    const firstLine = fs.readFileSync(cfg.datasetPath, 'utf8').split('\n')[0].trim();
    if (firstLine && isSharegptFormat(JSON.parse(firstLine))) {
      datasetType = 'sharegpt';
    }
  } catch {
    // dataset already validated upstream; default to alpaca
  }

  const axolotlCfg = {
    base_model: cfg.baseModel,
    datasets: [{ path: cfg.datasetPath, type: datasetType }],
    output_dir: cfg.outputDir,
    num_epochs: cfg.epochs,
    micro_batch_size: cfg.batchSize,
    gradient_accumulation_steps: cfg.gradientAccumulation,
    learning_rate: cfg.learningRate,
    lora_r: cfg.loraR,
    lora_alpha: cfg.loraAlpha,
    sequence_len: cfg.maxSeqLength,
    load_in_4bit: false, // minimal: no quantisation on Free tier
    adapter: 'lora',
  };

  const cfgPath = `/tmp/qs-axolotl-${Date.now()}.yml`;
  fs.writeFileSync(cfgPath, yaml.dump(axolotlCfg));

  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [RUNNER, '--config', cfgPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout?.on('data', (d: Buffer) => {
      for (const line of d.toString().split('\n')) {
        if (line.trim()) logEmitter.emit('log', line);
      }
    });
    proc.stderr?.on('data', (d: Buffer) => {
      for (const line of d.toString().split('\n')) {
        if (line.trim()) logEmitter.emit('log', line);
      }
    });

    proc.on('close', (code: number | null) => {
      try {
        fs.unlinkSync(cfgPath);
      } catch {
        /* best effort cleanup */
      }
      if (code === 0) {
        resolve({ outputPath: cfg.outputDir });
      } else {
        reject(new Error(`Axolotl runner exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      try {
        fs.unlinkSync(cfgPath);
      } catch {
        /* best effort cleanup */
      }
      reject(err);
    });
  });
}
