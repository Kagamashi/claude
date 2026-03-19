# Skills & Hooks

## Skills

Skills are slash commands that load a pre-written prompt when invoked. They're how Claude Code packages repeatable workflows.

### Built-in Skills

| Skill | Invoke | What it does |
|-------|--------|--------------|
| `update-config` | `/update-config` | Configure `settings.json` — hooks, permissions, env vars, MCP servers |
| `keybindings-help` | `/keybindings-help` | Customize `~/.claude/keybindings.json` |
| `simplify` | `/simplify` | Review changed code for quality, reuse, and efficiency — then fixes issues |
| `loop` | `/loop [interval] [command]` | Run a command on a recurring interval (default 10m). E.g. `/loop 5m /commit` |
| `claude-api` | `/claude-api` | Build apps using the Claude API / Anthropic SDK |

### When to Reach for a Skill

- **`/update-config`** — any time you want to add permissions, configure hooks, or add an MCP server without hand-editing JSON
- **`/simplify`** — after finishing a feature, before committing
- **`/loop`** — when you need to poll a status, watch for changes, or run something repeatedly
- **`/claude-api`** — when writing code that calls `anthropic` / `@anthropic-ai/sdk`

---

## Hooks

Hooks run shell commands in response to Claude Code events. They're configured in `settings.json` and execute outside Claude — Claude doesn't control them.

### Hook Events

| Event | When it fires |
|-------|---------------|
| `PreToolUse` | Before Claude executes a tool call |
| `PostToolUse` | After a tool call completes |
| `Notification` | When Claude sends a notification |
| `Stop` | When Claude finishes responding |

### Hook Configuration

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"Running: $CLAUDE_TOOL_INPUT\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Done\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

### Matcher Syntax

```json
"matcher": "Bash"           // match specific tool
"matcher": "Bash|Edit|Write" // match multiple tools
                             // omit matcher = match all tools
```

### Hook Behavior

- Hooks run as shell commands in the project directory
- `PreToolUse` hook exit code non-zero → **tool call is blocked**
- Hook stdout/stderr is shown to both Claude and the user
- Use `/update-config` to configure hooks interactively instead of hand-editing

### Useful Hook Patterns

```json
// Desktop notification when Claude finishes (macOS)
"Stop": [{"hooks": [{"type": "command",
  "command": "osascript -e 'display notification \"Claude is done\" with title \"Claude Code\"'"}]}]

// Log every bash command Claude runs
"PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "command",
  "command": "echo \"$(date): $CLAUDE_TOOL_INPUT\" >> ~/claude-bash.log"}]}]

// Block writes outside src/
"PreToolUse": [{"matcher": "Write", "hooks": [{"type": "command",
  "command": "echo $CLAUDE_TOOL_INPUT | grep -q '\"path\":\"src/' || exit 1"}]}]
```

### Available Hook Environment Variables

| Variable | Contents |
|----------|----------|
| `$CLAUDE_TOOL_NAME` | Name of the tool being called |
| `$CLAUDE_TOOL_INPUT` | JSON-encoded tool input |
| `$CLAUDE_TOOL_OUTPUT` | JSON-encoded tool output (PostToolUse only) |
