---
name: gsd.review
description: "Request cross-AI peer review of phase plans from external AI CLIs"
argument-hint: "--phase N [--gemini] [--claude] [--codex] [--opencode] [--all]"
tools: ['edit', 'execute', 'read', 'search']
agent: agent
---

<!-- upstream-tools: ["Read","Write","Bash","Glob","Grep"] -->

## Path Resolution 

  The GSD workflow files contain bash commands that reference `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs`. 
  **In this workspace, the module lives at `.claude/get-shit-done/bin/gsd-tools.cjs` relative to the workspace root — `$HOME` does not apply.
  ** When executing or interpreting any bash snippet from a workflow file, mentally substitute `$HOME/.claude/` → `.claude/` (workspace-relative).
  ---

<objective>
Invoke external AI CLIs (Gemini, Claude, Codex, OpenCode) to independently review phase plans.
Produces a structured REVIEWS.md with per-reviewer feedback that can be fed back into
planning via /gsd:plan-phase --reviews.

**Flow:** Detect CLIs → Build review prompt → Invoke each CLI → Collect responses → Write REVIEWS.md
</objective>

<execution_context>
- Read file at: ./.claude/get-shit-done/workflows/review.md
</execution_context>

<context>
Phase number: extracted from $ARGUMENTS (required)

**Flags:**
- `--gemini` — Include Gemini CLI review
- `--claude` — Include Claude CLI review (uses separate session)
- `--codex` — Include Codex CLI review
- `--opencode` — Include OpenCode review (uses model from user's OpenCode config)
- `--all` — Include all available CLIs
</context>

<process>
Execute the review workflow from @./.claude/get-shit-done/workflows/review.md end-to-end.
</process>
