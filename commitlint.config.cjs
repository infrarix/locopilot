/* eslint-disable no-undef */
/**
 * Conventional commits with QuickSlug-specific scopes.
 * Example: `feat(cli): add `quickslug usage --json` flag`
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'cli', // src/cli/* — Commander commands
        'api', // src/api/* — Fastify routes & middleware
        'worker', // src/worker/* — in-process training worker
        'training', // src/training/* — adapters, validator, types
        'cloud', // src/cloud/client.ts — cloud client
        'shared', // src/shared/* — DB, runtime, constants
        'docs', // docs/ Docusaurus site
        'release', // changeset / version bumps
        'deps', // dependency upgrades
        'ci', // .github/workflows/*
        'repo', // top-level repo / config files
      ],
    ],
    'scope-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
  ignores: [
    (message) => message.includes('[skip-commitlint]'),
    (message) => /^chore\(release\): version packages/.test(message),
  ],
};
