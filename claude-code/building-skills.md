# Building Skills for Claude

Skills are folders with instructions that teach Claude repeatable workflows. Write once, use in every conversation — no re-explaining your process each time.

**Works across:** Claude.ai, Claude Code, and API without modification.

---

## Anatomy of a Skill

```
my-skill/
├── SKILL.md          ← required, exact name (case-sensitive)
├── scripts/          ← optional: Python, Bash, etc.
├── references/       ← optional: docs Claude loads on demand
└── assets/           ← optional: templates, icons
```

**Critical naming rules:**
- Folder: `kebab-case` only — no spaces, no capitals, no underscores
- File: must be exactly `SKILL.md` — not `skill.md`, not `SKILL.MD`
- No `README.md` inside the skill folder (breaks parsing)
- Skill name cannot start with `claude` or `anthropic` (reserved)

---

## SKILL.md Structure

```markdown
---
name: my-skill-name
description: What it does. Use when user asks to [phrases].
---

# Skill Name

## Step 1: First step
Clear instructions...

## Examples
"User says X" → do Y

## Troubleshooting
Error: ... → Fix: ...
```

---

## The Frontmatter (Most Important Part)

The YAML block is loaded into Claude's system prompt **for every conversation**. Everything else is only loaded when the skill triggers. This is how Claude decides whether your skill is relevant — get this right.

### Required fields

```yaml
---
name: my-skill-name
description: Analyzes Figma files and generates developer docs. Use when user uploads .fig files or asks for "design specs", "component documentation", or "design handoff".
---
```

### Optional fields

```yaml
---
name: my-skill-name
description: ...
license: MIT
allowed-tools: "Bash(python:*) Bash(npm:*) WebFetch"
metadata:
  author: Your Name
  version: 1.0.0
  mcp-server: your-server-name
---
```

> **Security:** No XML angle brackets (`< >`) anywhere in frontmatter. YAML is parsed safely but `<>` will cause rejection.

### Writing the description (make or break)

The description must answer **what** it does AND **when** to use it. Without both, Claude won't trigger it reliably.

| | Example |
|--|---------|
| **Too vague** | `Helps with projects.` |
| **Missing triggers** | `Creates sophisticated multi-page documentation.` |
| **Good** | `Manages Linear sprint workflows. Use when user mentions "sprint", "Linear tasks", "create tickets", or asks to plan a project.` |
| **Good** | `End-to-end PayFlow onboarding. Use when user says "onboard new customer", "set up subscription", or "create PayFlow account".` |

Max 1024 characters. Include phrases users would actually say — including typos and synonyms they might use.

---

## Progressive Disclosure (How Loading Works)

Claude loads skill content in three levels:

| Level | What | When loaded |
|-------|------|-------------|
| 1 — Frontmatter | name + description | Always, every conversation |
| 2 — SKILL.md body | Full instructions | When skill is triggered |
| 3 — Linked files | `references/`, `assets/` | On demand, as Claude needs them |

**Implication:** Keep SKILL.md focused and under ~5,000 words. Move detailed reference docs to `references/` and link to them.

---

## Writing Instructions That Work

**Be specific and actionable:**

```markdown
# Good
Run `python scripts/validate.py --input {filename}`.
If validation fails, common causes:
- Missing required fields (add them to the CSV)
- Invalid date format (use YYYY-MM-DD)

# Bad
Validate the data before proceeding.
```

**For critical steps, add explicit guards:**

```markdown
# CRITICAL: Before calling create_project, verify:
- Project name is non-empty
- At least one team member assigned
- Start date is not in the past
```

**For non-obvious logic, use scripts** — code is deterministic, language instructions aren't. Put checks in `scripts/validate.py` rather than relying on Claude interpreting "make sure X is valid".

---

## Skill Categories

### Category 1: Document & Asset Creation
Consistent output — docs, designs, code, presentations.

Techniques:
- Embedded style guides and templates
- Quality checklist before finalizing
- No external tools needed — uses Claude's built-in capabilities

### Category 2: Workflow Automation
Multi-step processes with consistent methodology.

Techniques:
- Step-by-step with validation gates between steps
- Templates for common structures
- Iterative refinement loops

### Category 3: MCP Enhancement
Workflow layer on top of an MCP server's raw tool access.

Techniques:
- Sequences of MCP calls in the right order
- Domain expertise embedded (e.g., compliance checks before actions)
- Error handling for common MCP failures

---

## Workflow Patterns

### Sequential orchestration
For multi-step processes with a fixed order:

```markdown
## Step 1: Create Account
Call MCP tool: `create_customer` — params: name, email, company

## Step 2: Setup Payment
Call MCP tool: `setup_payment_method`
Wait for: payment verification success before continuing

## Step 3: Create Subscription
Call MCP tool: `create_subscription` — use customer_id from Step 1
```

### Multi-MCP coordination
When workflow spans multiple services:

```markdown
## Phase 1: Export (Figma MCP)
Fetch design assets, generate specs

## Phase 2: Storage (Drive MCP)
Create folder, upload assets, generate links

## Phase 3: Tasks (Linear MCP)
Create dev tasks with asset links attached

## Phase 4: Notify (Slack MCP)
Post handoff summary to #engineering
```

### Iterative refinement
For quality-sensitive output:

```markdown
## Draft → Validate → Refine loop
1. Generate draft
2. Run `scripts/check_quality.py`
3. Fix identified issues
4. Re-validate
5. Repeat until passing, then finalize
```

---

## Testing

**Fast approach:** iterate on one hard task until it works, then extract the winning approach into the skill. More signal than broad testing.

### 1. Trigger tests

```
Should trigger:
- "Help me set up a new ProjectHub workspace"
- "I need to create a project in ProjectHub"
- "Initialize a ProjectHub project for Q4 planning"

Should NOT trigger:
- "What's the weather today?"
- "Help me write Python code"
```

### 2. Functional tests
- Outputs are correct and consistent
- API calls succeed (0 failures per run)
- Edge cases handled without user correction

### 3. Baseline comparison
Run the same task with/without the skill. Measure: messages back-and-forth, token usage, failed API calls, user corrections needed.

---

## Installing Skills

**Claude Code** — place the skill folder in:
```
~/.claude/skills/my-skill/SKILL.md
```

**Claude.ai** — Settings → Capabilities → Skills → Upload (zipped folder).

**Invoke explicitly:** `/my-skill-name`
**Auto-triggered:** Claude reads the description and loads it when relevant.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Won't upload — "Could not find SKILL.md" | Wrong filename casing | Rename to exactly `SKILL.md` |
| Won't upload — "Invalid frontmatter" | Missing `---` delimiters or unclosed quotes | Fix YAML syntax |
| Won't upload — "Invalid skill name" | Spaces or capitals in `name` | Use `kebab-case` |
| Never triggers | Description too vague | Add specific trigger phrases users actually say |
| Triggers too often | Description too broad | Add negative triggers: `Do NOT use for X (use Y skill instead)` |
| MCP calls fail | Server not connected or wrong tool name | Test MCP independently first: "use X MCP to fetch my projects" |
| Instructions ignored | Too verbose, critical info buried | Move details to `references/`, put critical rules at top with `# CRITICAL:` |
| Slow / degraded responses | Too many skills, SKILL.md too large | Keep SKILL.md under 5k words; limit enabled skills to 20-50 |

**Debugging trigger:** Ask Claude directly: `"When would you use the [skill name] skill?"` — it will quote the description back, showing you what's missing.

---

## Pre-Upload Checklist

```
Folder
  [ ] kebab-case name, no spaces or capitals
  [ ] No README.md inside the folder

Frontmatter
  [ ] --- delimiters present (open and close)
  [ ] name: kebab-case
  [ ] description: includes WHAT + WHEN + trigger phrases
  [ ] No < > anywhere in frontmatter

Instructions
  [ ] Steps are specific and actionable (not "validate properly")
  [ ] Error handling included
  [ ] Examples included
  [ ] Critical checks use scripts, not language instructions

Testing
  [ ] Triggers on obvious queries
  [ ] Triggers on paraphrased queries
  [ ] Does NOT trigger on unrelated queries
```

---

## Skills + MCP

MCP gives Claude access to tools. Skills teach Claude *how* to use them well.

| MCP | Skills |
|-----|--------|
| Connects Claude to your service | Teaches Claude your workflows |
| What Claude can do | How Claude should do it |
| Raw tool access | Embedded best practices |

Without skills, MCP users face a blank canvas. Skills give them a workflow on day one — reducing support tickets and inconsistent results.