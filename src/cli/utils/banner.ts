'use strict';

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ─── Terminal detection ────────────────────────────────────────────────────

function isIterm2(): boolean {
  return !!process.env.ITERM_SESSION_ID || process.env.TERM_PROGRAM === 'iTerm.app' || !!process.env.ITERM_PROFILE;
}

function isKitty(): boolean {
  return process.env.TERM === 'xterm-kitty' || !!process.env.KITTY_WINDOW_ID;
}

function isWezterm(): boolean {
  return process.env.TERM_PROGRAM === 'WezTerm';
}

function isWarp(): boolean {
  return process.env.TERM_PROGRAM === 'WarpTerminal';
}

function supportsInlineImages(): 'iterm2' | 'kitty' | 'wezterm' | 'ascii' {
  // iTerm2 protocol is supported by iTerm2, WezTerm, Warp, Tabby, etc.
  if (isIterm2() || isWezterm() || isWarp()) return 'iterm2';
  if (isKitty()) return 'kitty';
  return 'ascii';
}

// ─── Logo path ────────────────────────────────────────────────────────────

// Looks for logo next to the compiled JS, then next to this source file
function findLogo(): string | null {
  const candidates = [
    path.join(__dirname, 'logo-banner.png'),
    path.join(__dirname, '..', 'logo-banner.png'),
    path.join(process.cwd(), 'logo-banner.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ─── iTerm2 / WezTerm inline image protocol ───────────────────────────────
// ESC ] 1337 ; File=... : <base64> BEL
function printIterm2Image(logoPath: string, widthCells = 80): void {
  const data = fs.readFileSync(logoPath);
  const b64 = data.toString('base64');
  const size = data.length;
  const args = `inline=1;width=${widthCells};height=12;preserveAspectRatio=1;size=${size}`;
  process.stdout.write(`\x1b]1337;File=${args}:${b64}\x07\n`);
}

// ─── Kitty graphics protocol ──────────────────────────────────────────────
// Chunked APC sequence: ESC _ G <params> ; <base64-chunk> ESC \
function printKittyImage(logoPath: string): void {
  const data = fs.readFileSync(logoPath);
  const b64 = data.toString('base64');
  const CHUNK = 4096;
  let first = true;

  for (let i = 0; i < b64.length; i += CHUNK) {
    const chunk = b64.slice(i, i + CHUNK);
    const more = i + CHUNK < b64.length ? 1 : 0;

    if (first) {
      // a=T  → transmit & display
      // f=100 → PNG format
      // c=80,r=12 → 80 cols × 12 rows
      process.stdout.write(`\x1b_Ga=T,f=100,c=80,r=12,m=${more};${chunk}\x1b\\`);
      first = false;
    } else {
      process.stdout.write(`\x1b_Gm=${more};${chunk}\x1b\\`);
    }
  }
  process.stdout.write('\n');
}

// ─── ASCII fallback ───────────────────────────────────────────────────────

function printAsciiSlug(): void {
  const B1 = chalk.bold.hex('#1E90FF'); // Blue speed lines
  const B2 = chalk.bold.hex('#00BFFF'); // Quick (Blue)
  const G1 = chalk.bold.hex('#A8E63D'); // Slug (Green)
  const G2 = chalk.hex('#4A8A15'); // Eye stalks (Dark Green)

  const lines = [
    `           ${B2('____')}         ${B2('_')}      ${B2('_')}     ${G1('____')}  ${G1('_')}             `,
    `    ${B1('===')}   ${B2('/ __ \\')} _   _ ${B2('(_)')} ${B2('___')}${B2('| | __')}${G1('/ ___|')}${G1('| |_')}   ${G1('_')}  ${G1('__ _')}    `,
    `   ${B1('====')}  ${B2('/ / / /')}${B2('| | | |')}${B2('| |')}${B2('/ __|')}${B2('| |/ /')}${G1('\\___ \\')}${G1('| | | | |')}${G1('/ _` |')}    `,
    `    ${B1('===')} ${B2('/ /_/ /')} ${B2('| |_| |')}${B2('| |')}${B2('(__|')}   ${B2('<')}  ${G1('___) |')} ${G1('| | |_| |')}${G1('(_| |')}  ${G2('o o')}`,
    `   ${B1('====')} ${B2('\\___\\_\\')}  ${B2('\\__,_|')}${B2('|_|')}${B2('\\___|')}${B2('_|\\_\\')}${G1('|____/')} ${G1('|_|')}${G1('\\__,_|')}${G1('\\__, |')}  ${G2('| |')}`,
    `                                                   ${G1('|___/')}   ${G2('|_|')}`,
  ];

  console.log('');
  lines.forEach((l) => console.log(l));
}

// ─── Tagline ──────────────────────────────────────────────────────────────

function printTagline(): void {
  const N = chalk.bold.hex('#A8E63D');
  const B = chalk.hex('#1E90FF');
  const dim = chalk.hex('#444444');
  const dg = chalk.hex('#2e5a10');

  console.log('');
  console.log('  ' + N('⚡ QuickSlug') + '  ' + dim('v1.0') + '  ' + B('Inference. Simplified.'));
  console.log('  ' + dg('Local-first') + dim(' · ') + dg('OpenAI Compatible') + dim(' · ') + dg('GPU Scalable'));
  console.log('');
}

// ─── Main export ──────────────────────────────────────────────────────────

export function printBanner(): void {
  const mode = supportsInlineImages();
  const logoPath = findLogo();

  console.log('');

  if (logoPath) {
    try {
      if (mode === 'iterm2') {
        printIterm2Image(logoPath, 80);
      } else if (mode === 'kitty') {
        printKittyImage(logoPath);
      } else {
        printAsciiSlug();
      }
    } catch {
      // If image rendering fails for any reason, fall back gracefully
      printAsciiSlug();
    }
  } else {
    printAsciiSlug();
  }

  printTagline();
}

export function printSuccess(msg: string): void {
  console.log(chalk.green('  ✔ ') + msg);
}

export function printWarn(msg: string): void {
  console.log(chalk.yellow('  ⚠ ') + msg);
}

export function printError(msg: string): void {
  console.log(chalk.red('  ✖ ') + msg);
}
