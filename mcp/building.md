# Building MCP Servers

When no existing server fits your need, build one. MCP servers are small programs that expose tools to Claude.

---

## Minimal TypeScript Server

```bash
npm init -y
npm install @modelcontextprotocol/sdk zod
```

```typescript
// server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "my-server",
  version: "1.0.0",
});

// Define a tool
server.tool(
  "get_weather",                          // tool name
  "Get current weather for a city",       // description (Claude uses this to decide when to call it)
  { city: z.string() },                   // input schema
  async ({ city }) => {
    const data = await fetchWeather(city); // your logic here
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }
);

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
```

```json
// settings.json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["tsx", "/path/to/server.ts"]
    }
  }
}
```

---

## Minimal Python Server

```bash
pip install mcp
```

```python
# server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my-server")

@mcp.tool()
def get_weather(city: str) -> str:
    """Get current weather for a city."""
    data = fetch_weather(city)  # your logic here
    return str(data)

if __name__ == "__main__":
    mcp.run()
```

```json
// settings.json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["/path/to/server.py"]
    }
  }
}
```

---

## Key Concepts

### Tools vs Resources vs Prompts

**Tools** — Claude calls these to take actions or fetch data. Most common.
```typescript
server.tool("name", "description", { param: z.string() }, async ({ param }) => {
  return { content: [{ type: "text", text: "result" }] };
});
```

**Resources** — Static or dynamic data Claude can read (like files or records).
```typescript
server.resource("config://app", "App configuration", async () => ({
  contents: [{ uri: "config://app", mimeType: "application/json", text: JSON.stringify(config) }],
}));
```

**Prompts** — Reusable prompt templates with parameters.
```typescript
server.prompt("summarize", "Summarize a document", { doc: z.string() }, ({ doc }) => ({
  messages: [{ role: "user", content: { type: "text", text: `Summarize: ${doc}` } }],
}));
```

### Tool Return Types

```typescript
// Text
{ content: [{ type: "text", text: "result string" }] }

// Image
{ content: [{ type: "image", data: base64String, mimeType: "image/png" }] }

// Error
{ content: [{ type: "text", text: "error message" }], isError: true }
```

### Input Schema with Zod

```typescript
import { z } from "zod";

{
  query: z.string().describe("Search query"),
  limit: z.number().min(1).max(100).default(10).optional(),
  filters: z.array(z.string()).optional(),
}
```

---

## Write Good Tool Descriptions

Claude picks tools based on name + description. Be explicit about:
- What the tool does
- When to use it
- What the parameters mean

```typescript
// Bad
server.tool("db_query", "Query database", { sql: z.string() }, ...)

// Good
server.tool(
  "db_query",
  "Execute a read-only SQL SELECT query against the production database. Use this to look up records, count rows, or inspect data. Do not use for INSERT/UPDATE/DELETE.",
  { sql: z.string().describe("A SELECT SQL query") },
  ...
)
```

---

## Testing Without Claude

```bash
# MCP Inspector — visual tool for testing servers
npx @modelcontextprotocol/inspector npx tsx server.ts
```

Opens a web UI at `localhost:5173` where you can call tools manually.

---

## Packaging for Reuse

Publish to npm so others (and your other machines) can install via `npx -y`:

```json
// package.json
{
  "name": "@yourscope/mcp-server-name",
  "bin": { "mcp-server-name": "./dist/server.js" },
  "scripts": { "build": "tsc" }
}
```

```bash
npm publish --access public
# then anywhere:
# npx -y @yourscope/mcp-server-name
```

---

## Common Patterns

### Wrap a REST API
```typescript
server.tool("api_get_user", "Get user by ID from the internal API", { id: z.string() }, async ({ id }) => {
  const res = await fetch(`${process.env.API_URL}/users/${id}`, {
    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },
  });
  const data = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});
```

### Read local files with filtering
```typescript
server.tool("read_logs", "Read recent application logs", { lines: z.number().default(100) }, async ({ lines }) => {
  const content = execSync(`tail -n ${lines} /var/log/app.log`).toString();
  return { content: [{ type: "text", text: content }] };
});
```

### Execute safe shell commands
```typescript
server.tool("run_tests", "Run the test suite and return results", {}, async () => {
  const output = execSync("npm test --reporter=verbose 2>&1", { cwd: PROJECT_ROOT }).toString();
  return { content: [{ type: "text", text: output }] };
});
```
