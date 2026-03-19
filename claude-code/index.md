# Claude Code — Knowledge Base

Claude Code is an AI coding agent that runs in your terminal and IDE. It reads/writes files, runs shell commands, manages git, and browses the web — all with your approval.

## Files in This Directory

| File | Contents |
|------|----------|
| [cli-and-commands.md](cli-and-commands.md) | CLI flags, slash commands, keyboard shortcuts |
| [skills-and-hooks.md](skills-and-hooks.md) | Built-in skills, hooks, automation |
| [configuration.md](configuration.md) | settings.json, permissions, MCP servers |
| [prompting.md](prompting.md) | Effective prompting, modes, context management |
| [memory.md](memory.md) | Persistent memory across sessions |

---

## Quick Cheatsheet

### Session Control
| Goal | How |
|------|-----|
| Start interactive session | `claude` |
| Continue last session | `claude -c` |
| Resume specific session | `claude --resume <id>` |
| Compress context | `/compact` |
| Clear context entirely | `/clear` |
| Check token usage | `/cost` |

### Modes
| Mode | How | When to use |
|------|-----|-------------|
| Normal | default | Everyday use |
| Plan | `Shift+Tab` | Risky/complex tasks — review plan before execution |
| Auto-approve | `Shift+Tab` twice | Scripted/trusted tasks — skips confirmations |
| Fast | `/fast` | Quicker output |
| Print (non-interactive) | `claude -p "..."` | Scripting, pipes |

### Common Slash Commands
| Command | What it does |
|---------|--------------|
| `/init` | Create/update CLAUDE.md |
| `/commit` | Generate commit message and commit |
| `/compact [focus]` | Compress conversation history |
| `/model` | Switch model |
| `/memory` | Open memory file |
| `/doctor` | Diagnose config issues |

### Models (as of 2026)
| Model | ID | Use when |
|-------|----|----------|
| Opus 4.6 | `claude-opus-4-6` | Most capable, complex tasks |
| Sonnet 4.6 | `claude-sonnet-4-6` | Default — balanced |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | Fastest, simple tasks |
