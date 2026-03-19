# CLI & Commands

## CLI Reference

### Basic Usage
```bash
claude                          # Interactive session
claude "explain this function"  # One-shot (auto-exits after response)
claude -p "do X"                # Print mode — non-interactive, pipes-friendly, no confirmations
```

### Session Continuity
```bash
claude -c                       # Continue last conversation
claude --resume                 # Pick from recent sessions interactively
claude --resume <session-id>    # Resume specific session by ID
```

### Model Selection
```bash
claude --model claude-opus-4-6
claude --model claude-sonnet-4-6          # default
claude --model claude-haiku-4-5-20251001
```

### Output Format
```bash
claude -p "explain X" --output-format json         # structured JSON
claude -p "explain X" --output-format stream-json  # streaming JSON (for piping)
claude -p "explain X" --output-format text         # plain text (default)
```

### Permissions & Safety
```bash
claude --allowedTools "Read,Glob,Grep"   # whitelist specific tools
claude --disallowedTools "Bash"          # blacklist specific tools
claude --dangerouslySkipPermissions      # skip all confirmation prompts
```

### Context
```bash
claude --add-dir ./src          # add directory to allowed paths
```

### Debug
```bash
claude --verbose                # verbose/debug output
claude --no-stream              # disable streaming responses
```

---

## Slash Commands

Type these inside any interactive session.

### Context & Session
| Command | Description |
|---------|-------------|
| `/clear` | Clear conversation context (CLAUDE.md is reloaded) |
| `/compact` | Compress context to a summary — use when context is getting large |
| `/compact focus on the auth system` | Compact with instructions on what to preserve |
| `/cost` | Show token usage and estimated cost for this session |
| `/memory` | Open the project memory file in your editor |

### Configuration & Tools
| Command | Description |
|---------|-------------|
| `/model` | Switch model interactively |
| `/fast` | Toggle fast mode |
| `/vim` | Toggle vim keybindings |
| `/init` | Create or update `CLAUDE.md` for the current project |
| `/doctor` | Diagnose configuration issues |

### Git & Code
| Command | Description |
|---------|-------------|
| `/commit` | Generate a commit message and commit staged changes |
| `/review-pr [number]` | Review a GitHub PR |

### Account
| Command | Description |
|---------|-------------|
| `/login` | Authenticate with Anthropic |
| `/logout` | Sign out |
| `/bug` | Report a bug to Anthropic |
| `/help` | Show available commands |

---

## Keyboard Shortcuts (Interactive & IDE)

| Shortcut | Action |
|----------|--------|
| `Shift+Tab` | Cycle modes: Normal → Plan → Auto-approve |
| `Esc` | Cancel current response |
| `Ctrl+C` | Interrupt / cancel |
| `↑ / ↓` | Navigate input history |
