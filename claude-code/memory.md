# Memory System

Claude Code has a persistent, file-based memory that carries information across sessions. Claude reads and writes it automatically — but you can also direct it explicitly.

---

## Storage Location

```
~/.claude/projects/<encoded-project-path>/memory/
    MEMORY.md              ← index file (always loaded into every session)
    user_role.md
    feedback_testing.md
    project_goals.md
    ...
```

`MEMORY.md` is loaded at session start. Keep it under 200 lines — content beyond that is truncated.

---

## Memory Types

| Type | What to store | Examples |
|------|---------------|---------|
| `user` | Your role, expertise, preferences | "Senior Go dev, new to React" |
| `feedback` | How Claude should approach work — corrections and confirmations | "Don't mock the DB in tests" |
| `project` | Ongoing work, decisions, deadlines | "Merge freeze after 2026-03-05" |
| `reference` | Where to find things externally | "Bugs in Linear project INGEST" |

---

## Memory File Format

```markdown
---
name: testing approach
description: How to handle test setup in this project
type: feedback
---

Always use real database connections in integration tests, never mocks.

**Why:** Mocked tests passed while prod migration failed (Q4 2025 incident).

**How to apply:** When writing or reviewing any test that touches the DB layer.
```

The `description` field is what determines if a memory is loaded — be specific enough that Claude can judge relevance.

---

## Commands

```
/memory          # Open memory index in your editor
```

Or ask Claude directly:
- `"Remember that I prefer small focused PRs"`
- `"Remember that we deploy to staging every Friday"`
- `"Forget what you saved about my role"`
- `"What do you remember about this project?"`

---

## What NOT to Store

Don't save things that are derivable from the codebase or other tools:

| Don't save | Use instead |
|------------|-------------|
| Code patterns, conventions | Read from code / CLAUDE.md |
| Git history, who changed what | `git log`, `git blame` |
| Debugging solutions | The fix is in the code |
| Anything already in CLAUDE.md | It's already loaded |
| In-progress task tracking | Tasks (TodoWrite tool) |

---

## Tips

- Memory is written automatically when Claude learns something significant about you or the project
- Explicitly ask Claude to save things when you want to ensure they persist
- Memories decay in relevance — outdated memories can be corrected by telling Claude the current state
- For tracking in-session work, use tasks (`/todo`), not memory
- CLAUDE.md is separate from memory — it's a project file, not personal memory
