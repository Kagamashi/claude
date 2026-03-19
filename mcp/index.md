# MCP — Model Context Protocol

Open protocol by Anthropic that standardizes how LLMs interact with external tools, data sources, and services.

## Files in This Directory

| File | Contents |
|------|----------|
| [servers-catalog.md](servers-catalog.md) | Ready-to-use servers with install commands |
| [building.md](building.md) | Build your own MCP server (TypeScript & Python) |

---

## How It Works

```
Claude Code (host)
    └── MCP Client  ←stdio or SSE→  MCP Server  ←→  External service / data
```

- **Host** — the LLM app (Claude Code, Claude Desktop, etc.)
- **Server** — a process that exposes tools/resources to the host
- **Transport** — how they communicate: `stdio` (local subprocess) or `SSE` (remote HTTP)

---

## Three Primitives

| Primitive | What it is | Analogy |
|-----------|------------|---------|
| **Tools** | Functions Claude can call | POST endpoints |
| **Resources** | Data Claude can read | GET endpoints |
| **Prompts** | Reusable prompt templates | Macros |

Most servers only expose **Tools** — that's the main thing to care about.

---

## Quick Setup in Claude Code

```bash
claude mcp add                            # interactive
claude mcp add <name> <command> [args]    # direct
claude mcp list                           # show active servers
claude mcp remove <name>                  # remove
```

Or add directly to `settings.json` — see [claude-code/configuration.md](../claude-code/configuration.md).

---

## Transport Types

### stdio (local)
Server runs as a subprocess. Simplest option for local tools.
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@scope/mcp-server"],
      "env": { "API_KEY": "..." }
    }
  }
}
```

### SSE (remote)
Server runs remotely over HTTP. Used for shared/cloud servers.
```json
{
  "mcpServers": {
    "remote": {
      "type": "sse",
      "url": "https://mcp.example.com/sse",
      "headers": { "Authorization": "Bearer token" }
    }
  }
}
```
