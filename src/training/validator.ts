'use strict';

import fs from 'fs';

const MIN_DATASET_EXAMPLES = 10;
const DATASET_VALIDATION_LINES = 5;

export interface AlpacaRow {
  instruction: string;
  output: string;
  input?: string;
}

export interface SharegptRow {
  conversations: Array<{ from: string; value: string }>;
}

export function isAlpacaFormat(row: unknown): row is AlpacaRow {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.instruction === 'string' && r.instruction.length > 0 && typeof r.output === 'string' && r.output.length > 0
  );
}

export function isSharegptFormat(row: unknown): row is SharegptRow {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  if (!Array.isArray(r.conversations) || r.conversations.length === 0) return false;
  const first = r.conversations[0] as Record<string, unknown>;
  return typeof first.from === 'string' && typeof first.value === 'string' && first.value.length > 0;
}

export function validateDataset(datasetPath: string): true {
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Dataset not found: ${datasetPath}`);
  }

  const content = fs.readFileSync(datasetPath, 'utf8').trim();
  if (!content) throw new Error('Dataset file is empty');

  const lines = content.split('\n');
  if (lines.length < MIN_DATASET_EXAMPLES) {
    throw new Error(`Dataset too small — found ${lines.length} examples, minimum ${MIN_DATASET_EXAMPLES} required`);
  }

  const linesToCheck = Math.min(lines.length, DATASET_VALIDATION_LINES);
  let detectedFormat: 'alpaca' | 'sharegpt' | null = null;

  for (let i = 0; i < linesToCheck; i++) {
    const lineNum = i + 1;
    const trimmed = lines[i].trim();

    if (!trimmed) throw new Error(`Line ${lineNum}: empty line in dataset`);

    let row: unknown;
    try {
      row = JSON.parse(trimmed);
    } catch {
      throw new Error(`Line ${lineNum}: invalid JSON — ${trimmed.slice(0, 50)}...`);
    }

    const alpaca = isAlpacaFormat(row);
    const sharegpt = isSharegptFormat(row);

    if (!alpaca && !sharegpt) {
      throw new Error(
        `Line ${lineNum}: unrecognised format. Expected alpaca (instruction/output) or sharegpt (conversations[])`,
      );
    }

    const format: 'alpaca' | 'sharegpt' = alpaca ? 'alpaca' : 'sharegpt';
    if (detectedFormat === null) {
      detectedFormat = format;
    } else if (format !== detectedFormat) {
      throw new Error(
        `Line ${lineNum}: mixed formats — line 1 is ${detectedFormat} but line ${lineNum} is ${format}. Use a single format throughout.`,
      );
    }
  }

  return true;
}
