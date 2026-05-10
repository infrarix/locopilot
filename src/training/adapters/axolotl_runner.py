#!/usr/bin/env python3
"""
Minimal Axolotl fine-tuning runner (Free Tier).
No DeepSpeed, no multi-GPU — designed for single-GPU / CPU.

Requirements:
    pip install axolotl
"""

import argparse
import sys
import os

parser = argparse.ArgumentParser(description='LocoPilot Axolotl training runner')
parser.add_argument('--config', required=True, help='Path to YAML config file')
args = parser.parse_args()

if not os.path.exists(args.config):
    print(f'[axolotl] ERROR: Config file not found: {args.config}', file=sys.stderr)
    sys.exit(1)

try:
    from axolotl.cli import train
except ImportError as e:
    print(f'[axolotl] ERROR: Missing dependency — {e}', file=sys.stderr)
    print('[axolotl] Install with: pip install axolotl', file=sys.stderr)
    sys.exit(1)

print(f'[axolotl] Starting training with config: {args.config}')
try:
    # axolotl.cli.train accepts a config path and kicks off training
    train([args.config])
    print('[axolotl] Training complete')
except SystemExit as e:
    # axolotl may call sys.exit(0) on success
    if e.code not in (0, None):
        print(f'[axolotl] ERROR: Training failed with exit code {e.code}', file=sys.stderr)
        sys.exit(e.code)
