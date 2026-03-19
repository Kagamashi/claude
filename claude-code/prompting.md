# Effective Prompting

## Core Rules

**Be specific.** Vague requests produce vague results.
```
✗  "fix the tests"
✓  "fix the failing test in UserService — the sendEmail mock isn't being reset between tests"
```

**Name the files.** Claude will read them.
```
✓  "look at src/auth/middleware.ts and explain how JWT validation works"
✓  "update config/database.yml to add connection pooling"
```

**State constraints upfront.**
```
✓  "don't change the public API — only change the internal implementation"
✓  "make minimal changes, don't refactor surrounding code"
✓  "don't add error handling, comments, or tests unless I ask"
```

---

## Modes

### Plan Mode (`Shift+Tab`)
Claude describes its plan and waits for approval before doing anything.

Use it for:
- Multi-file refactors
- Database migrations
- Anything hard to undo
- When you're unsure what Claude will touch

### Auto-approve Mode (`Shift+Tab` twice)
Claude executes without asking for tool confirmations.

Use it for:
- Trusted, repetitive tasks
- Scripted workflows

### Print Mode (`claude -p "..."`)
Non-interactive. No confirmations. Exits after one response.

Use it for:
- Scripting and pipelines
- `cat file.ts | claude -p "explain this"`

---

## Context Management

### CLAUDE.md First
For any project you work in regularly, create a CLAUDE.md with:
- How to run/test/lint
- Key architecture decisions
- Conventions to follow
- What NOT to do

This is more reliable than re-explaining every session.

### When to `/compact`
Use `/compact` when:
- Responses start feeling repetitive or confused
- You've finished one task and starting another
- The session has been running a long time

```
/compact
/compact focus on the payment module, ignore the user auth work we did earlier
```

### When to `/clear`
When you want a completely fresh context. Claude reloads CLAUDE.md but forgets the conversation. Use when switching to an unrelated task.

### Feeding Context Efficiently

```bash
# Pipe content directly
cat error.log | claude -p "what's causing this?"

# Reference a URL
claude "read the API docs at https://... and write a TypeScript client"

# Multiple files
claude -p "explain the relationship between these two files" \
  --context src/models/user.ts \
  --context src/services/auth.ts
```

---

## Prompting Patterns

### Explore Before Acting
```
Read src/payment/ and explain how the payment flow works.
Don't make any changes yet.
```

### Constraint-Driven
```
Refactor parseUser() to be more readable.
Do not change the function signature, return type, or behavior.
```

### Step-by-Step for Complex Tasks
```
Let's do this in steps:
1. First read the test suite and tell me what coverage is missing
2. Wait for my confirmation
3. Then add the missing tests one file at a time
```

### Debug with Full Context
```
This crash happens when a user logs out while an upload is in progress.
Relevant files: src/upload/manager.ts, src/auth/session.ts
Stack trace: [paste]
What's the root cause?
```

### Review Before Act
```
Before making any changes, describe exactly what you'll modify and why.
Wait for me to say "go ahead".
```

---

## Common Failure Modes and Fixes

| Problem | Fix |
|---------|-----|
| Claude modifies the wrong files | Name exact files to touch and not touch |
| Too much refactoring beyond the ask | Add: "make minimal changes, only fix what's necessary" |
| Claude doesn't follow project conventions | Add conventions to CLAUDE.md |
| Confused context, wrong assumptions | `/compact` or `/clear` and start fresh |
| Keeps adding unwanted boilerplate | Add to CLAUDE.md: "don't add comments/docstrings/types to code you didn't change" |
| Proposes changes without reading first | "Read the file first, then tell me your plan" |
