#!/usr/bin/env python3
"""
Minimal Unsloth fine-tuning runner (Free Tier).
No quantisation, no flash attention — designed for consumer hardware.

Requirements:
    pip install unsloth trl transformers datasets peft
"""

import json
import argparse
import os
import sys

parser = argparse.ArgumentParser(description='LocoPilot Unsloth training runner')
parser.add_argument('--config', required=True, help='Path to JSON config file')
args = parser.parse_args()

try:
    with open(args.config) as f:
        cfg = json.load(f)
except Exception as e:
    print(f'[unsloth] ERROR: Could not read config: {e}', file=sys.stderr)
    sys.exit(1)

required = ['baseModel', 'datasetPath', 'outputDir', 'epochs', 'batchSize',
            'loraR', 'loraAlpha', 'maxSeqLength', 'learningRate', 'gradientAccumulation']
for key in required:
    if key not in cfg:
        print(f'[unsloth] ERROR: Missing config key: {key}', file=sys.stderr)
        sys.exit(1)

try:
    from unsloth import FastLanguageModel
    from trl import SFTTrainer
    from transformers import TrainingArguments
    from datasets import load_dataset
except ImportError as e:
    print(f'[unsloth] ERROR: Missing dependency — {e}', file=sys.stderr)
    print('[unsloth] Install with: pip install unsloth trl transformers datasets', file=sys.stderr)
    sys.exit(1)

print(f'[unsloth] Loading model: {cfg["baseModel"]}')
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=cfg['baseModel'],
    max_seq_length=cfg['maxSeqLength'],
    load_in_4bit=False,     # Free tier: no quantisation
    dtype=None,
)

print(f'[unsloth] Applying LoRA (r={cfg["loraR"]}, alpha={cfg["loraAlpha"]})')
model = FastLanguageModel.get_peft_model(
    model,
    r=cfg['loraR'],
    lora_alpha=cfg['loraAlpha'],
    lora_dropout=0,
    bias='none',
    use_gradient_checkpointing=False,  # Free tier: disabled
    target_modules=['q_proj', 'k_proj', 'v_proj', 'o_proj'],
)

print(f'[unsloth] Loading dataset: {cfg["datasetPath"]}')
dataset = load_dataset('json', data_files=cfg['datasetPath'], split='train')

def format_alpaca(example):
    instruction = example.get('instruction', '')
    inp = example.get('input', '')
    output = example.get('output', '')
    if inp:
        text = f'### Instruction:\n{instruction}\n\n### Input:\n{inp}\n\n### Response:\n{output}'
    else:
        text = f'### Instruction:\n{instruction}\n\n### Response:\n{output}'
    return {'text': text}

def format_sharegpt(example):
    turns = example.get('conversations', [])
    text = ''
    for turn in turns:
        role = 'Human' if turn.get('from') == 'human' else 'Assistant'
        text += f'{role}: {turn.get("value", "")}\n'
    return {'text': text.strip()}

first = dataset[0]
if 'instruction' in first:
    dataset = dataset.map(format_alpaca, remove_columns=dataset.column_names)
elif 'conversations' in first:
    dataset = dataset.map(format_sharegpt, remove_columns=dataset.column_names)

os.makedirs(cfg['outputDir'], exist_ok=True)

print(f'[unsloth] Starting training — {cfg["epochs"]} epoch(s), batch size {cfg["batchSize"]}')
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field='text',
    max_seq_length=cfg['maxSeqLength'],
    args=TrainingArguments(
        output_dir=cfg['outputDir'],
        num_train_epochs=cfg['epochs'],
        per_device_train_batch_size=cfg['batchSize'],
        gradient_accumulation_steps=cfg['gradientAccumulation'],
        learning_rate=cfg['learningRate'],
        logging_steps=1,
        save_strategy='epoch',
        fp16=False,
        bf16=False,
        report_to='none',
    ),
)
trainer.train()

print(f'[unsloth] Saving adapter to {cfg["outputDir"]}')
model.save_pretrained(cfg['outputDir'])
tokenizer.save_pretrained(cfg['outputDir'])
print(f'[unsloth] Adapter saved to {cfg["outputDir"]}')
