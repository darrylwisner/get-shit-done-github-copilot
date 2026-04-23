---
name: gsd.settings-advanced
description: "Power-user configuration — plan bounce, timeouts, branch templates, cross-AI execution, runtime knobs"
tools: ['edit', 'execute', 'read', 'vscode/askQuestions']
agent: agent
---

<!-- upstream-tools: ["Read","Write","Bash","AskUserQuestion"] -->

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
Interactive configuration of GSD power-user knobs that don't belong in the common-case `/gsd:settings` prompt.

Routes to the settings-advanced workflow which handles:
- Config existence ensuring (workstream-aware path resolution)
- Current settings reading and parsing
- Sectioned prompts: Planning Tuning, Execution Tuning, Discussion Tuning, Cross-AI Execution, Git Customization, Runtime / Output
- Config merging that preserves every unrelated key
- Confirmation table display

Use `/gsd:settings` for the common-case toggles (model profile, research/plan_check/verifier, branching strategy, context warnings). Use `/gsd:settings-advanced` once those are set and you want to tune the internals.
</objective>

<execution_context>
- Read file at: ./.claude/get-shit-done/workflows/settings-advanced.md
</execution_context>

<process>
**Follow the settings-advanced workflow** from `@./.claude/get-shit-done/workflows/settings-advanced.md`.

The workflow handles all logic including:
1. Config file creation with defaults if missing (via `gsd-sdk query config-ensure-section`)
2. Current config reading
3. Six sectioned AskUserQuestion batches with current values pre-selected
4. Numeric-input validation (non-numeric rejected, empty input keeps current)
5. Answer parsing and config merging (preserves unrelated keys)
6. File writing (atomic)
7. Confirmation table display
</process>
