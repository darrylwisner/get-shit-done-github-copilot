<purpose>
Curate spike experiment findings and package them into a persistent project skill for future
build conversations. Reads from `.planning/spikes/`, writes skill to `./.claude/skills/spike-findings-[project]/`
(project-local) and summary to `.planning/spikes/WRAP-UP-SUMMARY.md`.
Companion to `/gsd-spike`.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="banner">
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SPIKE WRAP-UP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
</step>

<step name="gather">
## Gather Spike Inventory

1. Read `.planning/spikes/MANIFEST.md` for the overall idea context
2. Glob `.planning/spikes/*/README.md` and parse YAML frontmatter from each
3. Check if `./.claude/skills/spike-findings-*/SKILL.md` exists for this project
   - If yes: read its `processed_spikes` list from the metadata section and filter those out
   - If no: all spikes are candidates

If no unprocessed spikes exist:
```
No unprocessed spikes found in `.planning/spikes/`.
Run `/gsd-spike` first to create experiments.
```
Exit.

Check `commit_docs` config:
```bash
COMMIT_DOCS=$(gsd-sdk query config-get commit_docs 2>/dev/null || echo "true")
```
</step>

<step name="auto_include">
## Auto-Include All Spikes

Include all unprocessed spikes automatically. Present a brief inventory showing what's being processed:

```
Processing N spikes:
  001 — name (VALIDATED)
  002 — name (PARTIAL)
  003 — name (INVALIDATED)
```

Every spike carries forward:
- **VALIDATED** spikes provide proven patterns
- **PARTIAL** spikes provide constrained patterns
- **INVALIDATED** spikes provide landmines and dead ends
</step>

<step name="group">
## Auto-Group by Feature Area

Group spikes by feature area based on tags, names, `related` fields, and content. Proceed directly into synthesis.

Each group becomes one reference file in the generated skill.
</step>

<step name="skill_name">
## Determine Output Skill Name

Derive the skill name from the project directory:

1. Get the project root directory name (e.g., `solana-tracker`)
2. The skill will be created at `./.claude/skills/spike-findings-[project-dir-name]/`

If a skill already exists at that path (append mode), update in place.
</step>

<step name="copy_sources">
## Copy Source Files

For each included spike:

1. Identify the core source files — the actual scripts, main files, and config that make the spike work. Exclude:
   - `node_modules/`, `__pycache__/`, `.venv/`, build artifacts
   - Lock files (`package-lock.json`, `yarn.lock`, etc.)
   - `.git/`, `.DS_Store`
2. Copy the README.md and core source files into `sources/NNN-spike-name/` inside the generated skill directory
</step>

<step name="synthesize">
## Synthesize Reference Files

For each feature-area group, write a reference file at `references/[feature-area-name].md`:

```markdown
# [Feature Area Name]

## Validated Patterns
[For each validated finding: describe the approach that works, include key code snippets extracted from the spike source, explain why it works]

## Landmines
[Things that look right but aren't. Gotchas. Anti-patterns discovered during spiking.]

## Constraints
[Hard facts: rate limits, library limitations, version requirements, incompatibilities]

## Origin
Synthesized from spikes: NNN, NNN, NNN
Source files available in: sources/NNN-spike-name/, sources/NNN-spike-name/
```
</step>

<step name="write_skill">
## Write SKILL.md

Create (or update) the generated skill's SKILL.md:

```markdown
---
name: spike-findings-[project-dir-name]
description: Validated patterns, constraints, and implementation knowledge from spike experiments. Auto-loaded during implementation work on [project-dir-name].
---

<context>
## Project: [project-dir-name]

[One paragraph from MANIFEST.md describing the overall idea]

Spike sessions wrapped: [date(s)]
</context>

<findings_index>
## Feature Areas

| Area | Reference | Key Finding |
|------|-----------|-------------|
| [Name] | references/[name].md | [One-line summary] |

## Source Files

Original spike source files are preserved in `sources/` for complete reference.
</findings_index>

<metadata>
## Processed Spikes

[List of spike numbers wrapped up]

- 001-spike-name
- 002-spike-name
</metadata>
```
</step>

<step name="write_summary">
## Write Planning Summary

Write `.planning/spikes/WRAP-UP-SUMMARY.md` for project history:

```markdown
# Spike Wrap-Up Summary

**Date:** [date]
**Spikes processed:** [count]
**Feature areas:** [list]
**Skill output:** `./.claude/skills/spike-findings-[project]/`

## Processed Spikes
| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|

## Key Findings
[consolidated findings summary]
```
</step>

<step name="update_claude_md">
## Update Project CLAUDE.md

Add an auto-load routing line to the project's CLAUDE.md (create the file if it doesn't exist):

```
- **Spike findings for [project]** (implementation patterns, constraints, gotchas) → `Skill("spike-findings-[project-dir-name]")`
```

If this routing line already exists (append mode), leave it as-is.
</step>

<step name="commit">
Commit all artifacts (if `COMMIT_DOCS` is true):

```bash
gsd-sdk query commit "docs(spike-wrap-up): package [N] spike findings into project skill" .planning/spikes/WRAP-UP-SUMMARY.md
```
</step>

<step name="report">
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SPIKE WRAP-UP COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Processed:** {N} spikes
**Feature areas:** {list}
**Skill:** `./.claude/skills/spike-findings-[project]/`
**Summary:** `.planning/spikes/WRAP-UP-SUMMARY.md`
**CLAUDE.md:** routing line added

The spike-findings skill will auto-load in future build conversations.
```
</step>

<step name="whats_next">
## What's Next — Intelligent Spike Routing

Analyze the full spike landscape (MANIFEST.md, all curated findings, feature-area groupings, validated/invalidated/partial verdicts) and present three categories of next-step options:

### Category A: Integration Spikes — "Do any validated spikes need to be tested together?"

Review every pair and cluster of VALIDATED spikes. Look for:

- **Shared resources:** Two spikes that both touch the same API, database, state, or data format but were tested independently. Will they conflict, race, or step on each other?
- **Data handoffs:** Spike A produces output that Spike B consumes. The formats were assumed compatible but never proven.
- **Timing/ordering:** Spikes that work in isolation but have sequencing dependencies in the real flow (e.g., auth must complete before streaming starts).
- **Resource contention:** Spikes that individually work but may compete for connections, memory, rate limits, or tokens when combined.

If integration risks exist, present them as concrete proposed spikes:

> **Integration spike candidates:**
> - "Spikes 001 + 003 together: streaming through the authenticated connection" — these were tested separately but the real app needs both at once
> - "Spikes 002 + 005 data handoff: does the parser output match what the renderer expects?"

If no meaningful integration risks exist, say so and skip this category.

### Category B: Frontier Spikes — "What else should we spike?"

Think laterally about the overall idea from MANIFEST.md and what's been proven so far. Consider:

- **Gaps in the vision:** What does the user's idea need that hasn't been spiked yet? Look at the MANIFEST.md idea description and identify capabilities that are assumed but unproven.
- **Discovered dependencies:** Findings from completed spikes that reveal new questions. A spike that validated "X works" may imply "but we'd also need Y" — surface those implied needs.
- **Alternative approaches:** If any spike was PARTIAL or INVALIDATED, suggest a different angle to achieve the same goal.
- **Adjacent capabilities:** Things that aren't strictly required but would meaningfully improve the idea if feasible — worth a quick spike to find out.
- **Comparison opportunities:** If a spike used one library/approach and it worked but felt heavy or awkward, suggest a comparison spike with an alternative.

Present frontier spikes as concrete proposals with names, validation questions (Given/When/Then), and risk-ordering:

> **Frontier spike candidates:**
> 1. `NNN-descriptive-name` — Given [X], when [Y], then [Z]. *Why now: [reason this is the logical next thing to explore]*
> 2. `NNN-descriptive-name` — Given [X], when [Y], then [Z]. *Why now: [reason]*

Number them continuing from the highest existing spike number.

### Category C: Standard Options

- `/gsd-plan-phase` — Start planning the real implementation
- `/gsd-add-phase` — Add a phase based on spike findings
- `/gsd-spike` — Spike additional ideas
- `/gsd-explore` — Continue exploring
- Other

### Presenting the Options

Present all applicable categories, then ask the user which direction to go. If the user picks a frontier or integration spike, write the spike definitions directly into `.planning/spikes/MANIFEST.md` (appending to the existing table) and kick off `/gsd-spike` with those spikes pre-defined — the user shouldn't have to re-describe what was just proposed.
</step>

</process>

<success_criteria>
- [ ] All unprocessed spikes auto-included and processed
- [ ] Spikes grouped by feature area
- [ ] Spike-findings skill exists at `./.claude/skills/` with SKILL.md, references/, sources/
- [ ] Core source files from all spikes copied into sources/
- [ ] Reference files contain validated patterns, code snippets, landmines, constraints
- [ ] `.planning/spikes/WRAP-UP-SUMMARY.md` written for project history
- [ ] Project CLAUDE.md has auto-load routing line
- [ ] Summary presented
- [ ] Intelligent next-step analysis presented with integration spike candidates, frontier spike candidates, and standard options
</success_criteria>
