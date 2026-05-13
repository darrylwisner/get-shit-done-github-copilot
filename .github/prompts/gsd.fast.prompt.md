---
name: gsd.fast
description: "Execute a trivial task inline — no subagents, no planning overhead"
argument-hint: "[task description]"
tools: ['edit', 'execute', 'read', 'search']
agent: agent
---

<!-- upstream-tools: ["Read","Write","Edit","Bash","Grep","Glob"] -->

## Path Resolution 

  The GSD workflow files contain bash commands that reference `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs`. 
  **In this workspace, the module lives at `.claude/get-shit-done/bin/gsd-tools.cjs` relative to the workspace root — `$HOME` does not apply.
  ** When executing or interpreting any bash snippet from a workflow file, mentally substitute `$HOME/.claude/` → `.claude/` (workspace-relative).
  ---

<objective>
Execute a trivial task directly in the current context without spawning subagents
or generating PLAN.md files. For tasks too small to justify planning overhead:
typo fixes, config changes, small refactors, forgotten commits, simple additions.

This is NOT a replacement for /gsd-quick — use /gsd-quick for anything that
needs research, multi-step planning, or verification. /gsd-fast is for tasks
you could describe in one sentence and execute in under 2 minutes.
</objective>

<execution_context>
- Read file at: ./.claude/get-shit-done/workflows/fast.md
</execution_context>

<process>
Execute end-to-end.
</process>
