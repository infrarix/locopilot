'use strict';

import { EventEmitter } from 'events';

export const TRAINING_DEFAULTS = Object.freeze({
  epochs: 3,
  batchSize: 2, // conservative for consumer VRAM (Free tier)
  gradientAccumulation: 4,
  learningRate: 2e-4,
  loraR: 8, // smaller rank = less memory (Free tier)
  loraAlpha: 16,
  maxSeqLength: 2048,
} as const);

export const VALID_FRAMEWORKS = Object.freeze(['unsloth', 'axolotl', 'mlx'] as const);
export type Framework = (typeof VALID_FRAMEWORKS)[number];

export interface TrainingConfig {
  framework: Framework;
  baseModel: string;
  datasetPath: string;
  outputDir: string;
  epochs: number;
  batchSize: number;
  gradientAccumulation: number;
  learningRate: number;
  loraR: number;
  loraAlpha: number;
  maxSeqLength: number;
}

export type PartialTrainingConfig = Required<
  Pick<TrainingConfig, 'framework' | 'baseModel' | 'datasetPath' | 'outputDir'>
> &
  Partial<Omit<TrainingConfig, 'framework' | 'baseModel' | 'datasetPath' | 'outputDir'>>;

export function applyDefaults(config: PartialTrainingConfig): TrainingConfig {
  return { ...TRAINING_DEFAULTS, ...config } as TrainingConfig;
}

export interface TrainingAdapter {
  run(config: PartialTrainingConfig, logEmitter: EventEmitter): Promise<{ outputPath: string }>;
}
