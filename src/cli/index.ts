#!/usr/bin/env node
'use strict';

// Recover from a deleted/inaccessible cwd before any module that touches
// process.cwd() loads. The shell may be sitting in a directory that has
// since been removed; chdir to $HOME so dotenv, fs, etc. don't crash.
try {
  process.cwd();
} catch {
  process.chdir(require('os').homedir());
}

import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import initCmd from './commands/init';
import startCmd from './commands/start';
import doctorCmd from './commands/doctor';
import modelsCmd from './commands/models';
import exposeCmd from './commands/expose';
import trainCmd from './commands/train';
import logsCmd from './commands/logs';
import loginCmd from './commands/login';
import logoutCmd from './commands/logout';
import whoamiCmd from './commands/whoami';
import usageCmd from './commands/usage';

// __dirname from dist/cli/ → 2 levels up = project root
const pkg = require(path.resolve(__dirname, '../../package.json')) as { version: string };

const program = new Command();
program.name('locopilot').description('LocoPilot CLI').version(pkg.version);

program.addCommand(initCmd);
program.addCommand(startCmd);
program.addCommand(doctorCmd);
program.addCommand(modelsCmd);
program.addCommand(exposeCmd);
program.addCommand(trainCmd);
program.addCommand(logsCmd);
program.addCommand(loginCmd);
program.addCommand(logoutCmd);
program.addCommand(whoamiCmd);
program.addCommand(usageCmd);

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(chalk.red(`\n  ✖ Error: ${err.message}\n`));
  process.exit(1);
});
