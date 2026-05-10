'use strict';

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { applyDefaults, PartialTrainingConfig } from '../types';

const RUNNER = path.resolve(__dirname, 'unsloth_runner.py');

export async function run(config: PartialTrainingConfig, logEmitter: EventEmitter): Promise<{ outputPath: string }> {
  const cfg = applyDefaults(config);
  const configPath = `/tmp/qs-unsloth-${Date.now()}.json`;
  fs.writeFileSync(configPath, JSON.stringify(cfg));

  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [RUNNER, '--config', configPath], {
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
        fs.unlinkSync(configPath);
      } catch {
        /* best effort cleanup */
      }
      if (code === 0) {
        resolve({ outputPath: cfg.outputDir });
      } else {
        reject(new Error(`Unsloth runner exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      try {
        fs.unlinkSync(configPath);
      } catch {
        /* best effort cleanup */
      }
      reject(err);
    });
  });
}
