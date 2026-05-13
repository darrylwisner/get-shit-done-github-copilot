---
name: gsd.health
description: "Diagnose planning directory health and optionally repair issues"
argument-hint: "[--repair] [--context]"
tools: ['edit', 'execute', 'read', 'vscode/askQuestions']
agent: agent
---

<!-- upstream-tools: ["Read","Bash","Write","AskUserQuestion"] -->

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
Validate `.planning/` directory integrity and report actionable issues. Checks for missing files, invalid configurations, inconsistent state, and orphaned plans.

`--context` runs an orthogonal check: the running session's context utilization. The workflow asks for the model's tokensUsed + contextWindow, calls `gsd-sdk query validate.context`, and renders one of three states:

| Utilization | State    | Action                                                |
|-------------|----------|-------------------------------------------------------|
| < 60%       | healthy  | no action — context is comfortable                    |
| 60% – 70%   | warning  | recommend `/gsd-thread` to start fresh                |
| ≥ 70%       | critical | reasoning quality may degrade past the fracture point |
</objective>

<execution_context>
- Read file at: ./.claude/get-shit-done/workflows/health.md
</execution_context>

<process>
Execute end-to-end.
Parse `--repair` and `--context` flags from arguments and pass to workflow.
</process>
