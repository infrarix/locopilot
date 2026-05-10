<p align="center">
  <img src="docs/static/img/logo.svg" alt="LocoPilot" width="96" height="96" />
</p>

<h1 align="center">LocoPilot</h1>

<p align="center">
  <strong>A local-first, OpenAI-compatible AI runtime in a single CLI.</strong><br>
  Run open models on your laptop, fall back to cloud GPUs when you need to, fine-tune on your data — all behind one OpenAI-compatible API.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@infrarix/locopilot"><img src="https://img.shields.io/npm/v/@infrarix/locopilot.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@infrarix/locopilot"><img src="https://img.shields.io/npm/dm/@infrarix/locopilot.svg?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/Infrarix/locopilot/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@infrarix/locopilot.svg?style=flat-square" alt="License" /></a>
  <a href="https://github.com/Infrarix/locopilot/actions"><img src="https://img.shields.io/github/actions/workflow/status/Infrarix/locopilot/release.yml?branch=main&style=flat-square" alt="CI status" /></a>
  <img src="https://img.shields.io/node/v/@infrarix/locopilot.svg?style=flat-square" alt="Node version" />
</p>

<p align="center">
  <a href="https://infrarix.github.io/locopilot/">Documentation</a> ·
  <a href="https://infrarix.github.io/locopilot/docs/getting-started/quickstart">Quickstart</a> ·
  <a href="https://infrarix.github.io/locopilot/docs/cli/init">CLI reference</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## Why LocoPilot

Most AI tooling forces a choice: ship to a hosted provider and pay per token, or stitch together your own runtime, gateway, and trainer. LocoPilot collapses both into one CLI.

- **Zero config.** `locopilot init` detects your platform, installs Ollama if missing, and writes a working API in under a minute.
- **OpenAI-compatible.** Point any client (OpenAI SDKs, LangChain, LlamaIndex, plain `curl`) at `http://localhost:8080/v1` and it just works — `chat/completions`, `models`, streaming.
- **Local first, cloud when you need it.** The Free tier serves models from your own Ollama. Sign in with `locopilot login` and requests for models that aren't local fall through to remote GPU automatically.
- **Fine-tune from the same CLI.** MLX on Apple Silicon, Unsloth or Axolotl on Linux/Windows. Run locally for free, or pass `--cloud` for managed GPU.
- **No vendor lock-in.** MIT-licensed. The Pro features are pure HTTP clients — no private packages, no kernel modules, no telemetry.

## Install

```bash
npm install -g @infrarix/locopilot
```

Requires **Node.js 20+**. Ollama is installed automatically by `locopilot init` if it isn't already on `$PATH`.

## Quickstart

```bash
# 1. Bootstrap (writes ~/.locopilot, installs Ollama if missing)
locopilot init

# 2. Pull a model
locopilot models pull llama3

# 3. Start the local API
locopilot start

# 4. Use it
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3","messages":[{"role":"user","content":"Hello"}]}'
```

No Docker, no account, works offline.

### From the OpenAI SDK

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'not-required-for-local',
});

const reply = await client.chat.completions.create({
  model: 'llama3',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## Commands

| Command                                       | Description                                                |
| --------------------------------------------- | ---------------------------------------------------------- |
| `locopilot init`                              | Bootstrap config, install Ollama, run pre-flight checks    |
| `locopilot doctor`                            | Diagnose the local environment                             |
| `locopilot start [--port <n>]`                | Start the OpenAI-compatible API on `localhost:8080`        |
| `locopilot models pull <model>`               | Download a model via Ollama                                |
| `locopilot models list`                       | List installed models (and cloud catalog when Pro)         |
| `locopilot models rm <model>`                 | Remove a local model                                       |
| `locopilot train --config <file>`             | Run a fine-tuning job locally (in-process)                 |
| `locopilot train --config <file> --cloud`     | Submit a training job to LocoPilot Cloud *(Pro)*           |
| `locopilot logs --job <id>`                   | Stream logs from a training job                            |
| `locopilot expose`                            | Publish the local API on a Cloudflare tunnel *(Pro)*       |
| `locopilot login`                             | Sign in for Pro features                                   |
| `locopilot logout`                            | Remove the stored Pro token                                |
| `locopilot whoami`                            | Show the current Pro account                               |
| `locopilot usage`                             | Show token usage and billing summary *(Pro)*               |

Full reference at <https://infrarix.github.io/locopilot/docs/cli/init>.

## Configuration

All local state lives under `~/.locopilot/`:

```
~/.locopilot/
├── .env             # API_PORT, OLLAMA_HOST, etc.
├── db.sqlite        # Free-tier inference and training history
└── config.json      # Pro-tier token (created by `locopilot login`)
```

Tier detection is **purely client-side**: a valid `qs_…` token in `~/.locopilot/config.json` enables Pro features. The CLI never reads cloud credentials or database URLs directly.

## Architecture

LocoPilot ships as a single npm package. Source lives under [`src/`](src):

| Path            | Purpose                                                          |
| --------------- | ---------------------------------------------------------------- |
| `src/api/`      | Fastify 5 gateway exposing OpenAI-compatible endpoints           |
| `src/cli/`      | Commander.js CLI (`init`, `start`, `train`, `expose`, …)         |
| `src/worker/`   | Basic in-process training worker (Free tier)                     |
| `src/training/` | `TrainingAdapter` interface + MLX / Unsloth / Axolotl runners    |
| `src/cloud/`    | Single point of egress to LocoPilot Cloud (Pro)                  |
| `src/shared/`   | Shared utilities, types, DB pool, Ollama client                  |

### Free tier

```
client ──► local Fastify API ──► Ollama runtime
                              └─► SQLite (~/.locopilot/db.sqlite)
```

### Pro tier

```
client ──► local Fastify API ──► Ollama (local first)
                              └─► LocoPilot Cloud (model missing locally)
                                    ├── RunPod GPU
                                    ├── Cloudflare Tunnel (`expose`)
                                    └── Auth + usage metering
```

## Fine-tuning

Free-tier training runs on your machine. The adapter is selected per OS:

- **macOS arm64** → MLX (`mlx-lm`, Metal-optimized)
- **Linux / Windows + NVIDIA** → Unsloth (default) or Axolotl

```bash
locopilot train --config train.json
```

For multi-GPU, faster wall time, and managed checkpoints:

```bash
locopilot train --config train.json --cloud
```

See [training docs](https://infrarix.github.io/locopilot/docs/training/configuration) for the full config schema and supported dataset formats (Alpaca, ShareGPT).

## Pro tier

LocoPilot is open-source and free for local use. The optional **LocoPilot Cloud** adds:

- Remote GPU inference fallback (RunPod-backed)
- Managed training (10–50× a laptop)
- Public HTTPS endpoint via Cloudflare Tunnel
- Token-level usage analytics and billing

Pro is purely an HTTP client — no private packages are ever installed locally.

## Documentation

The full Docusaurus site lives at <https://infrarix.github.io/locopilot/>. Highlights:

- [Getting started](https://infrarix.github.io/locopilot/docs/getting-started/quickstart)
- [API reference](https://infrarix.github.io/locopilot/docs/api/chat-completions)
- [CLI reference](https://infrarix.github.io/locopilot/docs/cli/init)
- [Architecture overview](https://infrarix.github.io/locopilot/docs/architecture/overview)
- [Training guide](https://infrarix.github.io/locopilot/docs/training/configuration)

## Contributing

Bug reports, feature requests, and PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, branching, commit conventions, and the release process.

```bash
git clone https://github.com/Infrarix/locopilot.git
cd locopilot
npm install
npm run build
npm run dev
```

## Security

Found a vulnerability? Please don't open a public issue — see [SECURITY.md](SECURITY.md) for the responsible disclosure process.

## License

[MIT](LICENSE) © 2025–2026 LocoPilot
