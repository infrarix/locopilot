'use strict';

import { Command } from 'commander';
import { execFileSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { loadEnv } from '../utils/paths';

// Allowlist: only alphanumeric + safe separators (no shell metacharacters)
const MODEL_NAME_REGEX = /^[a-zA-Z0-9:._-]+$/;

const cmd = new Command('models').description('Manage models');

cmd
  .command('pull <model>')
  .description('Pull a model into Ollama')
  .action((model: string) => {
    if (!MODEL_NAME_REGEX.test(model)) {
      console.error(
        chalk.red('  Invalid model name. Use only letters, numbers, colons, hyphens, dots, and underscores.'),
      );
      process.exit(1);
    }

    console.log(chalk.bold(`\n  Pulling ${model}...\n`));

    try {
      // execFileSync with stdio: 'inherit' shows ollama's own progress bar
      execFileSync('ollama', ['pull', model], { stdio: 'inherit' });
      console.log(chalk.green(`\n  ✔ Model ${model} ready.\n`));
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ENOENT') {
        console.error(chalk.red('\n  ollama not found.'));
        const hint =
          process.platform === 'darwin'
            ? 'brew install --cask ollama'
            : process.platform === 'win32'
              ? 'winget install Ollama.Ollama'
              : 'curl -fsSL https://ollama.com/install.sh | sh';
        console.error(chalk.gray(`  Install: ${hint}\n`));
      } else {
        console.error(chalk.red(`\n  ✖ Failed to pull ${model}: ${e.message}\n`));
      }
      process.exit(1);
    }
  });

cmd
  .command('list')
  .description('List available models')
  .action(async () => {
    loadEnv();
    const base = `http://localhost:${process.env.API_PORT ?? '8080'}`;

    const spinner = ora('  Fetching models...').start();

    let data: Array<{ id: string; owned_by: string }> | undefined;
    try {
      const res = await fetch(`${base}/v1/models`, {
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) {
        spinner.fail(chalk.red(`API returned ${res.status}`));
        console.error(chalk.gray('  Is LocoPilot running? Try: locopilot start'));
        process.exit(1);
      }

      const body = (await res.json()) as { data?: Array<{ id: string; owned_by: string }> };
      data = body.data;
      spinner.stop();
    } catch (err) {
      spinner.fail(chalk.red(`Could not connect to API: ${(err as Error).message}`));
      console.error(chalk.gray('  Is LocoPilot running? Try: locopilot start'));
      process.exit(1);
    }

    console.log(chalk.bold('\n  Models:\n'));
    if (!data || data.length === 0) {
      console.log(chalk.gray('  No models found. Run: locopilot models pull <model>\n'));
      return;
    }

    for (const m of data) {
      const tag = m.owned_by === 'local' ? chalk.green('[local] ') : chalk.blue('[remote]');
      console.log(`  ${tag} ${m.id}`);
    }
    console.log();
  });

cmd
  .command('rm <model>')
  .description('Remove a local model from Ollama')
  .action((model: string) => {
    if (!MODEL_NAME_REGEX.test(model)) {
      console.error(chalk.red('  Invalid model name.'));
      process.exit(1);
    }

    try {
      execFileSync('ollama', ['rm', model], { stdio: 'inherit' });
      console.log(chalk.green(`\n  ✔ Model ${model} removed.\n`));
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ENOENT') {
        console.error(chalk.red('\n  ollama not found.\n'));
      } else {
        console.error(chalk.red(`\n  ✖ Failed to remove ${model}: ${e.message}\n`));
      }
      process.exit(1);
    }
  });

export default cmd;
