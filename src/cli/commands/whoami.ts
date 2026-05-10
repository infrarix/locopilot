'use strict';

import { Command } from 'commander';
import chalk from 'chalk';
import { getCloudToken, callCloudAuthMe } from '../../cloud/client';

interface MeResponse {
  email: string;
  plan: string;
  current_period_end: string | null;
}

const cmd = new Command('whoami').description('Show the currently logged-in user and plan');

cmd.action(async () => {
  const token = getCloudToken();
  if (!token) {
    console.log(chalk.gray('\n  Not logged in.'));
    console.log(chalk.gray('  Run: ') + chalk.white('locopilot login') + '\n');
    process.exit(0);
  }

  try {
    const res = await callCloudAuthMe(`Bearer ${token}`);
    if (res.status === 401) {
      console.error(chalk.red('\n  ✖ Token rejected by cloud.'));
      console.error(chalk.gray('  Run: ') + chalk.white('locopilot login') + ' with a fresh token.\n');
      process.exit(1);
    }
    if (!res.ok) {
      console.error(chalk.red(`\n  ✖ Could not reach /api/auth/me (status ${res.status}).\n`));
      process.exit(1);
    }
    const me = (await res.json()) as MeResponse;
    const plan = me.plan ?? 'free';
    const renews = me.current_period_end ? new Date(me.current_period_end).toLocaleDateString() : '—';

    console.log();
    console.log('  ' + chalk.gray('Email:   ') + chalk.white(me.email));
    console.log('  ' + chalk.gray('Plan:    ') + planFmt(plan));
    console.log('  ' + chalk.gray('Renews:  ') + chalk.white(renews));
    console.log();
  } catch (err) {
    console.error(chalk.red(`\n  ✖ Network error: ${(err as Error).message}\n`));
    process.exit(1);
  }
});

function planFmt(plan: string): string {
  if (plan === 'pro_active') return chalk.green('Pro (active)');
  if (plan === 'pro_past_due') return chalk.yellow('Pro (past due)');
  if (plan === 'pro_canceled') return chalk.gray('Pro (canceled)');
  if (plan === 'pro_inactive') return chalk.gray('Pro (inactive)');
  return chalk.gray('Free');
}

export default cmd;
