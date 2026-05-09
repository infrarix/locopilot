# GitHub Actions Workflows

CI/CD for the **`quickslug`** npm package and its Docusaurus docs site.

This directory is designed for `quickslug-public-cli/` to live as its own standalone repository. All workflow paths assume `quickslug-public-cli/` is the repo root (so `package.json`, `.changeset/`, `.husky/`, etc. all sit at the same level as `.github/`).

## Workflows

### `release.yml` — CI & Release

Triggers:

- `push` to `main`
- `pull_request` against `main` (CI job only)

Jobs:

1. **CI** — `npm ci` → `format:check` → `lint` → `typecheck` → `build`. Runs on Node 20.
2. **Release** (push-to-main only) — Auto-generates a changeset from the merged commit (`changeset:autogenerate` script), then runs [`changesets/action`](https://github.com/changesets/action) which either:
   - opens a `chore(release): version packages` PR (when there are pending changesets), or
   - publishes to npm when a release PR is merged (`publish` step runs `npm run changeset:publish`, which builds the CLI and runs `changeset publish`).

The release scope is intentionally narrow — only commits whose Conventional Commit scope is `cli`, `api`, `worker`, `training`, `cloud`, or `shared` produce a changeset. `docs`, `ci`, `deps`, `release`, `repo` are no-ops on purpose.

### `release-docs.yml` — Deploy Documentation

Triggers on push to `main` when anything under `docs/**` changes (or via `workflow_dispatch`).

Builds the Docusaurus site at `docs/` and deploys to GitHub Pages with the official `actions/deploy-pages@v4` action.

## Required secrets

| Secret      | Used by       | Purpose                                                                                     |
| ----------- | ------------- | ------------------------------------------------------------------------------------------- |
| `GH_PAT`    | `release.yml` | Lets `changesets/action` create release PRs (the default `GITHUB_TOKEN` cannot create PRs). |
| `NPM_TOKEN` | `release.yml` | npm publish token (Automation type, must have publish rights on the `quickslug` package).   |

### Creating `GH_PAT`

1. https://github.com/settings/tokens/new
2. Name: `QuickSlug Release Bot`
3. Scopes: `repo`, `workflow`
4. Generate, copy
5. Repository → Settings → Secrets and variables → Actions → New repository secret
6. Name: `GH_PAT`, value: paste

### Creating `NPM_TOKEN`

1. https://www.npmjs.com/ → Access Tokens → Generate New Token → **Automation**
2. Add to repository secrets as `NPM_TOKEN`.

### Enabling GitHub Pages

Repository → Settings → Pages → **Build and deployment → Source: GitHub Actions**.

## Local equivalents

From the `quickslug-public-cli/` directory:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run build
```

Docs:

```bash
cd docs
npm ci
npm run build
```

Adding a changeset by hand:

```bash
npm run changeset       # interactive: pick bump + write description
```

## Note about the parent monorepo

While this directory still lives inside the `Quickslug/` parent monorepo, npm workspaces and `@manypkg/get-packages` may climb up and detect the parent as the project root, which trips up `npx changeset` locally (it'll complain "There is no .changeset folder"). The fix is one of:

- Use this directory as its own git repo (the intended end state) — every tool then sees this as the root and Just Works.
- For local-only convenience inside the monorepo, run with an explicit `cwd`:
  ```bash
  npx changeset --cwd .
  ```

The CI jobs are unaffected — they check out `quickslug-public-cli/` (or this directory once extracted) as the workspace and operate from there.

## Troubleshooting

**`GitHub Actions is not permitted to create or approve pull requests`** — `GH_PAT` missing or lacks `repo` + `workflow` scopes.

**npm publish fails with 401/403** — `NPM_TOKEN` missing, expired, or scoped to the wrong package; the token must have publish rights on `quickslug`.

**Docs deploy fails with `404` on GitHub Pages** — Repo → Settings → Pages → Source must be `GitHub Actions` (not "Deploy from a branch").
