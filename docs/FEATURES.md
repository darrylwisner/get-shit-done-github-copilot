# GSD Feature Reference

> Complete feature and function documentation with requirements. For architecture details, see [Architecture](ARCHITECTURE.md). For command syntax, see [Command Reference](COMMANDS.md).

---

## Table of Contents

- [Core Features](#core-features)
  - [Project Initialization](#1-project-initialization)
  - [Phase Discussion](#2-phase-discussion)
  - [UI Design Contract](#3-ui-design-contract)
  - [Phase Planning](#4-phase-planning)
  - [Phase Execution](#5-phase-execution)
  - [Work Verification](#6-work-verification)
  - [UI Review](#7-ui-review)
  - [Milestone Management](#8-milestone-management)
- [Planning Features](#planning-features)
  - [Phase Management](#9-phase-management)
  - [Quick Mode](#10-quick-mode)
  - [Autonomous Mode](#11-autonomous-mode)
  - [Freeform Routing](#12-freeform-routing)
- [Quality Assurance Features](#quality-assurance-features)
  - [Nyquist Validation](#13-nyquist-validation)
  - [Plan Checking](#14-plan-checking)
  - [Post-Execution Verification](#15-post-execution-verification)
  - [Node Repair](#16-node-repair)
  - [Health Validation](#17-health-validation)
- [Context Engineering Features](#context-engineering-features)
  - [Context Window Monitoring](#18-context-window-monitoring)
  - [Session Management](#19-session-management)
  - [Multi-Agent Orchestration](#20-multi-agent-orchestration)
  - [Model Profiles](#21-model-profiles)
- [Brownfield Features](#brownfield-features)
  - [Codebase Mapping](#22-codebase-mapping)
- [Utility Features](#utility-features)
  - [Debug System](#23-debug-system)
  - [Todo Management](#24-todo-management)
  - [Statistics Dashboard](#25-statistics-dashboard)
  - [Update System](#26-update-system)
  - [Settings Management](#27-settings-management)
  - [Test Generation](#28-test-generation)
- [Infrastructure Features](#infrastructure-features)
  - [Git Integration](#29-git-integration)
  - [CLI Tools](#30-cli-tools)
  - [Multi-Runtime Support](#31-multi-runtime-support)
  - [Hook System](#32-hook-system)

---

## Core Features

### 1. Project Initialization

**Command:** `/gsd:new-project [--auto @file.md]`

**Purpose:** Transform a user's idea into a fully structured project with research, scoped requirements, and a phased roadmap.

**Requirements:**
- REQ-INIT-01: System MUST conduct adaptive questioning until project scope is fully understood
- REQ-INIT-02: System MUST spawn parallel research agents to investigate the domain ecosystem
- REQ-INIT-03: System MUST extract requirements into v1 (must-have), v2 (future), and out-of-scope categories
- REQ-INIT-04: System MUST generate a phased roadmap with requirement traceability
- REQ-INIT-05: System MUST require user approval of the roadmap before proceeding
- REQ-INIT-06: System MUST prevent re-initialization when `.planning/PROJECT.md` already exists
- REQ-INIT-07: System MUST support `--auto @file.md` flag to skip interactive questions and extract from a document

**Produces:**
| Artifact | Description |
|----------|-------------|
| `PROJECT.md` | Project vision, constraints, technical decisions |
| `REQUIREMENTS.md` | Scoped requirements with unique IDs (REQ-XX) |
| `ROADMAP.md` | Phase breakdown with status tracking and requirement mapping |
| `STATE.md` | Initial project state with position, decisions, metrics |
| `config.json` | Workflow configuration |
| `research/SUMMARY.md` | Synthesized domain research |
| `research/STACK.md` | Technology stack investigation |
| `research/FEATURES.md` | Feature implementation patterns |
| `research/ARCHITECTURE.md` | Architecture patterns and trade-offs |
| `research/PITFALLS.md` | Common failure modes and mitigations |

**Process:**
1. **Questions** — Adaptive questioning guided by the "dream extraction" philosophy (not requirements gathering)
2. **Research** — 4 parallel researcher agents investigate stack, features, architecture, and pitfalls
3. **Synthesis** — Research synthesizer combines findings into SUMMARY.md
4. **Requirements** — Extracted from user responses + research, categorized by scope
5. **Roadmap** — Phase breakdown mapped to requirements, with granularity setting controlling phase count

**Functional Requirements:**
- Questions adapt based on detected project type (web app, CLI, mobile, API, etc.)
- Research agents have web search capability for current ecosystem information
- Granularity setting controls phase count: `coarse` (3-5), `standard` (5-8), `fine` (8-12)
- `--auto` mode extracts all information from the provided document without interactive questioning
- Existing codebase context (from `/gsd:map-codebase`) is loaded if present

---

### 2. Phase Discussion

**Command:** `/gsd:discuss-phase [N] [--auto] [--batch]`

**Purpose:** Capture user's implementation preferences and decisions before research and planning begin. Eliminates the gray areas that cause AI to guess.

**Requirements:**
- REQ-DISC-01: System MUST analyze the phase scope and identify decision areas (gray areas)
- REQ-DISC-02: System MUST categorize gray areas by type (visual, API, content, organization, etc.)
- REQ-DISC-03: System MUST ask only questions not already answered in prior CONTEXT.md files
- REQ-DISC-04: System MUST persist decisions in `{phase}-CONTEXT.md` with canonical references
- REQ-DISC-05: System MUST support `--auto` flag to auto-select recommended defaults
- REQ-DISC-06: System MUST support `--batch` flag for grouped question intake
- REQ-DISC-07: System MUST scout relevant source files before identifying gray areas (code-aware discussion)

**Produces:** `{padded_phase}-CONTEXT.md` — User preferences that feed into research and planning

**Gray Area Categories:**
| Category | Example Decisions |
|----------|-------------------|
| Visual features | Layout, density, interactions, empty states |
| APIs/CLIs | Response format, flags, error handling, verbosity |
| Content systems | Structure, tone, depth, flow |
| Organization | Grouping criteria, naming, duplicates, exceptions |

---

### 3. UI Design Contract

**Command:** `/gsd:ui-phase [N]`

**Purpose:** Lock design decisions before planning so that all components in a phase share consistent visual standards.

**Requirements:**
- REQ-UI-01: System MUST detect existing design system state (shadcn components.json, Tailwind config, tokens)
- REQ-UI-02: System MUST ask only unanswered design contract questions
- REQ-UI-03: System MUST validate against 6 dimensions (Copywriting, Visuals, Color, Typography, Spacing, Registry Safety)
- REQ-UI-04: System MUST enter revision loop if validation returns BLOCKED (max 2 iterations)
- REQ-UI-05: System MUST offer shadcn initialization for React/Next.js/Vite projects without `components.json`
- REQ-UI-06: System MUST enforce registry safety gate for third-party shadcn registries

**Produces:** `{padded_phase}-UI-SPEC.md` — Design contract consumed by executors

**6 Validation Dimensions:**
1. **Copywriting** — CTA labels, empty states, error messages
2. **Visuals** — Focal points, visual hierarchy, icon accessibility
3. **Color** — Accent usage discipline, 60/30/10 compliance
4. **Typography** — Font size/weight constraint adherence
5. **Spacing** — Grid alignment, token consistency
6. **Registry Safety** — Third-party component inspection requirements

**shadcn Integration:**
- Detects missing `components.json` in React/Next.js/Vite projects
- Guides user through `ui.shadcn.com/create` preset configuration
- Preset string becomes a planning artifact reproducible across phases
- Safety gate requires `npx shadcn view` and `npx shadcn diff` before third-party components

---

### 4. Phase Planning

**Command:** `/gsd:plan-phase [N] [--auto] [--skip-research] [--skip-verify]`

**Purpose:** Research the implementation domain and produce verified, atomic execution plans.

**Requirements:**
- REQ-PLAN-01: System MUST spawn a phase researcher to investigate implementation approaches
- REQ-PLAN-02: System MUST produce plans with 2-3 tasks each, sized for a single context window
- REQ-PLAN-03: System MUST structure plans as XML with `<task>` elements containing `name`, `files`, `action`, `verify`, and `done` fields
- REQ-PLAN-04: System MUST include `read_first` and `acceptance_criteria` sections in every plan
- REQ-PLAN-05: System MUST run plan checker verification loop (up to 3 iterations) unless `--skip-verify` is set
- REQ-PLAN-06: System MUST support `--skip-research` flag to bypass research phase
- REQ-PLAN-07: System MUST prompt user to run `/gsd:ui-phase` if frontend phase detected and no UI-SPEC.md exists (UI safety gate)
- REQ-PLAN-08: System MUST include Nyquist validation mapping when `workflow.nyquist_validation` is enabled

**Produces:**
| Artifact | Description |
|----------|-------------|
| `{phase}-RESEARCH.md` | Ecosystem research findings |
| `{phase}-{N}-PLAN.md` | Atomic execution plans (2-3 tasks each) |
| `{phase}-VALIDATION.md` | Test coverage mapping (Nyquist layer) |

**Plan Structure (XML):**
```xml
<task type="auto">
  <name>Create login endpoint</name>
  <files>src/app/api/auth/login/route.ts</files>
  <action>
    Use jose for JWT. Validate credentials against users table.
    Return httpOnly cookie on success.
  </action>
  <verify>curl -X POST localhost:3000/api/auth/login returns 200 + Set-Cookie</verify>
  <done>Valid credentials return cookie, invalid return 401</done>
</task>
```

**Plan Checker Verification (8 Dimensions):**
1. Requirement coverage — Plans address all phase requirements
2. Task atomicity — Each task is independently committable
3. Dependency ordering — Tasks sequence correctly
4. File scope — No excessive file overlap between plans
5. Verification commands — Each task has testable done criteria
6. Context fit — Tasks fit within a single context window
7. Gap detection — No missing implementation steps
8. Nyquist compliance — Tasks have automated verify commands (when enabled)

---

### 5. Phase Execution

**Command:** `/gsd:execute-phase <N>`

**Purpose:** Execute all plans in a phase using wave-based parallelization with fresh context windows per executor.

**Requirements:**
- REQ-EXEC-01: System MUST analyze plan dependencies and group into execution waves
- REQ-EXEC-02: System MUST spawn independent plans in parallel within each wave
- REQ-EXEC-03: System MUST give each executor a fresh context window (200K tokens)
- REQ-EXEC-04: System MUST produce atomic git commits per task
- REQ-EXEC-05: System MUST produce a SUMMARY.md for each completed plan
- REQ-EXEC-06: System MUST run post-execution verifier to check phase goals were met
- REQ-EXEC-07: System MUST support git branching strategies (`none`, `phase`, `milestone`)
- REQ-EXEC-08: System MUST invoke node repair operator on task verification failure (when enabled)

**Produces:**
| Artifact | Description |
|----------|-------------|
| `{phase}-{N}-SUMMARY.md` | Execution outcomes per plan |
| `{phase}-VERIFICATION.md` | Post-execution verification report |
| Git commits | Atomic commits per task |

**Wave Execution:**
- Plans with no dependencies → Wave 1 (parallel)
- Plans depending on Wave 1 → Wave 2 (parallel, waits for Wave 1)
- Continues until all plans complete
- File conflicts force sequential execution within same wave

**Executor Capabilities:**
- Reads PLAN.md with full task instructions
- Has access to PROJECT.md, STATE.md, CONTEXT.md, RESEARCH.md
- Commits each task atomically with structured commit messages
- Handles checkpoint types: `auto`, `checkpoint:human-verify`, `checkpoint:decision`, `checkpoint:human-action`
- Reports deviations from plan in SUMMARY.md

---

### 6. Work Verification

**Command:** `/gsd:verify-work [N]`

**Purpose:** User acceptance testing — walk the user through testing each deliverable and auto-diagnose failures.

**Requirements:**
- REQ-VERIFY-01: System MUST extract testable deliverables from the phase
- REQ-VERIFY-02: System MUST present deliverables one at a time for user confirmation
- REQ-VERIFY-03: System MUST spawn debug agents to diagnose failures automatically
- REQ-VERIFY-04: System MUST create fix plans for identified issues
- REQ-VERIFY-05: System MUST inject cold-start smoke test for phases modifying server/database/seed/startup files
- REQ-VERIFY-06: System MUST produce UAT.md with pass/fail results

**Produces:** `{phase}-UAT.md` — User acceptance test results, plus fix plans if issues found

---

### 7. UI Review

**Command:** `/gsd:ui-review [N]`

**Purpose:** Retroactive 6-pillar visual audit of implemented frontend code. Works standalone on any project.

**Requirements:**
- REQ-UIREVIEW-01: System MUST score each of the 6 pillars on a 1-4 scale
- REQ-UIREVIEW-02: System MUST capture screenshots via Playwright CLI to `.planning/ui-reviews/`
- REQ-UIREVIEW-03: System MUST create `.gitignore` for screenshot directory
- REQ-UIREVIEW-04: System MUST identify top 3 priority fixes
- REQ-UIREVIEW-05: System MUST work standalone (without UI-SPEC.md) using abstract quality standards

**6 Audit Pillars (scored 1-4):**
1. **Copywriting** — CTA labels, empty states, error states
2. **Visuals** — Focal points, visual hierarchy, icon accessibility
3. **Color** — Accent usage discipline, 60/30/10 compliance
4. **Typography** — Font size/weight constraint adherence
5. **Spacing** — Grid alignment, token consistency
6. **Experience Design** — Loading/error/empty state coverage

**Produces:** `{padded_phase}-UI-REVIEW.md` — Scores and prioritized fixes

---

### 8. Milestone Management

**Commands:** `/gsd:audit-milestone`, `/gsd:complete-milestone`, `/gsd:new-milestone [name]`

**Purpose:** Verify milestone completion, archive, tag release, and start the next development cycle.

**Requirements:**
- REQ-MILE-01: Audit MUST verify all milestone requirements are met
- REQ-MILE-02: Audit MUST detect stubs, placeholder implementations, and untested code
- REQ-MILE-03: Audit MUST check Nyquist validation compliance across phases
- REQ-MILE-04: Complete MUST archive milestone data to MILESTONES.md
- REQ-MILE-05: Complete MUST offer git tag creation for the release
- REQ-MILE-06: Complete MUST offer squash merge or merge with history for branching strategies
- REQ-MILE-07: Complete MUST clean up UI review screenshots
- REQ-MILE-08: New milestone MUST follow same flow as new-project (questions → research → requirements → roadmap)
- REQ-MILE-09: New milestone MUST NOT reset existing workflow configuration

**Gap Closure:** `/gsd:plan-milestone-gaps` creates phases to close gaps identified by audit.

---

## Planning Features

### 9. Phase Management

**Commands:** `/gsd:add-phase`, `/gsd:insert-phase [N]`, `/gsd:remove-phase [N]`

**Purpose:** Dynamic roadmap modification during development.

**Requirements:**
- REQ-PHASE-01: Add MUST append a new phase to the end of the current roadmap
- REQ-PHASE-02: Insert MUST use decimal numbering (e.g., 3.1) between existing phases
- REQ-PHASE-03: Remove MUST renumber all subsequent phases
- REQ-PHASE-04: Remove MUST prevent removing phases that have been executed
- REQ-PHASE-05: All operations MUST update ROADMAP.md and create/remove phase directories

---

### 10. Quick Mode

**Command:** `/gsd:quick [--full] [--discuss] [--research]`

**Purpose:** Ad-hoc task execution with GSD guarantees but a faster path.

**Requirements:**
- REQ-QUICK-01: System MUST accept freeform task description
- REQ-QUICK-02: System MUST use same planner + executor agents as full workflow
- REQ-QUICK-03: System MUST skip research, plan checker, and verifier by default
- REQ-QUICK-04: `--full` flag MUST enable plan checking (max 2 iterations) and post-execution verification
- REQ-QUICK-05: `--discuss` flag MUST run lightweight pre-planning discussion
- REQ-QUICK-06: `--research` flag MUST spawn focused research agent before planning
- REQ-QUICK-07: Flags MUST be composable (`--discuss --research --full`)
- REQ-QUICK-08: System MUST track quick tasks in `.planning/quick/YYMMDD-xxx-slug/`
- REQ-QUICK-09: System MUST produce atomic commits for quick task execution

---

### 11. Autonomous Mode

**Command:** `/gsd:autonomous [--from N]`

**Purpose:** Run all remaining phases autonomously — discuss → plan → execute per phase.

**Requirements:**
- REQ-AUTO-01: System MUST iterate through all incomplete phases in roadmap order
- REQ-AUTO-02: System MUST run discuss → plan → execute for each phase
- REQ-AUTO-03: System MUST pause for explicit user decisions (gray area acceptance, blockers, validation)
- REQ-AUTO-04: System MUST re-read ROADMAP.md after each phase to catch dynamically inserted phases
- REQ-AUTO-05: `--from N` flag MUST start from a specific phase number

---

### 12. Freeform Routing

**Command:** `/gsd:do`

**Purpose:** Analyze freeform text and route to the appropriate GSD command.

**Requirements:**
- REQ-DO-01: System MUST parse user intent from natural language input
- REQ-DO-02: System MUST map intent to the best matching GSD command
- REQ-DO-03: System MUST confirm the routing with the user before executing
- REQ-DO-04: System MUST handle project-exists vs no-project contexts differently

---

### 13. Note Capture

**Command:** `/gsd:note`

**Purpose:** Zero-friction idea capture without interrupting workflow. Append timestamped notes, list all notes, or promote notes to structured todos.

**Requirements:**
- REQ-NOTE-01: System MUST save timestamped note files with a single Write call
- REQ-NOTE-02: System MUST support `list` subcommand to show all notes from project and global scopes
- REQ-NOTE-03: System MUST support `promote N` subcommand to convert a note into a structured todo
- REQ-NOTE-04: System MUST support `--global` flag for global scope operations
- REQ-NOTE-05: System MUST NOT use Task, AskUserQuestion, or Bash — runs inline only

---

## Quality Assurance Features

### 14. Nyquist Validation

**Purpose:** Map automated test coverage to phase requirements before any code is written. Named after the Nyquist sampling theorem — ensures a feedback signal exists for every requirement.

**Requirements:**
- REQ-NYQ-01: System MUST detect existing test infrastructure during plan-phase research
- REQ-NYQ-02: System MUST map each requirement to a specific test command
- REQ-NYQ-03: System MUST identify Wave 0 tasks (test scaffolding needed before implementation)
- REQ-NYQ-04: Plan checker MUST enforce Nyquist compliance as 8th verification dimension
- REQ-NYQ-05: System MUST support retroactive validation via `/gsd:validate-phase`
- REQ-NYQ-06: System MUST be disableable via `workflow.nyquist_validation: false`

**Produces:** `{phase}-VALIDATION.md` — Test coverage contract

**Retroactive Validation (`/gsd:validate-phase [N]`):**
- Scans implementation and maps requirements to tests
- Identifies gaps where requirements lack automated verification
- Spawns auditor to generate tests (max 3 attempts)
- Never modifies implementation code — only test files and VALIDATION.md
- Flags implementation bugs as escalations for user to address

---

### 15. Plan Checking

**Purpose:** Goal-backward verification that plans will achieve phase objectives before execution.

**Requirements:**
- REQ-PLANCK-01: System MUST verify plans against 8 quality dimensions
- REQ-PLANCK-02: System MUST loop up to 3 iterations until plans pass
- REQ-PLANCK-03: System MUST produce specific, actionable feedback on failures
- REQ-PLANCK-04: System MUST be disableable via `workflow.plan_check: false`

---

### 16. Post-Execution Verification

**Purpose:** Automated check that the codebase delivers what the phase promised.

**Requirements:**
- REQ-POSTVER-01: System MUST check against phase goals, not just task completion
- REQ-POSTVER-02: System MUST produce VERIFICATION.md with pass/fail analysis
- REQ-POSTVER-03: System MUST log issues for `/gsd:verify-work` to address
- REQ-POSTVER-04: System MUST be disableable via `workflow.verifier: false`

---

### 17. Node Repair

**Purpose:** Autonomous recovery when task verification fails during execution.

**Requirements:**
- REQ-REPAIR-01: System MUST analyze failure and choose one strategy: RETRY, DECOMPOSE, or PRUNE
- REQ-REPAIR-02: RETRY MUST attempt with a concrete adjustment
- REQ-REPAIR-03: DECOMPOSE MUST break task into smaller verifiable sub-steps
- REQ-REPAIR-04: PRUNE MUST remove unachievable tasks and escalate to user
- REQ-REPAIR-05: System MUST respect repair budget (default: 2 attempts per task)
- REQ-REPAIR-06: System MUST be configurable via `workflow.node_repair_budget` and `workflow.node_repair`

---

### 18. Health Validation

**Command:** `/gsd:health [--repair]`

**Purpose:** Validate `.planning/` directory integrity and auto-repair issues.

**Requirements:**
- REQ-HEALTH-01: System MUST check for missing required files
- REQ-HEALTH-02: System MUST validate configuration consistency
- REQ-HEALTH-03: System MUST detect orphaned plans without summaries
- REQ-HEALTH-04: System MUST check phase numbering and roadmap sync
- REQ-HEALTH-05: `--repair` flag MUST auto-fix recoverable issues

---

## Context Engineering Features

### 19. Context Window Monitoring

**Purpose:** Prevent context rot by alerting both user and agent when context is running low.

**Requirements:**
- REQ-CTX-01: Statusline MUST display context usage percentage to user
- REQ-CTX-02: Context monitor MUST inject agent-facing warnings at ≤35% remaining (WARNING)
- REQ-CTX-03: Context monitor MUST inject agent-facing warnings at ≤25% remaining (CRITICAL)
- REQ-CTX-04: Warnings MUST debounce (5 tool uses between repeated warnings)
- REQ-CTX-05: Severity escalation (WARNING→CRITICAL) MUST bypass debounce
- REQ-CTX-06: Context monitor MUST differentiate GSD-active vs non-GSD-active projects
- REQ-CTX-07: Warnings MUST be advisory, never imperative commands that override user preferences
- REQ-CTX-08: All hooks MUST fail silently and never block tool execution

**Architecture:** Two-part bridge system:
1. Statusline writes metrics to `/tmp/claude-ctx-{session}.json`
2. Context monitor reads metrics and injects `additionalContext` warnings

---

### 20. Session Management

**Commands:** `/gsd:pause-work`, `/gsd:resume-work`, `/gsd:progress`

**Purpose:** Maintain project continuity across context resets and sessions.

**Requirements:**
- REQ-SESSION-01: Pause MUST save current position and next steps to `continue-here.md`
- REQ-SESSION-02: Resume MUST restore full project context from state files
- REQ-SESSION-03: Progress MUST show current position, next action, and overall completion
- REQ-SESSION-04: Progress MUST read all state files (STATE.md, ROADMAP.md, phase directories)
- REQ-SESSION-05: All session operations MUST work after `/clear` (context reset)

---

### 21. Multi-Agent Orchestration

**Purpose:** Coordinate specialized agents with fresh context windows for each task.

**Requirements:**
- REQ-ORCH-01: Each agent MUST receive a fresh context window
- REQ-ORCH-02: Orchestrators MUST be thin — spawn agents, collect results, route next
- REQ-ORCH-03: Context payload MUST include all relevant project artifacts
- REQ-ORCH-04: Parallel agents MUST be truly independent (no shared mutable state)
- REQ-ORCH-05: Agent results MUST be written to disk before orchestrator processes them
- REQ-ORCH-06: Failed agents MUST be detected (spot-check actual output vs reported failure)

---

### 22. Model Profiles

**Command:** `/gsd:set-profile <quality|balanced|budget|inherit>`

**Purpose:** Control which AI model each agent uses, balancing quality vs cost.

**Requirements:**
- REQ-MODEL-01: System MUST support 4 profiles: `quality`, `balanced`, `budget`, `inherit`
- REQ-MODEL-02: Each profile MUST define model tier per agent (see profile table)
- REQ-MODEL-03: Per-agent overrides MUST take precedence over profile
- REQ-MODEL-04: `inherit` profile MUST defer to runtime's current model selection
- REQ-MODEL-05: Profile switch MUST be programmatic (script, not LLM-driven)
- REQ-MODEL-06: Model resolution MUST happen once per orchestration, not per spawn

**Profile Assignments:**

| Agent | `quality` | `balanced` | `budget` | `inherit` |
|-------|-----------|------------|----------|-----------|
| gsd-planner | Opus | Opus | Sonnet | Inherit |
| gsd-roadmapper | Opus | Sonnet | Sonnet | Inherit |
| gsd-executor | Opus | Sonnet | Sonnet | Inherit |
| gsd-phase-researcher | Opus | Sonnet | Haiku | Inherit |
| gsd-project-researcher | Opus | Sonnet | Haiku | Inherit |
| gsd-research-synthesizer | Sonnet | Sonnet | Haiku | Inherit |
| gsd-debugger | Opus | Sonnet | Sonnet | Inherit |
| gsd-codebase-mapper | Sonnet | Haiku | Haiku | Inherit |
| gsd-verifier | Sonnet | Sonnet | Haiku | Inherit |
| gsd-plan-checker | Sonnet | Sonnet | Haiku | Inherit |
| gsd-integration-checker | Sonnet | Sonnet | Haiku | Inherit |
| gsd-nyquist-auditor | Sonnet | Sonnet | Haiku | Inherit |

---

## Brownfield Features

### 23. Codebase Mapping

**Command:** `/gsd:map-codebase [area]`

**Purpose:** Analyze an existing codebase before starting a new project, so GSD understands what exists.

**Requirements:**
- REQ-MAP-01: System MUST spawn parallel mapper agents for each analysis area
- REQ-MAP-02: System MUST produce structured documents in `.planning/codebase/`
- REQ-MAP-03: System MUST detect: tech stack, architecture patterns, coding conventions, concerns
- REQ-MAP-04: Subsequent `/gsd:new-project` MUST load codebase mapping and focus questions on what's being added
- REQ-MAP-05: Optional `[area]` argument MUST scope mapping to a specific area

**Produces:**
| Document | Content |
|----------|---------|
| `STACK.md` | Languages, frameworks, databases, infrastructure |
| `ARCHITECTURE.md` | Patterns, layers, data flow, boundaries |
| `CONVENTIONS.md` | Naming, file organization, code style, testing patterns |
| `CONCERNS.md` | Technical debt, security issues, performance bottlenecks |
| `STRUCTURE.md` | Directory layout and file organization |
| `TESTING.md` | Test infrastructure, coverage, patterns |
| `INTEGRATIONS.md` | External services, APIs, third-party dependencies |

---

## Utility Features

### 24. Debug System

**Command:** `/gsd:debug [description]`

**Purpose:** Systematic debugging with persistent state across context resets.

**Requirements:**
- REQ-DEBUG-01: System MUST create debug session file in `.planning/debug/`
- REQ-DEBUG-02: System MUST track hypotheses, evidence, and eliminated theories
- REQ-DEBUG-03: System MUST persist state so debugging survives context resets
- REQ-DEBUG-04: System MUST require human verification before marking resolved
- REQ-DEBUG-05: Resolved sessions MUST append to `.planning/debug/knowledge-base.md`
- REQ-DEBUG-06: Knowledge base MUST be consulted on new debug sessions to prevent re-investigation

**Debug Session States:** `gathering` → `investigating` → `fixing` → `verifying` → `awaiting_human_verify` → `resolved`

---

### 25. Todo Management

**Commands:** `/gsd:add-todo [desc]`, `/gsd:check-todos`

**Purpose:** Capture ideas and tasks during sessions for later work.

**Requirements:**
- REQ-TODO-01: System MUST capture todo from current conversation context
- REQ-TODO-02: Todos MUST be stored in `.planning/todos/pending/`
- REQ-TODO-03: Completed todos MUST move to `.planning/todos/done/`
- REQ-TODO-04: Check-todos MUST list all pending items with selection to work on one

---

### 26. Statistics Dashboard

**Command:** `/gsd:stats`

**Purpose:** Display project metrics — phases, plans, requirements, git history, and timeline.

**Requirements:**
- REQ-STATS-01: System MUST show phase/plan completion counts
- REQ-STATS-02: System MUST show requirement coverage
- REQ-STATS-03: System MUST show git commit metrics
- REQ-STATS-04: System MUST support multiple output formats (json, table, bar)

---

### 27. Update System

**Command:** `/gsd:update`

**Purpose:** Update GSD to the latest version with changelog preview.

**Requirements:**
- REQ-UPDATE-01: System MUST check for new versions via npm
- REQ-UPDATE-02: System MUST display changelog for new version before updating
- REQ-UPDATE-03: System MUST be runtime-aware and target the correct directory
- REQ-UPDATE-04: System MUST back up locally modified files to `gsd-local-patches/`
- REQ-UPDATE-05: `/gsd:reapply-patches` MUST restore local modifications after update

---

### 28. Settings Management

**Command:** `/gsd:settings`

**Purpose:** Interactive configuration of workflow toggles and model profile.

**Requirements:**
- REQ-SETTINGS-01: System MUST present current settings with toggle options
- REQ-SETTINGS-02: System MUST update `.planning/config.json`
- REQ-SETTINGS-03: System MUST support saving as global defaults (`~/.gsd/defaults.json`)

**Configurable Settings:**
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mode` | enum | `interactive` | `interactive` or `yolo` (auto-approve) |
| `granularity` | enum | `standard` | `coarse`, `standard`, or `fine` |
| `model_profile` | enum | `balanced` | `quality`, `balanced`, `budget`, or `inherit` |
| `workflow.research` | boolean | `true` | Domain research before planning |
| `workflow.plan_check` | boolean | `true` | Plan verification loop |
| `workflow.verifier` | boolean | `true` | Post-execution verification |
| `workflow.auto_advance` | boolean | `false` | Auto-chain discuss→plan→execute |
| `workflow.nyquist_validation` | boolean | `true` | Nyquist test coverage mapping |
| `workflow.ui_phase` | boolean | `true` | UI design contract generation |
| `workflow.ui_safety_gate` | boolean | `true` | Prompt for ui-phase on frontend phases |
| `workflow.node_repair` | boolean | `true` | Autonomous task repair |
| `workflow.node_repair_budget` | number | `2` | Max repair attempts per task |
| `planning.commit_docs` | boolean | `true` | Commit `.planning/` files to git |
| `planning.search_gitignored` | boolean | `false` | Include gitignored files in searches |
| `parallelization.enabled` | boolean | `true` | Run independent plans simultaneously |
| `git.branching_strategy` | enum | `none` | `none`, `phase`, or `milestone` |

---

### 29. Test Generation

**Command:** `/gsd:add-tests [N]`

**Purpose:** Generate tests for a completed phase based on UAT criteria and implementation.

**Requirements:**
- REQ-TEST-01: System MUST analyze completed phase implementation
- REQ-TEST-02: System MUST generate tests based on UAT criteria and acceptance criteria
- REQ-TEST-03: System MUST use existing test infrastructure patterns

---

## Infrastructure Features

### 30. Git Integration

**Purpose:** Atomic commits, branching strategies, and clean history management.

**Requirements:**
- REQ-GIT-01: Each task MUST get its own atomic commit
- REQ-GIT-02: Commit messages MUST follow structured format: `type(scope): description`
- REQ-GIT-03: System MUST support 3 branching strategies: `none`, `phase`, `milestone`
- REQ-GIT-04: Phase strategy MUST create one branch per phase
- REQ-GIT-05: Milestone strategy MUST create one branch per milestone
- REQ-GIT-06: Complete-milestone MUST offer squash merge (recommended) or merge with history
- REQ-GIT-07: System MUST respect `commit_docs` setting for `.planning/` files
- REQ-GIT-08: System MUST auto-detect `.planning/` in `.gitignore` and skip commits

**Commit Format:**
```
type(phase-plan): description

# Examples:
docs(08-02): complete user registration plan
feat(08-02): add email confirmation flow
fix(03-01): correct auth token expiry
```

---

### 31. CLI Tools

**Purpose:** Programmatic utilities for workflows and agents, replacing repetitive inline bash patterns.

**Requirements:**
- REQ-CLI-01: System MUST provide atomic commands for state, config, phase, roadmap operations
- REQ-CLI-02: System MUST provide compound `init` commands that load all context for each workflow
- REQ-CLI-03: System MUST support `--raw` flag for machine-readable output
- REQ-CLI-04: System MUST support `--cwd` flag for sandboxed subagent operation
- REQ-CLI-05: All operations MUST use forward-slash paths on Windows

**Command Categories:** State (11 subcommands), Phase (5), Roadmap (3), Verify (8), Template (2), Frontmatter (4), Scaffold (4), Init (12), Validate (2), Progress, Stats, Todo

---

### 32. Multi-Runtime Support

**Purpose:** Run GSD across 6 different AI coding agent runtimes.

**Requirements:**
- REQ-RUNTIME-01: System MUST support Claude Code, OpenCode, Gemini CLI, Codex, Copilot, Antigravity
- REQ-RUNTIME-02: Installer MUST transform content per runtime (tool names, paths, frontmatter)
- REQ-RUNTIME-03: Installer MUST support interactive and non-interactive (`--claude --global`) modes
- REQ-RUNTIME-04: Installer MUST support both global and local installation
- REQ-RUNTIME-05: Uninstall MUST cleanly remove all GSD files without affecting other configurations
- REQ-RUNTIME-06: Installer MUST handle platform differences (Windows, macOS, Linux, WSL, Docker)

**Runtime Transformations:**

| Aspect | Claude Code | OpenCode | Gemini | Codex | Copilot | Antigravity |
|--------|------------|----------|--------|-------|---------|-------------|
| Commands | Slash commands | Slash commands | Slash commands | Skills (TOML) | Slash commands | Skills |
| Agent format | Claude native | `mode: subagent` | Claude native | Skills | Tool mapping | Skills |
| Hook events | `PostToolUse` | N/A | `AfterTool` | N/A | N/A | N/A |
| Config | `settings.json` | `opencode.json(c)` | `settings.json` | TOML | Instructions | Config |

---

### 33. Hook System

**Purpose:** Runtime event hooks for context monitoring, status display, and update checking.

**Requirements:**
- REQ-HOOK-01: Statusline MUST display model, current task, directory, and context usage
- REQ-HOOK-02: Context monitor MUST inject agent-facing warnings at threshold levels
- REQ-HOOK-03: Update checker MUST run in background on session start
- REQ-HOOK-04: All hooks MUST respect `CLAUDE_CONFIG_DIR` env var
- REQ-HOOK-05: All hooks MUST include 3-second stdin timeout guard
- REQ-HOOK-06: All hooks MUST fail silently on any error
- REQ-HOOK-07: Context usage MUST normalize for autocompact buffer (16.5% reserved)

**Statusline Display:**
```
[⬆ /gsd:update │] model │ [current task │] directory [█████░░░░░ 50%]
```

Color coding: <50% green, <65% yellow, <80% orange, ≥80% red with skull emoji
