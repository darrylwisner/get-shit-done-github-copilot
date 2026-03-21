---
name: gsd.list-workspaces
description: "List active GSD workspaces and their status"
tools: ['execute', 'read']
agent: agent
---

<!-- upstream-tools: ["Bash","Read"] -->

## Path Resolution 

  The GSD workflow files contain bash commands that reference `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs`. 
  **In this workspace, the module lives at `.claude/get-shit-done/bin/gsd-tools.cjs` relative to the workspace root — `$HOME` does not apply.
  ** When executing or interpreting any bash snippet from a workflow file, mentally substitute `$HOME/.claude/` → `.claude/` (workspace-relative).
  ---

<objective>
Scan `~/gsd-workspaces/` for workspace directories containing `WORKSPACE.md` manifests. Display a summary table with name, path, repo count, strategy, and GSD project status.
</objective>

<execution_context>
- Read file at: ./.claude/get-shit-done/workflows/list-workspaces.md
- Read file at: ./.claude/get-shit-done/references/ui-brand.md
</execution_context>

<process>
Execute the list-workspaces workflow from @./.claude/get-shit-done/workflows/list-workspaces.md end-to-end.
</process>
