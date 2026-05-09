// Used by changesets/action — bumps versions then refreshes the lockfile.
// Project uses npm workspaces, not pnpm.
const { execSync } = require('child_process');

execSync('npx changeset version', { stdio: 'inherit' });
execSync('npm install --package-lock-only', { stdio: 'inherit' });
