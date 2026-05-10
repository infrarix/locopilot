# 🚀 LocoPilot

> Local-first, OpenAI-compatible AI platform.
> Run models locally in seconds, optionally scale with cloud GPUs — all through one CLI + one API.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

# ✨ What is LocoPilot?

LocoPilot lets you:

- ⚡ Run LLMs locally via Ollama (zero config)
- 🔄 Auto-fallback to remote GPU (Pro)
- 🧠 Fine-tune models locally or in the cloud
- 🌐 Expose APIs publicly in one command

👉 Works like OpenAI — just change your base URL.

---

# 🧩 Open Source vs Pro

## 🟢 Open Source (this repo)

| Component             | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `apps/cli`            | CLI — `init`, `start`, `models`, `train`, `expose`, `login`                  |
| `apps/api`            | Fastify API — OpenAI-compatible endpoints                                    |
| `core/runtime/ollama` | Local inference wrapper                                                      |
| `core/training`       | Basic local training: MLX on Apple Silicon, Unsloth/Axolotl on Linux/Windows |
| `db/`                 | SQLite schema (free tier)                                                    |
| `utils/`              | Shared helpers                                                               |

---

## 🔵 Pro (Cloud — not shipped as code)

Powered by **LocoPilot Cloud**:

- ☁️ Remote GPU (via RunPod)
- ⚡ Faster training (10–50x)
- 🌐 Public API (Cloudflare tunnel)
- 📊 Usage tracking + billing
- 🔐 Auth + API key management

👉 No private packages. Everything runs via cloud APIs.

---

# ⚡ Quickstart (Free Tier — 60 seconds)

```bash
# 1. Install CLI
npm install -g @infrarix/locopilot

# 2. Initialize (auto-installs Ollama if missing)
locopilot init

# 3. Start local API
locopilot start

# 4. Pull a model
locopilot models pull llama3

# 5. Test inference
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3","messages":[{"role":"user","content":"Hello"}]}'
```

👉 No Docker. No setup. Works offline.

---

# 🔓 Unlock Pro Features

```bash
# Login (OAuth or API key)
locopilot login

# Expose your API publicly
locopilot expose

# Use cloud GPU automatically when needed
```

---

# 🏗 Architecture

## 🟢 Free Tier (Local Mode)

```
CLI → Local API → Ollama
                → SQLite
```

- Runs fully offline
- No account required
- No external dependencies

---

## 🔵 Pro Tier (Hybrid Mode)

```
CLI → Local API
        │
        └──→ LocoPilot Cloud
                ├── GPU (RunPod)
                ├── Tunnel (Cloudflare)
                ├── Auth
                └── Usage tracking
```

---

# 🧠 Training

## Free (Local)

```bash
locopilot train --config config.json
```

- Runs locally
- Basic configs
- Limited by your hardware
- On Apple Silicon Macs, free-tier training automatically uses MLX (`mlx-lm`, Metal-optimized). On Linux/Windows, Unsloth/Axolotl are used.

---

## Pro (Cloud)

```bash
locopilot train --cloud
```

- Runs on GPU
- Faster + better results
- No setup required

---

# 🧰 CLI Reference

| Command                           | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `locopilot init`                  | Setup environment, install Ollama if missing |
| `locopilot start`                 | Start local API server                       |
| `locopilot login`                 | Authenticate for Pro features                |
| `locopilot models pull <model>`   | Pull model locally                           |
| `locopilot models list`           | List available models                        |
| `locopilot expose`                | Get public API URL                           |
| `locopilot train --config <file>` | Local training                               |
| `locopilot train --cloud`         | Cloud training (Pro)                         |
| `locopilot logs`                  | View logs                                    |

---

# 📦 Requirements

### Free Tier

- Node.js 20+
- Internet (for install only)
- No Docker required

### Pro Features

- LocoPilot account
- Internet connection

---

# 🔐 Security

- No API keys required for local mode
- Pro tokens stored in:

  ```
  ~/.locopilot/config.json
  ```

- No cloud secrets stored locally

---

# 💡 Philosophy

> **Free = capability**
> **Pro = speed, scale, convenience**

---

# 🧑‍💻 Contributing

We welcome contributions!

- Improve CLI / API
- Add integrations
- Improve docs

```bash
git clone https://github.com/locopilot/locopilot
```

---

# 📄 License

MIT — see [LICENSE](LICENSE)

---

# 🚀 Roadmap

- [ ] Plugin SDK
- [ ] GUI dashboard (Pro)
- [ ] Multi-model routing
- [ ] Enterprise features

---

# 🌐 Learn More

👉 [https://locopilot.dev](https://locopilot.dev)

---

If you want next level:

- I can also generate **landing page copy**
- or **GitHub repo structure + badges**
- or **launch strategy (HN/Product Hunt)**

Just tell me 👍
