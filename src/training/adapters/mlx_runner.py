#!/usr/bin/env python3
"""
MLX fine-tuning runner (Free Tier — Apple Silicon).
Uses mlx-lm for LoRA training on Apple Metal GPU.

Requirements:
    pip install mlx-lm
"""

import argparse
import json
import os
import shutil
import sys
import tempfile

parser = argparse.ArgumentParser(description='LocoPilot MLX training runner')
parser.add_argument('--config', required=True, help='Path to JSON config file')
args = parser.parse_args()

try:
    with open(args.config) as f:
        cfg = json.load(f)
except Exception as e:
    print(f'[mlx] ERROR: Could not read config: {e}', file=sys.stderr)
    sys.exit(1)

required = ['baseModel', 'datasetPath', 'outputDir', 'epochs', 'batchSize',
            'loraR', 'loraAlpha', 'maxSeqLength', 'learningRate']
for key in required:
    if key not in cfg:
        print(f'[mlx] ERROR: Missing config key: {key}', file=sys.stderr)
        sys.exit(1)

try:
    import mlx.core  # noqa: F401
    import mlx_lm    # noqa: F401
except ImportError as e:
    print(f'[mlx] ERROR: Missing dependency — {e}', file=sys.stderr)
    print('[mlx] Install with: pip install mlx-lm', file=sys.stderr)
    sys.exit(1)


def convert_to_mlx_format(dataset_path):
    """Convert alpaca/sharegpt JSONL to mlx-lm text format."""
    examples = []
    with open(dataset_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)

            if 'instruction' in row:
                instruction = row.get('instruction', '')
                inp = row.get('input', '')
                output = row.get('output', '')
                if inp:
                    text = (f'### Instruction:\n{instruction}\n\n'
                            f'### Input:\n{inp}\n\n'
                            f'### Response:\n{output}')
                else:
                    text = f'### Instruction:\n{instruction}\n\n### Response:\n{output}'
                examples.append({'text': text})

            elif 'conversations' in row:
                turns = row.get('conversations', [])
                text = ''
                for turn in turns:
                    role = 'Human' if turn.get('from') == 'human' else 'Assistant'
                    text += f'{role}: {turn.get("value", "")}\n'
                examples.append({'text': text.strip()})

    return examples


print(f'[mlx] Preparing dataset from: {cfg["datasetPath"]}')

# Initialize before try so the finally block can always reference it safely
data_dir = None

try:
    data_dir = tempfile.mkdtemp(prefix='qs-mlx-data-')

    examples = convert_to_mlx_format(cfg['datasetPath'])
    if not examples:
        print('[mlx] ERROR: Dataset produced no examples after conversion', file=sys.stderr)
        sys.exit(1)

    # Split 90/10 train/valid
    split = max(1, int(len(examples) * 0.9))
    train_examples = examples[:split]
    valid_examples = examples[split:] or examples[:1]

    with open(os.path.join(data_dir, 'train.jsonl'), 'w') as f:
        for ex in train_examples:
            f.write(json.dumps(ex) + '\n')
    with open(os.path.join(data_dir, 'valid.jsonl'), 'w') as f:
        for ex in valid_examples:
            f.write(json.dumps(ex) + '\n')

    print(f'[mlx] Dataset: {len(train_examples)} train, {len(valid_examples)} valid examples')

    os.makedirs(cfg['outputDir'], exist_ok=True)
    print(f'[mlx] Loading model: {cfg["baseModel"]}')
    print(f'[mlx] Starting LoRA training — {cfg["epochs"]} epoch(s), batch size {cfg["batchSize"]}')

    _used_python_api = False
    try:
        from mlx_lm import load
        from mlx_lm.tuner.trainer import TrainingArgs, train
        from mlx_lm.tuner.datasets import load_dataset as mlx_load_dataset

        model, tokenizer = load(cfg['baseModel'])

        training_args = TrainingArgs(
            batch_size=cfg['batchSize'],
            iters=cfg['epochs'] * max(len(train_examples) // cfg['batchSize'], 1),
            val_batches=5,
            steps_per_report=10,
            steps_per_eval=50,
            adapter_path=cfg['outputDir'],
            max_seq_length=cfg['maxSeqLength'],
            grad_checkpoint=False,
            learning_rate=cfg['learningRate'],
            lora_parameters={
                'rank': cfg['loraR'],
                'alpha': cfg['loraAlpha'],
                'dropout': 0.0,
                'scale': cfg['loraAlpha'] / cfg['loraR'],
            },
        )

        train_set, valid_set, _ = mlx_load_dataset(training_args, tokenizer, data_dir)
        train(model, tokenizer, train_set, valid_set, training_args)
        _used_python_api = True

    except (ImportError, AttributeError, TypeError):
        # Python API unavailable or API changed — fall back to stable mlx_lm.lora CLI
        pass

    if not _used_python_api:
        import subprocess
        print('[mlx] Using mlx-lm CLI (stable fallback)')
        iters = cfg['epochs'] * max(len(train_examples) // cfg['batchSize'], 1)
        cmd = [
            sys.executable, '-m', 'mlx_lm.lora',
            '--model', cfg['baseModel'],
            '--train',
            '--data', data_dir,
            '--batch-size', str(cfg['batchSize']),
            '--num-layers', str(cfg['loraR']),
            '--iters', str(iters),
            '--adapter-path', cfg['outputDir'],
            '--learning-rate', str(cfg['learningRate']),
            '--max-seq-length', str(cfg['maxSeqLength']),
        ]
        result = subprocess.run(cmd)
        if result.returncode != 0:
            print(f'[mlx] ERROR: Training failed with exit code {result.returncode}', file=sys.stderr)
            sys.exit(result.returncode)

    print(f'[mlx] Adapter saved to {cfg["outputDir"]}')

except SystemExit:
    raise
except Exception as e:
    print(f'[mlx] ERROR: Training failed: {e}', file=sys.stderr)
    sys.exit(1)
finally:
    if data_dir is not None:
        try:
            shutil.rmtree(data_dir)
        except Exception:
            pass
