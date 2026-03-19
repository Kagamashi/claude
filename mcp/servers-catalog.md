# MCP Servers Catalog

All official servers: `npx -y @modelcontextprotocol/server-<name>`

---

## File System

### filesystem
Read/write files outside the project root.
```bash
claude mcp add filesystem npx -- -y @modelcontextprotocol/server-filesystem /allowed/path
```
Tools: `read_file`, `write_file`, `list_directory`, `move_file`, `search_files`, `get_file_info`

---

## Databases

### postgres
Query a PostgreSQL database.
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@host/db"]
}
```
Tools: `query` (read-only SQL), `list_tables`, `describe_table`

### sqlite
Query a local SQLite file.
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/db.sqlite"]
}
```
Tools: `query`, `list_tables`, `describe_table`, `create_table`, `insert_row`

---

## Dev Tools

### github
GitHub API — repos, issues, PRs, code search.
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }
}
```
Tools: `create_issue`, `list_issues`, `create_pull_request`, `get_file_contents`, `search_repositories`, `search_code`, and more

### gitlab
GitLab API — similar to GitHub server.
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-gitlab"],
  "env": { "GITLAB_PERSONAL_ACCESS_TOKEN": "...", "GITLAB_API_URL": "https://gitlab.com/api/v4" }
}
```

---

## Web & Search

### fetch
Make HTTP requests — fetch web pages, call APIs.
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-fetch"]
}
```
Tools: `fetch` — retrieves URL content, converts HTML to markdown

### brave-search
Web and local search via Brave Search API.
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": { "BRAVE_API_KEY": "..." }
}
```
Tools: `brave_web_search`, `brave_local_search`

### puppeteer
Browser automation — screenshot, interact, scrape.
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
}
```
Tools: `puppeteer_navigate`, `puppeteer_screenshot`, `puppeteer_click`, `puppeteer_fill`, `puppeteer_evaluate`

---

## Productivity

### slack
Post messages, read channels, search Slack.
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-slack"],
  "env": {
    "SLACK_BOT_TOKEN": "xoxb-...",
    "SLACK_TEAM_ID": "T..."
  }
}
```
Tools: `post_message`, `list_channels`, `get_channel_history`, `search_messages`

### google-drive
Read and search Google Drive files.
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-gdrive"],
  "env": { "GDRIVE_CREDENTIALS_PATH": "/path/to/credentials.json" }
}
```
Tools: `search`, `read_file`

### google-maps
Places, directions, geocoding via Google Maps API.
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-google-maps"],
  "env": { "GOOGLE_MAPS_API_KEY": "..." }
}
```

---

## Memory

### memory
Persistent key-value memory across sessions (separate from Claude Code's built-in memory).
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```
Tools: `create_entities`, `create_relations`, `search_nodes`, `read_graph` — stores a knowledge graph

---

## Finding More Servers

| Source | URL |
|--------|-----|
| Official servers | https://github.com/modelcontextprotocol/servers |
| Community registry | https://mcp.so |
| npm search | `npm search mcp-server` |

---

## Tips

- Add frequently-used servers (GitHub, filesystem) to `~/.claude/settings.json` so they're available everywhere
- Add project-specific servers (postgres, sqlite) to `.claude/settings.json`
- Store API keys in `.claude/settings.local.json` (gitignored), not in the committed project settings
- Run `claude mcp list` to verify servers are loading correctly
- If a server fails to start, check with `claude --verbose` for error output
