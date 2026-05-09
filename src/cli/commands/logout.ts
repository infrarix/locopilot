'use strict';

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import { CONFIG_PATH } from '../utils/paths';

const cmd = new Command('logout').description('Remove stored credentials and disable Pro tier');

cmd.action(() => {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.log(chalk.gray('\n  Not logged in — nothing to remove.\n'));
    return;
  }

  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Record<string, unknown>;
  } catch {
    // Corrupted config — remove entirely
  }

  if (!config.token) {
    console.log(chalk.gray('\n  Not logged in — nothing to remove.\n'));
    return;
  }

  delete config.token;

  if (Object.keys(config).length === 0) {
    fs.unlinkSync(CONFIG_PATH);
  } else {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  }

  console.log(chalk.green('\n  ✔ Logged out. Pro tier disabled.\n'));
  console.log(chalk.gray('  Run `quickslug login` to re-enable Pro tier.\n'));
});

export default cmd;
