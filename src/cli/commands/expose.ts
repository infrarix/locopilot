'use strict';

import { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import { HOME_DIR, CONFIG_PATH, loadEnv } from '../utils/paths';

interface LocalConfig {
  token?: string;
  tunnel?: { url?: string; updatedAt: string };
}

function saveTunnelUrl(url: string): void {
  try {
    if (!fs.existsSync(HOME_DIR)) fs.mkdirSync(HOME_DIR, { recursive: true });
    let config: LocalConfig = {};
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as LocalConfig;
    }
    config.tunnel = { url, updatedAt: new Date().toISOString() };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  } catch {
    // non-fatal
  }
}

function cloudflaredInstallHint(): string {
  switch (process.platform) {
    case 'darwin':
      return 'brew install cloudflare/cloudflare/cloudflared';
    case 'win32':
      return 'winget install --id Cloudflare.cloudflared  (or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/)';
    default:
      return 'curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb';
  }
}

// cloudflare quick tunnels emit the URL in stderr; named tunnels may use stdout
const TUNNEL_URL_RE = /https:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.trycloudflare\.com/;

const cmd = new Command('expose').description('Expose the local API over a public Cloudflare Tunnel');

cmd.action(() => {
  loadEnv();
  const port = process.env.API_PORT ?? '8080';
  const localUrl = `http://localhost:${port}`;

  console.log(chalk.bold(`\n  Exposing ${localUrl} via Cloudflare Tunnel...\n`));
  console.log(
    chalk.gray(
      '  Requires cloudflared — https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/\n',
    ),
  );

  // On Windows the binary is still invoked as 'cloudflared' (PATH resolves .exe automatically)
  const binary = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';

  const proc = spawn(binary, ['tunnel', '--no-autoupdate', '--url', localUrl], {
    stdio: ['ignore', 'pipe', 'pipe'],
    // shell: false — always use execFile semantics to avoid injection
    shell: false,
  });

  let urlPrinted = false;

  const onData = (data: Buffer): void => {
    const text = data.toString();
    // Print cloudflared output dimmed — useful for seeing connection progress
    process.stderr.write(chalk.gray(text));

    if (!urlPrinted) {
      const match = TUNNEL_URL_RE.exec(text);
      if (match) {
        urlPrinted = true;
        console.log(chalk.green.bold(`\n  ✔ Public URL: ${match[0]}\n`));
        saveTunnelUrl(match[0]);
      }
    }
  };

  proc.stdout?.on('data', onData);
  proc.stderr?.on('data', onData);

  proc.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') {
      console.error(chalk.red('\n  cloudflared not found.'));
      console.error(chalk.gray(`  Install: ${cloudflaredInstallHint()}\n`));
    } else {
      console.error(chalk.red(`\n  Tunnel error: ${err.message}\n`));
    }
    process.exit(1);
  });

  // Forward Ctrl+C to the tunnel process for clean shutdown
  process.on('SIGINT', () => {
    try {
      proc.kill('SIGINT');
    } catch {
      /* already exited */
    }
  });
  process.on('SIGTERM', () => {
    try {
      proc.kill('SIGTERM');
    } catch {
      /* already exited */
    }
  });

  proc.on('exit', (code) => process.exit(code ?? 0));
});

export default cmd;
