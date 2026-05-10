# Contributing to LocoPilot

Thanks for your interest in contributing to **LocoPilot** — the local-first, OpenAI-compatible AI platform. Bug reports, feature requests, docs fixes, and code changes are all welcome.

This repository (`locopilot-public-cli`) is the MIT-licensed open-source CLI + local API. The hosted Pro control plane (`locopilot-core-backend`) is a separate, closed-source service and is out of scope for this repo.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Branching Strategy](#branching-strategy)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Code Style & Formatting](#code-style--formatting)
- [Testing](#testing)
- [Release Process](#release-process)
- [Security Vulnerabilities](#security-vulnerabilities)
- [License](#license)

## Code of Conduct

This project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it. Report unacceptable behavior to **security@locopilot.dev**.

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/locopilot-public-cli.git
   cd locopilot-public-cli
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Build**:
   ```bash
   npm run build
   ```
5. **Run the local API**:
   ```bash
   npm run dev
   ```

## Development Setup

### Prerequisites

| Tool    | Version  |
| ------- | -------- |
| Node.js | ≥ 20.0.0 |
| npm     | ≥ 10.x   |
| Ollama  | latest (for local inference) |

Optional (for fine-tuning): Python 3.10+ with the runner deps under `src/training/adapters/`.

### Project Layout

This is a **monolithic** TypeScript project — single `package.json`, single `tsconfig.json`, all source under `src/`.

```
src/
  api/        → Fastify 5 gateway (OpenAI-compatible endpoints)
  cli/        → Commander.js CLI (init, start, models, train, expose, login)
  worker/     → in-process training worker (Free tier)
  training/   → TrainingAdapter interface + MLX/Unsloth/Axolotl adapters,
                dataset validator, Python runners
  cloud/      → cloud HTTP client (Pro tier)
  shared/     → utilities, types, DB pool, Ollama runtime client
db/migrations/  → SQL migrations (Pro uses Postgres in the cloud backend;
                  Free uses a file-based SQLite at ~/.locopilot/db.sqlite)
infra/          → docker-compose for local dev
```

### Useful Commands

| Command              | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `npm run build`      | Compile TypeScript and copy Python runners to `dist/` |
| `npm run dev`        | Run the local API via `ts-node` (`src/api/index.ts`)  |
| `npm run start`      | Run the built API (`node dist/api/index.js`)          |
| `npm run lint`       | ESLint across `src/`                                  |
| `npm run typecheck`  | `tsc --noEmit`                                        |
| `npm run format`     | Prettier — write                                      |
| `npm run format:check` | Prettier — check only                               |
| `npm run changeset`  | Create a changeset for your change                    |

From the monorepo root, `npm run doctor`, `npm run init`, and `npm run start` orchestrate the local stack across workspaces.

## How to Contribute

### Reporting Bugs

Open a GitHub issue with:

- A clear description of the bug
- Steps to reproduce (CLI commands, request payloads)
- Expected vs actual behavior
- Environment: OS, Node.js version, Ollama version, tier (Free/Pro)
- Relevant logs (redact API keys before pasting)

### Requesting Features

Open a GitHub issue describing:

- The problem the feature would solve
- Your proposed solution
- Alternatives you considered
- Whether it applies to Free, Pro, or both

### Submitting Code

1. Create a branch from `main` following our [branching strategy](#branching-strategy).
2. Make your changes with tests where applicable.
3. Ensure lint, typecheck, and the build pass:
   ```bash
   npm run lint && npm run typecheck && npm run build
   ```
4. Ensure code is formatted: `npm run format:check`
5. Create a changeset: `npm run changeset`
6. Push and open a Pull Request.

## Branching Strategy

### Branch Types

| Prefix       | Purpose                                  |
| ------------ | ---------------------------------------- |
| `main`       | Production-ready code; protected         |
| `feature/*`  | New features                             |
| `fix/*`      | Bug fixes                                |
| `hotfix/*`   | Critical production fixes                |
| `docs/*`     | Documentation changes                    |
| `refactor/*` | Code refactoring without behavior change |
| `chore/*`    | Maintenance, dependency updates          |

### Naming Convention

```
<type>/<issue-id>-<short-description>
```

**Examples:**

- `feature/42-mlx-lora-rank-flag`
- `fix/105-ollama-prefix-match-404`
- `docs/88-update-quickstart`

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) enforced by **commitlint** + **husky**.

### Format

```
type(scope): subject
```

### Types

| Type       | Description                  | Version Bump |
| ---------- | ---------------------------- | ------------ |
| `feat`     | New feature                  | Minor        |
| `fix`      | Bug fix                      | Patch        |
| `perf`     | Performance improvement      | Patch        |
| `docs`     | Documentation only           | None         |
| `style`    | Formatting, no code change   | None         |
| `refactor` | Code change, no new feature  | None         |
| `test`     | Adding or updating tests     | None         |
| `chore`    | Build, tooling, deps         | None         |
| `ci`       | CI/CD configuration          | None         |

### Scopes

Scopes match an area of the source tree:

| Scope       | Description                                        |
| ----------- | -------------------------------------------------- |
| `api`       | Fastify gateway in `src/api/`                      |
| `cli`       | Commander CLI in `src/cli/`                        |
| `worker`    | In-process training worker in `src/worker/`        |
| `training`  | Adapters, validator, runners in `src/training/`    |
| `cloud`     | Cloud HTTP client in `src/cloud/`                  |
| `shared`    | Shared utilities/types in `src/shared/`            |
| `db`        | SQLite schema / migrations                         |
| `infra`     | docker-compose, scripts                            |
| `docs`      | Documentation                                      |
| `release`   | Release-related changes                            |
| `deps`      | Dependency updates                                 |
| `ci`        | CI/CD workflows                                    |
| `repo`      | Repository-level config & tooling                  |

### Examples

```bash
feat(cli): add `locopilot models prune` to remove unused Ollama models
fix(api): handle Ollama prefix match before falling through to 404
docs(training): document MLX adapter selection on Apple Silicon
chore(deps): bump fastify to 5.8.5
test(training): add edge cases for the dataset validator
ci(repo): add CodeQL security scanning workflow
```

### Breaking Changes

Append `!` after the scope and include `BREAKING CHANGE:` in the body:

```
feat(api)!: change default API_PORT from 8080 to 8088

BREAKING CHANGE: existing clients hard-coded to 8080 must update or
set API_PORT=8080 explicitly.
```

Breaking changes trigger a **major** version bump.

## Pull Request Process

1. Fill out the PR template.
2. Link the related issue(s).
3. Ensure CI passes (build, lint, typecheck, format check, commitlint).
4. Request review from at least one maintainer.
5. Address review feedback promptly.
6. Squash-merge into `main` after approval.

### PR Checklist

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm run format:check` is clean
- [ ] Changeset created (`npm run changeset`) when user-visible behavior changes
- [ ] Documentation updated if needed
- [ ] No new secrets, credentials, or `console.log` of prompt content checked in

## Code Style & Formatting

- **Prettier** formats all code automatically.
- **lint-staged** + **husky** run Prettier on every commit.
- TypeScript **strict** mode is enabled.

### Key Conventions

- Use `const` by default; `let` only when mutation is required.
- Prefer `readonly` on interfaces and type members where it makes sense.
- Centralize cloud HTTP calls in `src/cloud/client.ts` — do not bypass it from CLI or API code.
- The public client must **never** read `DATABASE_URL` or `REDIS_URL` — those live only on the cloud backend. Tier is detected purely by the presence of a `qs_` token in `~/.locopilot/config.json`.
- Do not log raw prompts or completions unless `LOCOPILOT_LOG_PROMPTS=true` is explicitly set.
- Adapter selection in `src/training/` is OS-aware: Apple Silicon (`darwin` + `arm64`) → MLX; Linux/Windows → Unsloth or Axolotl. Preserve this branching when adding adapters.

## Testing

E2E scenarios that must pass before release (see CLAUDE.md for the full list):

**Free tier**

1. `init` → `start` → `POST /v1/chat/completions` streams via SSE without auth.
2. `locopilot train --config` → job created → `running` → `completed` with `output_path` set.
3. Bad dataset format is rejected before execution with a descriptive error.
4. Local model not found and not logged in → 404 with an upgrade hint.

**Pro tier**

5. Local model absent → cloud `/api/inference` → RunPod → stream.
6. RunPod timeout → retry local → 503 if both fail.
7. `locopilot train --cloud` → cloud `/api/train` → BullMQ → worker → `completed`.
8. Training interrupted → resumes from last checkpoint (not epoch 0).
9. 61st request within a minute → 429.
10. Invalid API key → 401.

When adding tests, include positive, negative, and edge-case scenarios. Security-relevant code (auth, key handling, dataset validation) must include fail-closed tests.

## Release Process

LocoPilot uses [Changesets](https://github.com/changesets/changesets) for versioning and releases.

### Creating a Changeset

After making changes:

```bash
npm run changeset
```

Follow the prompts to describe your change.

### How Releases Work

1. PRs merged to `main` with changesets trigger the Release workflow.
2. A "Version Packages" PR is automatically created.
3. Merging the version PR publishes to npm and creates a GitHub Release.

### Manual Release

```bash
npm run build
npm run changeset:version
npm run changeset:publish
```

## Security Vulnerabilities

**Do not open a public issue for security vulnerabilities.**

Report them privately by emailing **security@locopilot.dev** or by opening a [private GitHub Security Advisory](https://github.com/Infrarix/locopilot-public-cli/security/advisories/new).

See [SECURITY.md](SECURITY.md) for the full policy.

## License

By contributing to LocoPilot, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## Need Help?

If you need clarification, open an issue or start a discussion on GitHub. We appreciate every contribution that helps make LocoPilot better.

Happy contributing!
