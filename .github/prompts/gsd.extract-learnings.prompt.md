---
name: gsd.extract-learnings
description: "Extract decisions, lessons, patterns, and surprises from completed phase artifacts"
argument-hint: "<phase-number>"
tools: ['edit', 'execute', 'read', 'search']
agent: agent
---

<!-- upstream-tools: ["Read","Write","Bash","Grep","Glob","Agent"] -->
<!-- omitted-tools: ["agent"] — no Copilot equivalent found -->

## Path Resolution 

  The GSD workflow files contain bash commands that reference `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs`. 
  **In this workspace, the module lives at `.claude/get-shit-done/bin/gsd-tools.cjs` relative to the workspace root — `$HOME` does not apply.
  ** When executing or interpreting any bash snippet from a workflow file, mentally substitute `$HOME/.claude/` → `.claude/` (workspace-relative).
  ---

<objective>
Extract structured learnings from completed phase artifacts (PLAN.md, SUMMARY.md, VERIFICATION.md, UAT.md, STATE.md) into a LEARNINGS.md file that captures decisions, lessons learned, patterns discovered, and surprises encountered.
</objective>

<execution_context>
- Read file at: ./.claude/get-shit-done/workflows/extract-learnings.md
</execution_context>

Execute the extract-learnings workflow from @./.claude/get-shit-done/workflows/extract-learnings.md end-to-end.
