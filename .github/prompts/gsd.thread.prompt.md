---
name: gsd.thread
description: "Manage persistent context threads for cross-session work"
argument-hint: "[list [--open | --resolved] | close <slug> | status <slug> | name | description]"
tools: ['edit', 'execute', 'read']
agent: agent
---

<!-- upstream-tools: ["Read","Write","Bash"] -->

## Path Resolution 

  The GSD workflow files contain bash commands that reference `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs`. 
  **In this workspace, the module lives at `.claude/get-shit-done/bin/gsd-tools.cjs` relative to the workspace root — `$HOME` does not apply.
  ** When executing or interpreting any bash snippet from a workflow file, mentally substitute `$HOME/.claude/` → `.claude/` (workspace-relative).
  ---

<objective>
Create, list, close, or resume persistent context threads. Threads are lightweight
cross-session knowledge stores for work that spans multiple sessions but
doesn't belong to any specific phase.
</objective>

<execution_context>
- Read file at: ./.claude/get-shit-done/workflows/thread.md
</execution_context>

<process>
Execute end-to-end.
</process>
