---
name: gsd.stats
description: "Display project statistics — phases, plans, requirements, git metrics, and timeline"
tools: ['execute', 'read']
agent: agent
---

<!-- upstream-tools: ["Read","Bash"] -->

## Path Resolution 

  The GSD workflow files contain bash commands that reference `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs`. 
  **In this workspace, the module lives at `.claude/get-shit-done/bin/gsd-tools.cjs` relative to the workspace root — `$HOME` does not apply.
  ** When executing or interpreting any bash snippet from a workflow file, mentally substitute `$HOME/.claude/` → `.claude/` (workspace-relative).
  ---

<objective>
Display comprehensive project statistics including phase progress, plan execution metrics, requirements completion, git history stats, and project timeline.
</objective>

<execution_context>
- Read file at: ./.claude/get-shit-done/workflows/stats.md
</execution_context>

<process>
Execute the stats workflow from @./.claude/get-shit-done/workflows/stats.md end-to-end.
</process>
