'use strict';

import { Command } from 'commander';
import chalk from 'chalk';
import { getCloudToken, callCloudUsage } from '../../cloud/client';

interface UsageResponse {
  status: string;
  period_start: string;
  period_end: string;
  tokens: number;
  estimated_cost: number;
  requests: number;
}

const cmd = new Command('usage').description('Show token usage and estimated cost for the current period');

cmd.action(async () => {
  const token = getCloudToken();
  if (!token) {
    console.log(chalk.gray('\n  Not logged in.'));
    console.log(chalk.gray('  Run: ') + chalk.white('locopilot login') + '\n');
    process.exit(0);
  }

  try {
    const res = await callCloudUsage(`Bearer ${token}`);
    if (res.status === 401) {
      console.error(chalk.red('\n  ✖ Token rejected by cloud.\n'));
      process.exit(1);
    }
    if (!res.ok) {
      console.error(chalk.red(`\n  ✖ /api/usage returned ${res.status}.\n`));
      process.exit(1);
    }
    const u = (await res.json()) as UsageResponse;
    const start = new Date(u.period_start).toLocaleDateString();
    const end = new Date(u.period_end).toLocaleDateString();

    console.log();
    console.log('  ' + chalk.gray('Period:    ') + chalk.white(`${start} → ${end}`));
    console.log('  ' + chalk.gray('Tokens:    ') + chalk.white(u.tokens.toLocaleString()));
    console.log('  ' + chalk.gray('Requests:  ') + chalk.white(u.requests.toLocaleString()));
    console.log('  ' + chalk.gray('Cost:      ') + chalk.white(`$${u.estimated_cost.toFixed(4)} (estimated)`));
    console.log();
  } catch (err) {
    console.error(chalk.red(`\n  ✖ Network error: ${(err as Error).message}\n`));
    process.exit(1);
  }
});

export default cmd;
