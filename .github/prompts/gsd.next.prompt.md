---
name: gsd.next
description: "Automatically advance to the next logical step in the GSD workflow"
tools: ['execute', 'read', 'search']
agent: agent
---

<!-- upstream-tools: ["Read","Bash","Grep","Glob","SlashCommand"] -->
<!-- omitted-tools: ["slashcommand"] — no Copilot equivalent found -->

## Path Resolution 

  The GSD workflow files contain bash commands that reference `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs`. 
  **In this workspace, the module lives at `.claude/get-shit-done/bin/gsd-tools.cjs` relative to the workspace root — `$HOME` does not apply.
  ** When executing or interpreting any bash snippet from a workflow file, mentally substitute `$HOME/.claude/` → `.claude/` (workspace-relative).
  ---

<objective>
Detect the current project state and automatically invoke the next logical GSD workflow step.
No arguments needed — reads STATE.md, ROADMAP.md, and phase directories to determine what comes next.

Designed for rapid multi-project workflows where remembering which phase/step you're on is overhead.

Supports `--force` flag to bypass safety gates (checkpoint, error state, verification failures).
</objective>

<execution_context>
- Read file at: ./.claude/get-shit-done/workflows/next.md
</execution_context>

<process>
Execute the next workflow from @./.claude/get-shit-done/workflows/next.md end-to-end.
</process>
