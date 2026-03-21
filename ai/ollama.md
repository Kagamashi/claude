# Ollama — Local LLMs for Developers

Run large language models locally. No API keys, no usage costs, no data leaving your machine.

**Install:** https://ollama.com/download — or `brew install ollama` on macOS.

---

## Why Local Models

| | Cloud API | Ollama (local) |
|--|-----------|----------------|
| Cost | Per-token billing | Free (hardware cost only) |
| Privacy | Code sent to vendor | Never leaves machine |
| Latency | Network round-trip | Instant (GPU-bound) |
| Offline | No | Yes |
| Model choice | Vendor's catalog | Any open model |

---

## Basic Commands

```bash
ollama pull qwen2.5-coder:14b       # download a model
ollama run qwen2.5-coder:14b        # interactive chat
ollama list                          # show downloaded models
ollama rm codellama:7b               # delete a model
ollama ps                            # show running models
ollama show qwen2.5-coder:14b        # model info, parameters
```

Ollama runs as a background service and exposes an **OpenAI-compatible API** at `http://localhost:11434`.

---

## Step 1 — Hardware First (VRAM is the limit)

VRAM determines which models you can run. The whole model must fit in VRAM to use the GPU; if it doesn't fit, it falls back to CPU (10-20× slower).

| VRAM / RAM | Max model size | Examples |
|-----------|----------------|---------|
| 8 GB | 7B models | Laptops, M1/M2 MacBook |
| 16 GB | 13–14B models | RTX 4070, M-Pro MacBook |
| 32 GB | 32–34B models | RTX 4090, M-Max MacBook |
| 48 GB+ | 70B+ models | Workstations, M-Ultra |

> Apple Silicon uses unified memory — RAM and VRAM are the same pool. A 32GB M3 Pro can run 34B models.

---

## Step 2 — Quantization (the tag after the colon)

Quantization compresses model weights to reduce VRAM usage. When pulling a model, the tag specifies the quantization:

```bash
ollama pull qwen2.5-coder:14b-instruct-q5_k_m
```

### Reading the tag

| Part | Meaning |
|------|---------|
| `Q4`, `Q5`, `Q8` | Bits per weight — lower = smaller file, slightly less accurate |
| `_K` | K-quant method — smarter compression, better quality than legacy (`_0`, `_1`) |
| `_M` / `_S` / `_L` | Medium / Small / Large — precision within K-quants |

### Practical guide

| Tag | VRAM usage | Quality | When to use |
|-----|-----------|---------|-------------|
| `q4_k_m` | Lowest | Good | Maximize model size on limited VRAM |
| `q5_k_m` | Medium | **Best balance** ← default choice | Most situations |
| `q8_0` | Highest | Near full | When VRAM is not a constraint |

**Key rule:** a larger model at lower quantization beats a smaller model at higher precision.
Run `34b-q4_k_m` over `7b-q8_0` every time — more parameters matter more than precision.

---

## Step 3 — Model Flavors (instruct vs base)

Most models come in variants. Getting this wrong gives terrible results.

| Flavor | Tag example | Use for |
|--------|-------------|---------|
| **Instruct** | `codellama:7b-instruct` | Chat, Q&A, debugging — **this is what you want 99% of the time** |
| **Code** (base) | `codellama:7b-code` | Autocomplete in IDE only — not chat |
| **Python** | `codellama:7b-python` | Python-only specialized completion |

> If you try to chat with a base/code model, responses will be garbage. Always use `instruct` for interactive use.

---

## Step 4 — Choose Your Model

### 2025 Coding Leaders

| Model | Pull command | Best for |
|-------|-------------|---------|
| **DeepSeek-Coder V2** | `ollama pull deepseek-coder-v2:16b-instruct` | Top benchmark scores, debugging, general coding |
| **Qwen2.5-Coder 32B** | `ollama pull qwen2.5-coder:32b-instruct` | Complex multi-turn sessions, 92+ languages |
| **Qwen3** | `ollama pull qwen3:14b` | Best reasoning, long context |

DeepSeek-Coder V2 and Qwen2.5-Coder consistently top HumanEval and MBPP benchmarks and rival GPT-4 Turbo for coding tasks.

### By Use Case (16GB VRAM)

| Profile | Model |
|---------|-------|
| Python / data science | `deepseek-coder-v2:16b-instruct` |
| Full-stack web (JS/TS/Python) | `qwen2.5-coder:14b-instruct` |
| Systems (C++, Rust, Go) | `qwen2.5-coder:14b-instruct` |
| Low-resource languages (Julia, Lua, Perl) | `starcoder2:15b` |

### By Use Case (8GB VRAM)

| Profile | Model |
|---------|-------|
| Python / data science | `codellama:7b-python` |
| Full-stack web | `qwen2.5-coder:7b-instruct` |
| Systems / Rust | `codegemma:7b-instruct` |
| General coding | `deepseek-coder:6.7b-instruct` |

### Legacy Models (still solid, no longer SOTA)

| Model | Notes |
|-------|-------|
| `codellama` | Meta's original coding model. Good, but DeepSeek/Qwen are better now. |
| `mistral` | Great generalist, not a coding specialist |
| `mixtral` | MoE generalist — DeepSeek-Coder-V2 (also MoE) beats it for code |
| `codegemma` | Google's lightweight model, strong community, good for Rust |

---

## API Usage

Ollama exposes an OpenAI-compatible API — drop-in replacement in any OpenAI SDK call:

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # required by SDK, value doesn't matter
)

response = client.chat.completions.create(
    model="qwen2.5-coder:14b-instruct",
    messages=[{"role": "user", "content": "Write a binary search in Python"}],
)
```

```bash
# Direct API call
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5-coder:14b-instruct",
  "messages": [{"role": "user", "content": "explain async/await"}],
  "stream": false
}'
```

---

## Ollama as MCP Server

Use community MCP servers to give Claude Code direct access to your local Ollama models:

```json
{
  "mcpServers": {
    "ollama": {
      "command": "npx",
      "args": ["-y", "ollama-mcp-server"],
      "env": { "OLLAMA_HOST": "http://localhost:11434" }
    }
  }
}
```

---

## Quick Decision Flow

```
What's my VRAM?
    8GB  → 7B models  → qwen2.5-coder:7b-instruct  or  codellama:7b-python
   16GB  → 14B models → qwen2.5-coder:14b-instruct or  deepseek-coder-v2:16b-instruct
   32GB  → 32B models → qwen2.5-coder:32b-instruct
   48GB+ → 70B models → deepseek-coder-v2:236b-instruct (MoE, fits in less VRAM)

Use q5_k_m unless VRAM is tight → then q4_k_m
Always pick instruct variant for chat
```
