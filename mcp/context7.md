# Context7

MCP server that fetches up-to-date library documentation and code examples on demand. Solves the core problem of LLMs giving you outdated or hallucinated API answers.

**How it works:** when you ask about a library, Context7 pulls the current docs from the source and injects them into your prompt — so Claude answers based on what's actually in the library today, not what was in its training data.

---

## Setup

```bash
claude mcp add context7 npx -- -y @upstash/context7-mcp
```

Or in `settings.json`:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

No API key required.

---

## Tools

### `resolve-library-id`
Maps a library name to its Context7 ID. Run this first if `query-docs` doesn't find what you need.

```
Input:  libraryName = "react-query"
Output: /tanstack/query
```

### `query-docs`
Fetches documentation for a library. Main tool you'll use.

```
Input:
  libraryId = "/tanstack/query"   (from resolve-library-id, or guess e.g. "/vercel/next.js")
  query     = "useQuery options"
  tokens    = 5000                 (optional, default ~5000)

Output: relevant docs + code examples
```

---

## Usage in Claude Code

You don't call the tools manually — just ask naturally and Claude will use them:

```
"How do I use useInfiniteQuery in TanStack Query v5?"
"Show me how to configure retry logic in axios interceptors"
"What are the new features in Pydantic v2?"
"How do I set up Drizzle ORM with PostgreSQL?"
```

Claude will automatically call `query-docs` before answering when docs are relevant.

---

## When It Matters Most

- **Recently updated libraries** — breaking changes, new APIs (React 19, Next.js 15, Pydantic v2, etc.)
- **Version-specific questions** — "how do I do X in v5 vs v4"
- **Obscure options** — configuration flags, edge-case behavior
- **Code examples** — get real, runnable examples from the actual docs

Less useful for stable, well-established APIs that haven't changed in years.

---

## Tips

- Be specific in your question — the more precise, the better the doc retrieval
- Mention the version if it matters: `"in TanStack Query v5"`, `"Next.js 15 App Router"`
- If Claude gives an outdated answer, say: `"check the current docs with Context7"` to force a lookup
- Works best for libraries that publish good docs (most major npm/PyPI packages)
