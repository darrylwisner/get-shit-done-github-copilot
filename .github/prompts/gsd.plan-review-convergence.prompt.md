---
name: gsd.plan-review-convergence
description: "Cross-AI plan convergence loop — replan with review feedback until no HIGH concerns remain (max 3 cycles)"
argument-hint: "<phase> [--codex] [--gemini] [--claude] [--opencode] [--text] [--ws <name>] [--all] [--max-cycles N]"
tools: ['edit', 'execute', 'read', 'search', 'vscode/askQuestions']
agent: agent
---

<!-- upstream-tools: ["Read","Write","Bash","Glob","Grep","Agent","AskUserQuestion"] -->
<!-- omitted-tools: ["agent"] — no Copilot equivalent found -->

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
Cross-AI plan convergence loop — an outer revision gate around gsd-review and gsd-planner.
Repeatedly: review plans with external AI CLIs → if HIGH concerns found → replan with --reviews feedback → re-review. Stops when no HIGH concerns remain or max cycles reached.

**Flow:** Agent→Skill("gsd-plan-phase") → Agent→Skill("gsd-review") → check HIGHs → Agent→Skill("gsd-plan-phase --reviews") → Agent→Skill("gsd-review") → ... → Converge or escalate

Replaces gsd-plan-phase's internal gsd-plan-checker with external AI reviewers (codex, gemini, etc.). Each step runs inside an isolated Agent that calls the corresponding existing Skill — orchestrator only does loop control.

**Orchestrator role:** Parse arguments, validate phase, spawn Agents for existing Skills, check HIGHs, stall detection, escalation gate.
</objective>

<execution_context>
- Read file at: $HOME./.claude/get-shit-done/workflows/plan-review-convergence.md
- Read file at: $HOME./.claude/get-shit-done/references/revision-loop.md
- Read file at: $HOME./.claude/get-shit-done/references/gates.md
- Read file at: $HOME./.claude/get-shit-done/references/agent-contracts.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent — `vscode_askquestions` is the VS Code Copilot implementation of the same interactive question API. Do not skip questioning steps because `AskUserQuestion` appears unavailable; use `vscode_askquestions` instead.
</runtime_note>

<context>
Phase number: extracted from $ARGUMENTS (required)

**Flags:**
- `--codex` — Use Codex CLI as reviewer (default if no reviewer specified)
- `--gemini` — Use Gemini CLI as reviewer
- `--claude` — Use Claude CLI as reviewer (separate session)
- `--opencode` — Use OpenCode as reviewer
- `--all` — Use all available CLIs
- `--max-cycles N` — Maximum replan→review cycles (default: 3)
</context>

<process>
Execute the plan-review-convergence workflow from @$HOME./.claude/get-shit-done/workflows/plan-review-convergence.md end-to-end.
Preserve all workflow gates (pre-flight, revision loop, stall detection, escalation).
</process>
