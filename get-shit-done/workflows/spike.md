<purpose>
Rapid feasibility validation through focused, throwaway experiments. Each spike answers one
specific question with observable evidence. Saves artifacts to `.planning/spikes/`.
Companion to `/gsd-spike-wrap-up`.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="banner">
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SPIKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Parse `$ARGUMENTS` for:
- `--quick` flag → set `QUICK_MODE=true`
- `--text` flag → set `TEXT_MODE=true`
- Remaining text → the idea to spike

**Text mode:** If TEXT_MODE is enabled, replace AskUserQuestion calls with plain-text numbered lists — emit the options and ask the user to type the number of their choice.
</step>

<step name="setup_directory">
Create `.planning/spikes/` if it doesn't exist:

```bash
mkdir -p .planning/spikes
```

Check for existing spikes to determine numbering:
```bash
ls -d .planning/spikes/[0-9][0-9][0-9]-* 2>/dev/null | sort | tail -1
```

Check `commit_docs` config:
```bash
COMMIT_DOCS=$(gsd-sdk query config-get commit_docs 2>/dev/null || echo "true")
```
</step>

<step name="detect_stack">
Check for the project's tech stack to inform spike technology choices:

```bash
ls package.json pyproject.toml Cargo.toml go.mod 2>/dev/null
```

Use the project's language/framework by default. For greenfield projects with no existing stack, pick whatever gets to a runnable result fastest (Python, Node, Bash, single HTML file).

Avoid unless the spike specifically requires it:
- Complex package management beyond `npm install` or `pip install`
- Build tools, bundlers, or transpilers
- Docker, containers, or infrastructure
- Env files or config systems — hardcode everything
</step>

<step name="check_prior_spikes">
If `.planning/spikes/MANIFEST.md` exists, read it. Scan the verdicts, names, and validation questions of all prior spikes. When decomposing the new idea, cross-reference against this history:

- **Skip already-validated questions.** If a prior spike proved "WebSocket streaming works" with a VALIDATED verdict, don't re-spike it. Note the prior spike number and move on.
- **Build on prior findings.** If a prior spike was INVALIDATED or PARTIAL, factor that into the new decomposition — don't repeat the same approach, and flag the constraint to the user.
- **Call out relevant prior art.** When presenting the decomposition, mention any prior spikes that overlap: "Spike 003 already validated X, so we can skip that and focus on Y."

If no `.planning/spikes/MANIFEST.md` exists, skip this step.
</step>

<step name="decompose">
**If `QUICK_MODE` is true:** Skip decomposition and alignment. Take the user's idea as a single spike question. Assign it spike number `001` (or next available). Jump to `research`.

**Otherwise:**

Break the idea into 2-5 independent questions that each prove something specific. Frame each as an informal Given/When/Then. Present as a table:

```
| # | Spike | Type | Validates (Given/When/Then) | Risk |
|---|-------|------|-----------------------------|------|
| 001 | websocket-streaming | standard | Given a WS connection, when LLM streams tokens, then client receives chunks < 100ms | **High** |
| 002a | pdf-parse-pdfjs | comparison | Given a multi-page PDF, when parsed with pdfjs, then structured text is extractable | Medium |
| 002b | pdf-parse-camelot | comparison | Given a multi-page PDF, when parsed with camelot, then structured text is extractable | Medium |
```

**Spike types:**
- **standard** — one approach answering one question
- **comparison** — same question, different approaches. Use a shared number with lettered variants: `NNN-a-name` and `NNN-b-name`. Both built back-to-back, then head-to-head comparison.

Good spikes answer one specific feasibility question:
- "Can we parse X format and extract Y?" — script that does it on a sample file
- "How fast is X approach?" — benchmark with real-ish data
- "Can we get X and Y to talk to each other?" — thinnest integration
- "What does X feel like as a UI?" — minimal interactive prototype
- "Does X API actually support Y?" — script that calls it and shows the response
- "Should we use X or Y for this?" — **comparison spike**: same thin proof built with both

Bad spikes are too broad or don't produce observable output:
- "Set up the project" — not a question, just busywork
- "Design the architecture" — planning, not spiking
- "Build the backend" — too broad, no specific question
- "Research best practices" — open-ended reading with no runnable output

Order by risk — the spike most likely to kill the idea runs first.
</step>

<step name="align">
**If `QUICK_MODE` is true:** Skip.

Present the ordered spike list and ask which to build:

╔══════════════════════════════════════════════════════════════╗
║  CHECKPOINT: Decision Required                               ║
╚══════════════════════════════════════════════════════════════╝

{spike table from decompose step}

──────────────────────────────────────────────────────────────
→ Build all in this order, or adjust the list?
──────────────────────────────────────────────────────────────

The user may reorder, merge, split, or skip spikes. Wait for alignment.
</step>

<step name="research">
## Research Before Building

Before writing any spike code, ground each spike in reality. This prevents building against outdated APIs, picking the wrong library, or discovering mid-spike that the approach is impossible.

For each spike about to be built:

**a. Identify unknowns.** What libraries, APIs, protocols, or techniques does this spike depend on? What assumptions are you making about how they work?

**b. Check current docs.** Use context7 (resolve-library-id → query-docs) for any library or framework involved. Use web search for APIs, services, or techniques without a context7 entry. Read actual documentation — not training data, which may be stale.

**c. Validate feasibility before coding.** Specifically check:
- Does the API/library actually support what the spike assumes? (Check endpoints, methods, capabilities)
- What's the current recommended approach? (The "right way" changes — what was learned in training may be deprecated)
- Are there version constraints, breaking changes, or migration gotchas?
- Are there rate limits, auth requirements, or platform restrictions that would block the spike?

**d. Pick the right tool.** If multiple libraries could solve the problem, briefly compare them on: current maintenance status, API fit for the specific spike question, and complexity. Pick the one that gets to a runnable answer fastest with the fewest surprises.

**e. Capture research findings.** Add a `## Research` section to the spike's README (before `## How to Run`) with:
- Which docs were checked and key findings
- The chosen approach and why
- Any gotchas or constraints discovered

**Skip research when unnecessary.** If the spike uses only well-known, stable tools already verified in this session, or if the entire spike is pure logic with no external dependencies, skip this step. The goal is grounding in reality, not busywork.
</step>

<step name="create_manifest">
Create or update `.planning/spikes/MANIFEST.md`:

```markdown
# Spike Manifest

## Idea
[One paragraph describing the overall idea being explored]

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | websocket-streaming | standard | WS connections can stream LLM output | VALIDATED | websocket, real-time |
| 002a | pdf-parse-pdfjs | comparison | PDF table extraction | WINNER | pdf, parsing |
| 002b | pdf-parse-camelot | comparison | PDF table extraction | — | pdf, parsing |
```

If MANIFEST.md already exists, append new spikes to the existing table.
</step>

<step name="build_spikes">
Build each spike sequentially, highest-risk first.

**Comparison spikes** use a shared number with lettered variants: `NNN-a-descriptive-name` and `NNN-b-descriptive-name`. Both answer the same question using different approaches. Build them back-to-back, then report a head-to-head comparison before moving on. Judge on criteria that matter for the real build: API ergonomics, output quality, complexity, performance, or whatever the user cares about. The comparison spike's verdict names the winner and why.

### For Each Spike:

**a.** Find next available number by checking existing `.planning/spikes/NNN-*/` directories.
Format: three-digit zero-padded + hyphenated descriptive name. Comparison spikes: same number with letter suffix — `002a-pdf-parse-pdfjs`, `002b-pdf-parse-camelot`.

**b.** Create the spike directory: `.planning/spikes/NNN-descriptive-name/`

**c.** Assess observability needs before writing code. Ask: **can Claude fully verify this spike's outcome by running a command and reading stdout, or does it require human interaction with a runtime?**

Spikes that need runtime observability:
- **UI spikes** — anything with a browser, clicks, visual feedback
- **Streaming spikes** — WebSockets, SSE, real-time data flow
- **Multi-process spikes** — client/server, IPC, subprocess orchestration
- **Timing-sensitive spikes** — race conditions, debounce, polling, reconnection
- **External API spikes** — where the API response shape, latency, or error behavior matters for the verdict

Spikes that do NOT need it:
- Pure computation (parse this file, transform this data)
- Single-run scripts with deterministic stdout
- Anything Claude can run and check the output of directly

**If the spike needs runtime observability,** build a forensic log layer into the spike:

1. **An event log array** at module level that captures every meaningful event with an ISO timestamp and a direction/category tag (e.g., `"user_input"`, `"api_response"`, `"sse_frame"`, `"error"`, `"state_change"`)
2. **A log export mechanism** appropriate to the spike's runtime:
   - For server spikes: a `GET /api/export-log` endpoint returning downloadable JSON
   - For CLI spikes: write `spike-log-{timestamp}.json` to the spike directory on exit or on signal
   - For browser spikes: a visible "Export Log" button that triggers a JSON download
3. **A log summary** included in the export: total event counts by category, duration, errors detected, environment metadata
4. **Analysis helpers** if the event volume warrants it: a small script (bash/python) in the spike directory that extracts the signal from the log. Name it `analyze-log.sh` or similar.

Keep the logging lightweight — an array push per event, not a logging framework. Inline it in the spike code.

**d.** Build the minimum code that answers the spike's question (with the observability layer from step c if applicable). Every line must serve the question — nothing incidental.

**e.** Write `README.md` with YAML frontmatter:

```markdown
---
spike: NNN
name: descriptive-name
type: standard
validates: "Given [precondition], when [action], then [expected outcome]"
verdict: PENDING
related: []
tags: [tag1, tag2]
---

# Spike NNN: Descriptive Name

## What This Validates
[The specific feasibility question, framed as Given/When/Then]

## Research
[Docs checked, key findings, chosen approach and why, gotchas discovered. Omit if no external dependencies.]

## How to Run
[Single command or short sequence to run the spike]

## What to Expect
[Concrete observable outcomes: "When you click X, you should see Y within Z seconds"]

## Observability
[If this spike has a forensic log layer: describe what's captured, how to export the log, and how to analyze it. Omit for spikes without runtime observability.]

## Results
[Filled in after running — verdict, evidence, surprises. If a forensic log was exported, include key findings from the log analysis here.]
```

**f.** Auto-link related spikes: read existing spike READMEs and infer relationships from tags, names, and descriptions. Write the `related` field silently.

**g.** Run and verify:
- If self-verifiable: run it, check output, update README verdict and Results section
- If needs human judgment: run it, present instructions using a checkpoint box:

╔══════════════════════════════════════════════════════════════╗
║  CHECKPOINT: Verification Required                           ║
╚══════════════════════════════════════════════════════════════╝

**Spike {NNN}: {name}**

**How to run:** {command}
**What to expect:** {concrete outcomes}

──────────────────────────────────────────────────────────────
→ Does this match what you expected? Describe what you see.
──────────────────────────────────────────────────────────────

- If the spike has a forensic log layer: after verification, export the log and include key findings in the Results section. If something went wrong, ask the user to export the log and provide it for diagnosis.

**h.** Update verdict to VALIDATED / INVALIDATED / PARTIAL (or WINNER for comparison spike winners). Update Results section with evidence.

**i.** Update `.planning/spikes/MANIFEST.md` with the spike's row.

**j.** Commit (if `COMMIT_DOCS` is true):
```bash
gsd-sdk query commit "docs(spike-NNN): [VERDICT] — [key finding in one sentence]" .planning/spikes/NNN-descriptive-name/ .planning/spikes/MANIFEST.md
```

**k.** Report before moving to next spike:
```
◆ Spike NNN: {name}
  Verdict: {VALIDATED ✓ / INVALIDATED ✗ / PARTIAL ⚠}
  Finding: {one sentence}
  Impact: {effect on remaining spikes, if any}
```

**l.** If a spike invalidates a core assumption: stop and present:

╔══════════════════════════════════════════════════════════════╗
║  CHECKPOINT: Decision Required                               ║
╚══════════════════════════════════════════════════════════════╝

Core assumption invalidated by Spike {NNN}.

{what was invalidated and why}

──────────────────────────────────────────────────────────────
→ Continue with remaining spikes / Pivot approach / Abandon
──────────────────────────────────────────────────────────────

Only proceed if the user says to.
</step>

<step name="report">
After all spikes complete, present the consolidated report:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SPIKE COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Verdicts

| # | Name | Type | Verdict |
|---|------|------|---------|
| 001 | {name} | standard | ✓ VALIDATED |
| 002a | {name} | comparison | ✓ WINNER |
| 002b | {name} | comparison | — |

## Key Discoveries
{surprises, gotchas, things that weren't expected}

## Feasibility Assessment
{overall, is the idea viable?}

## Signal for the Build
{what the real implementation should use, avoid, or watch out for}
```

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Package findings** — wrap spike knowledge into a reusable skill

`/gsd-spike-wrap-up`

───────────────────────────────────────────────────────────────

**Also available:**
- `/gsd-plan-phase` — start planning the real implementation
- `/gsd-explore` — continue exploring the idea
- `/gsd-add-phase` — add a phase to the roadmap based on findings

───────────────────────────────────────────────────────────────
</step>

</process>

<success_criteria>
- [ ] `.planning/spikes/` created (auto-creates if needed, no project init required)
- [ ] Prior spikes checked — already-validated questions skipped, prior findings factored in
- [ ] Research grounded each spike in current docs before coding (unless pure logic/no deps)
- [ ] Comparison spikes built back-to-back with head-to-head verdict
- [ ] Spikes needing human interaction have forensic log layer (event capture, export, analysis)
- [ ] Each spike answers one specific question with observable evidence
- [ ] Each spike README has complete frontmatter (including type), run instructions, and results
- [ ] User verified each spike (self-verified or human checkpoint)
- [ ] MANIFEST.md is current (with Type column)
- [ ] Commits use `docs(spike-NNN): [VERDICT]` format
- [ ] Consolidated report presented with next-step routing
- [ ] If core assumption invalidated, execution stopped and user consulted
</success_criteria>
