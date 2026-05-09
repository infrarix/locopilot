# Security Policy

## Supported Versions

The latest minor of the `@infrarix/quickslug` npm package is supported with security fixes. Older minors receive fixes for **critical** issues only.

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |
| < 1.0   | ❌        |

## Reporting a Vulnerability

**Please do NOT open a public issue for security vulnerabilities.**

If you discover a security vulnerability in QuickSlug, please report it responsibly via either:

1. **Email** — Send details to **security@quickslug.dev**
2. **GitHub Security Advisory** — [Create a private advisory](https://github.com/Infrarix/quickslug-public-cli/security/advisories/new)

If you don't get an acknowledgement within 48 hours, please follow up on the other channel — mail can occasionally be misrouted.

### What to Include

- A clear description of the vulnerability
- Steps to reproduce (commands, request payloads, environment)
- Affected component(s) and version(s) — Free or Pro tier, OS, Node.js version
- Potential impact assessment
- A suggested fix (optional)

Please redact API keys, tokens, and any other secrets before sharing logs or screenshots.

### Response Timeline

| Stage              | Target Timeline       |
| ------------------ | --------------------- |
| Acknowledgement    | 48 hours              |
| Initial assessment | 5 business days       |
| Fix development    | 14 business days      |
| Public disclosure  | After fix is released |

We coordinate disclosure with reporters and aim to publish a CVE where appropriate.

### Scope

The following components in this repository (`quickslug-public-cli`) are in scope:

- **`src/api/`** — local Fastify gateway: authentication bypass on Pro routes, request smuggling, prompt-log leakage, SSE handling flaws
- **`src/cli/`** — Commander CLI: command injection, unsafe handling of `~/.quickslug/config.json`, insecure file permissions, leakage of the `qs_` token
- **`src/worker/`** & **`src/training/`** — basic in-process training worker, dataset validator, Python runners (`mlx_runner.py`, `unsloth_runner.py`, `axolotl_runner.py`): unsafe deserialization, path traversal in dataset paths, arbitrary code execution via training configs
- **`src/cloud/client.ts`** — single point of egress to QuickSlug Cloud: TLS / certificate handling, request signing, retry/idempotency flaws
- **`src/shared/`** — shared utilities, DB pool, Ollama runtime client: SQL injection in SQLite access, SSRF via the Ollama client
- **Free-tier persistence** — the SQLite store at `~/.quickslug/db.sqlite`: file permissions, integrity, secret-at-rest issues

The hosted **QuickSlug Cloud** (`quickslug-core-backend`) is a separate service and is not part of this repository. Please still report cloud-side issues (RunPod proxying, Stripe webhook handling, BullMQ queue, Postgres data) to **security@quickslug.dev** and indicate that the report concerns the cloud control plane — we'll route it internally.

### Out of Scope

- Vulnerabilities in third-party dependencies — please report them upstream; we will update promptly when fixes are available
- Denial-of-service attacks against a user's own local development server
- Issues that require physical access to the user's machine, root privileges, or a compromised Node.js install
- Social-engineering attacks against contributors or users
- Findings from automated scanners without a working proof-of-concept

## Security Design Principles

QuickSlug is built with these principles:

1. **Local-first by default** — Free-tier inference and training run on the user's machine; no telemetry, no account, no outbound calls beyond Ollama
2. **Tier detection is purely client-side** — the public client never reads `DATABASE_URL` or `REDIS_URL`; Pro is unlocked solely by the presence of a `qs_` token in `~/.quickslug/config.json`
3. **One egress path** — all calls to QuickSlug Cloud go through `src/cloud/client.ts`, which is reviewed against bypass attempts
4. **No prompt logging by default** — prompt and completion content is logged only when `QUICKSLUG_LOG_PROMPTS=true` is explicitly set
5. **Fail closed on auth** — Pro routes (`/api/inference`, `/api/train`, `/api/tunnel`) reject if subscription state cannot be verified
6. **Token storage** — Pro tokens live in `~/.quickslug/config.json` and are never echoed back to logs; tokens are revocable via the dashboard

## Acknowledgments

We gratefully acknowledge security researchers who responsibly disclose vulnerabilities. With your permission, we'll credit you in the release notes and the security advisory for the fix.
