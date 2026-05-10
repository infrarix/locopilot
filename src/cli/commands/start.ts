'use strict';

import { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import * as paths from '../utils/paths';
import { printBanner } from '../utils/banner';

const IS_WINDOWS = process.platform === 'win32';

const cmd = new Command('start').description('Start the LocoPilot local API server');

cmd.option('-p, --port <port>', 'Port to listen on (default: 8080)');

cmd.action(async (opts: { port?: string }) => {
  printBanner();
  paths.ensureHomeDir();
  paths.loadEnv();

  const port = opts.port ?? process.env.API_PORT ?? '8080';

  // ── Pre-flight: check that init has been run ───────────────────────────
  if (!fs.existsSync(paths.SQLITE_PATH)) {
    console.error(chalk.red('  ✖ Database not found.'));
    console.error(chalk.gray('    Run: locopilot init'));
    process.exit(1);
  }

  console.log(chalk.bold(`  Starting LocoPilot on port ${port}...\n`));

  // ── Resolve the API entry point ────────────────────────────────────────
  // __dirname in dist/ = dist/cli/commands/ → 3 up = project root
  // __dirname in src/  = src/cli/commands/  → 3 up = project root
  const projectRoot = path.resolve(__dirname, '../../..');
  const apiDistPath = path.join(projectRoot, 'dist', 'api', 'index.js');
  const apiSrcPath = path.join(projectRoot, 'src', 'api', 'index.ts');

  let runCmd: string;
  let runArgs: string[];

  if (fs.existsSync(apiDistPath)) {
    runCmd = process.execPath; // node
    runArgs = [apiDistPath];
  } else if (fs.existsSync(apiSrcPath)) {
    // Development: fall back to ts-node
    const tsNode = IS_WINDOWS ? 'ts-node.cmd' : 'ts-node';
    runCmd = IS_WINDOWS ? 'npx.cmd' : 'npx';
    runArgs = [tsNode, '--project', path.join(projectRoot, 'tsconfig.json'), apiSrcPath];
  } else {
    console.error(chalk.red('  ✖ Could not locate API entry point.'));
    console.error(chalk.gray(`    Expected: ${apiDistPath}`));
    console.error(chalk.gray('    Run: npm run build'));
    process.exit(1);
  }

  console.log(chalk.gray(`  Entry: ${runCmd === process.execPath ? apiDistPath : apiSrcPath}`));

  const child = spawn(runCmd, runArgs, {
    stdio: 'inherit',
    // On Windows, shell:false requires exact binary name; process.execPath is always correct for node.
    shell: false,
    env: {
      ...process.env,
      API_PORT: port,
      SQLITE_PATH: paths.SQLITE_PATH,
      OLLAMA_HOST: process.env.OLLAMA_HOST ?? 'http://localhost:11434',
    },
  });

  // Forward signals to the child so Ctrl+C propagates cleanly
  const forward = (sig: NodeJS.Signals): void => {
    try {
      child.kill(sig);
    } catch {
      /* already exited */
    }
  };
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  child.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') {
      console.error(chalk.red(`\n  ✖ Command not found: ${runCmd}`));
      if (!fs.existsSync(apiDistPath)) {
        console.error(chalk.gray('    Build first: npm run build'));
      }
    } else {
      console.error(chalk.red(`\n  ✖ Failed to start: ${err.message}`));
    }
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      // Graceful signal-based exit — not an error
      process.exit(0);
    }
    if (code !== 0 && code !== null) {
      console.error(chalk.red(`\n  ✖ API exited with code ${code}`));
      process.exit(code);
    }
  });
});

export default cmd;
