# Configuration

## Settings Hierarchy

More specific settings override broader ones. Merged in this order:

```
~/.claude/settings.json           # user-level — all projects
.claude/settings.json             # project-level — commit this
.claude/settings.local.json       # local overrides — gitignore this
```

---

## settings.json Structure

```json
{
  "model": "claude-sonnet-4-6",
  "theme": "dark",

  "permissions": {
    "allow": ["Bash(npm *)", "Write(src/**)"],
    "deny": ["Bash(rm -rf *)"]
  },

  "env": {
    "NODE_ENV": "development"
  },

  "hooks": { },       // see skills-and-hooks.md

  "mcpServers": { }   // see MCP Servers section below
}
```

---

## Permissions

Permissions control which tool calls Claude can make without asking.

### Format

```
ToolName(glob-pattern)
```

### Common Examples

```json
"permissions": {
  "allow": [
    "Bash(npm *)",             // any npm command
    "Bash(git *)",             // any git command
    "Bash(pytest *)",          // pytest runs
    "Write(src/**)",           // writes inside src/
    "Write(**/*.md)",          // any markdown file
    "Read(**)",                // all reads (usually safe to allow globally)
    "Glob(**)",
    "Grep(**)"
  ],
  "deny": [
    "Bash(rm *)",              // block all rm
    "Bash(git push --force *)" // block force push
  ]
}
```

### Tool Names

`Bash` `Read` `Write` `Edit` `Glob` `Grep` `WebFetch` `WebSearch` `TodoWrite`

> Use `/update-config` skill to add permissions interactively.

---

## MCP Servers

MCP (Model Context Protocol) servers add new tools to Claude Code. Each server exposes tools Claude can call, exactly like built-in tools.

### CLI Management

```bash
claude mcp add                            # interactive setup
claude mcp add <name> <command> [args]    # direct add
claude mcp list                           # show configured servers
claude mcp remove <name>                  # remove server
claude mcp get <name>                     # show server details
```

### Manual Configuration (settings.json)

**stdio server** (local process):
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@scope/mcp-server-name"],
      "env": {
        "API_KEY": "your-key-here"
      }
    }
  }
}
```

**SSE server** (remote HTTP):
```json
{
  "mcpServers": {
    "remote-server": {
      "type": "sse",
      "url": "https://mcp.example.com/sse",
      "headers": {
        "Authorization": "Bearer your-token"
      }
    }
  }
}
```

### Scopes

| Scope | File | When to use |
|-------|------|-------------|
| user | `~/.claude/settings.json` | Servers used across all projects |
| project | `.claude/settings.json` | Project-specific servers, safe to commit |
| local | `.claude/settings.local.json` | Local credentials, never commit |

### Common MCP Servers

```bash
# Standard file system access (beyond project root)
npx -y @modelcontextprotocol/server-filesystem /allowed/path

# GitHub — issues, PRs, repos
npx -y @modelcontextprotocol/server-github
# Requires: GITHUB_PERSONAL_ACCESS_TOKEN env var

# Puppeteer — browser automation
npx -y @modelcontextprotocol/server-puppeteer

# PostgreSQL
npx -y @modelcontextprotocol/server-postgres postgresql://user:pass@host/db

# Sqlite
npx -y @modelcontextprotocol/server-sqlite /path/to/db.sqlite
```

---

## CLAUDE.md

CLAUDE.md is loaded into every session automatically. It's how you give Claude persistent project context.

### Locations

| Path | Scope |
|------|-------|
| `CLAUDE.md` (project root) | All sessions in this project |
| `~/.claude/CLAUDE.md` | All sessions, all projects |
| `src/CLAUDE.md` | Sessions where Claude is working in `src/` |

### What to Put In It

- Build/test/lint commands
- Architecture overview and key decisions
- Conventions (naming, patterns, what to avoid)
- Pointers to important files
- Notes on tricky areas of the codebase

### What NOT to Put In It

- Generic best practices
- Things already obvious from reading the code
- Secrets or credentials

> Use `/init` to auto-generate a starter CLAUDE.md, then customize it.
