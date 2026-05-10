// Auto-generates a changeset from the most recent commit message.
//
// Mapping (Conventional Commits → semver bump):
//   BREAKING CHANGE: ...        → major
//   feat(<scope>): ...          → minor
//   fix(<scope>): ...           → patch
//
// Only the scopes listed in `bumpingScopes` produce a changeset — everything
// else (docs, ci, deps, release, repo, …) is intentionally a no-op so we
// don't ship a release for a workflow tweak or a typo fix in a markdown file.
//
// All bumps target the single published package: `@infrarix/locopilot`.
import { execSync } from 'child_process';
import fs from 'fs';

const PACKAGE_NAME = '@infrarix/locopilot';

// Scopes that affect shipped CLI / API behaviour and therefore warrant a release.
const bumpingScopes = new Set(['cli', 'api', 'worker', 'training', 'cloud', 'shared']);

let commitMessage;
try {
  commitMessage = execSync('git log -1 --format=%s', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {
  console.log('ℹ Skipping changeset autogeneration — no git history available (likely running outside a repo).');
  process.exit(0);
}

const patterns = {
  major: /^BREAKING CHANGE: (.+)/,
  minor: /^feat\(([^)]+)\)(?:!)?: (.+)/,
  patch: /^fix\(([^)]+)\)(?:!)?: (.+)/,
};

let changeType = null;
let scope = null;
let description = null;

if (patterns.major.test(commitMessage)) {
  changeType = 'major';
  description = commitMessage.match(patterns.major)?.[1];
} else if (patterns.minor.test(commitMessage)) {
  scope = commitMessage.match(patterns.minor)?.[1];
  description = commitMessage.match(patterns.minor)?.[2];
  if (bumpingScopes.has(scope)) changeType = 'minor';
} else if (patterns.patch.test(commitMessage)) {
  scope = commitMessage.match(patterns.patch)?.[1];
  description = commitMessage.match(patterns.patch)?.[2];
  if (bumpingScopes.has(scope)) changeType = 'patch';
}

if (!changeType) {
  console.log(`ℹ No changeset generated. Commit "${commitMessage}" did not match a release-worthy scope.`);
  console.log(`  Release scopes: ${[...bumpingScopes].join(', ')}`);
  process.exit(0);
}

const filename = `.changeset/auto-${Date.now()}.md`;
const body = description?.trim() || 'No description provided.';

fs.writeFileSync(filename, `---\n'${PACKAGE_NAME}': ${changeType}\n---\n\n${body}\n`);
console.log(`✔ Wrote ${filename} (${changeType} bump for ${PACKAGE_NAME}).`);
