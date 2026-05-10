'use strict';

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import { prompt } from 'enquirer';
import { CONFIG_PATH, ensureHomeDir } from '../utils/paths';
import { callCloudAuthVerify, callCloudAuthMe } from '../../cloud/client';

async function promptToken(): Promise<string> {
  const res = await prompt<{ token: string }>({
    type: 'password',
    name: 'token',
    message: 'Enter your LocoPilot API key (qs_...)',
  });
  return res.token.trim();
}

const cmd = new Command('login').description('Authenticate with LocoPilot Cloud (enables Pro tier)');
cmd.option('--key <token>', 'API key starting with qs_');

cmd.action(async (opts: { key?: string }) => {
  let token = opts.key;

  if (!token) {
    console.log(chalk.bold('\n  LocoPilot Login\n'));
    console.log(chalk.gray('  Get your API key at https://locopilot.com/dashboard\n'));
    try {
      token = await promptToken();
    } catch {
      // User cancelled prompt (Ctrl+C)
      console.log();
      process.exit(0);
    }
  }

  if (!token) {
    console.error(chalk.red('  No token provided.'));
    process.exit(1);
  }

  if (!token.startsWith('qs_')) {
    console.error(chalk.red('  Invalid token format — must start with qs_'));
    console.error(chalk.gray('  Tokens look like: qs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'));
    process.exit(1);
  }

  if (token.length < 20) {
    console.error(chalk.red('  Token too short — check for copy/paste errors.'));
    process.exit(1);
  }

  // Validate token against cloud backend
  console.log(chalk.gray('\n  Verifying token...'));
  try {
    const res = await callCloudAuthVerify(`Bearer ${token}`);
    if (res.status === 401) {
      console.error(chalk.red('  Invalid API key — authentication failed.'));
      console.error(chalk.gray('  Check your key at https://locopilot.com/dashboard'));
      process.exit(1);
    }
    if (!res.ok) {
      console.warn(chalk.yellow(`  Warning: cloud verification returned ${res.status} — saving token anyway.`));
    }
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('timeout')) {
      console.warn(chalk.yellow('  Warning: could not reach LocoPilot Cloud — saving token offline.'));
      console.warn(chalk.gray('  Token will be verified on first use.'));
    } else {
      console.warn(chalk.yellow(`  Warning: verification skipped (${msg}) — saving token.`));
    }
  }

  ensureHomeDir();

  // Preserve any existing non-token fields (e.g. tunnel URL)
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Record<string, unknown>;
    } catch {
      /* start fresh */
    }
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, token }, null, 2) + '\n', { mode: 0o600 });

  // Probe /api/auth/me so the user gets a clear "Pro" vs "Free vs past-due"
  // line. Subscription state is NEVER cached locally — the CLI re-fetches
  // on every cloud call. This printout is purely informational.
  let planLine = chalk.green('  ✔ Logged in successfully.');
  try {
    const meRes = await callCloudAuthMe(`Bearer ${token}`);
    if (meRes.ok) {
      const me = (await meRes.json()) as { plan?: string; current_period_end?: string | null };
      const plan = me.plan ?? 'free';
      if (plan === 'pro_active') {
        const renewsOn = me.current_period_end ? new Date(me.current_period_end).toLocaleDateString() : 'unknown';
        planLine = chalk.green(`  ✔ Logged in (Pro — active until ${renewsOn})`);
      } else if (plan === 'pro_past_due') {
        planLine = chalk.yellow('  ✔ Logged in (Pro — past due, update billing at https://locopilot.com/dashboard)');
      } else if (plan === 'pro_canceled' || plan === 'pro_inactive') {
        planLine = chalk.yellow(
          `  ✔ Logged in (subscription ${plan.replace('pro_', '')} — re-subscribe at https://locopilot.com/pricing)`,
        );
      } else {
        planLine = chalk.green('  ✔ Logged in (Free — upgrade at https://locopilot.com/pricing for cloud features)');
      }
    }
  } catch {
    // /api/auth/me unreachable; fall through to generic success
  }

  console.log('\n' + planLine + '\n');
  console.log(chalk.gray('  Token stored at: ') + chalk.white(CONFIG_PATH));
  console.log(chalk.gray('  Run `locopilot logout` to remove it.\n'));
});

export default cmd;
