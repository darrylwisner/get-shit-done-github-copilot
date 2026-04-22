---
name: gsd.spike
description: "Spike an idea through experiential exploration, or propose what to spike next (frontier mode)"
argument-hint: "[idea to validate] [--quick] [--text] or [frontier]"
tools: ['edit', 'execute', 'mcp__context7__query-docs', 'mcp__context7__resolve-library-id', 'read', 'search', 'vscode/askQuestions', 'web']
agent: agent
---

<!-- upstream-tools: ["Read","Write","Edit","Bash","Grep","Glob","AskUserQuestion","WebSearch","WebFetch","mcp__context7__resolve-library-id","mcp__context7__query-docs"] -->

## Path Resolution 

  The GSD workflow files contain bash commands that reference `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs`. 
  **In this workspace, the module lives at `.claude/get-shit-done/bin/gsd-tools.cjs` relative to the workspace root — `$HOME` does not apply.
  ** When executing or interpreting any bash snippet from a workflow file, mentally substitute `$HOME/.claude/` → `.claude/` (workspace-relative).
  ---

## Copilot Runtime Adapter (important)

Upstream GSD command sources may reference an `AskUserQuestion` tool (Claude/OpenCode runtime concept).

In VS Code Copilot, **do not attempt to call a tool named `AskUserQuestion`**.
Instead, whenever the upstream instructions say "Use AskUserQuestion", use **#tool:vscode/askQuestions** with:

- Combine the **Header** and **Question** into a single clear question string.
- If the upstream instruction specifies **Options**, present them as numbered choices.
- If no options are specified, ask as a freeform question.

**Rules:**
1. If the options include "Other", "Something else", or "Let me explain", and the user selects it, follow up with a freeform question via #tool:vscode/askQuestions.
2. Follow the upstream branching and loop rules exactly as written (e.g., "if X selected, do Y; otherwise continue").
3. If the upstream flow says to **exit/stop** and run another command, tell the user to run that slash command next, then stop.
4. Use #tool:vscode/askQuestions freely — do not guess or assume user intent.

---

<objective>
Spike an idea through experiential exploration — build focused experiments to feel the pieces
of a future app, validate feasibility, and produce verified knowledge for the real build.
Spikes live in `.planning/spikes/` and integrate with GSD commit patterns, state tracking,
and handoff workflows.

Two modes:
- **Idea mode** (default) — describe an idea to spike
- **Frontier mode** (no argument or "frontier") — analyzes existing spike landscape and proposes integration and frontier spikes

Does not require `/gsd:new-project` — auto-creates `.planning/spikes/` if needed.
</objective>

<execution_context>
- Read file at: ./.claude/get-shit-done/workflows/spike.md
- Read file at: ./.claude/get-shit-done/references/ui-brand.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`.
</runtime_note>

<context>
Idea: $ARGUMENTS

**Available flags:**
- `--quick` — Skip decomposition/alignment, jump straight to building. Use when you already know what to spike.
- `--text` — Use plain-text numbered lists instead of AskUserQuestion (for non-Claude runtimes).
</context>

<process>
Execute the spike workflow from @./.claude/get-shit-done/workflows/spike.md end-to-end.
Preserve all workflow gates (prior spike check, decomposition, research, risk ordering, observability assessment, verification, MANIFEST updates, commit patterns).
</process>
