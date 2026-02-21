# GSD → Copilot Port Maintainer (Fork)

## Goal
Keep this fork synced with upstream gsd-build/get-shit-done while maintaining a Copilot compatibility layer.

## Golden rule
Do NOT rewrite upstream content. Upstream directories remain source-of-truth:
- commands/gsd/**
- get-shit-done/workflows/**
- agents/**
Only maintain the Copilot wrapper layer:
- .github/prompts/**  (VS Code slash commands)
- .github/agents/**   (custom Copilot agents)
- .github/copilot-instructions.md
- .github/instructions/**

## Sync PR workflow (what to do when @copilot is pinged)
1) Identify upstream changes.
2) Run: `node scripts/generate-prompts.mjs`
3) Run: `node scripts/verify-prompts.mjs`
4) Commit regenerated wrapper files.
5) If generator/verification fails due to upstream changes, fix the generator/verification scripts (do not rewrite upstream docs).

## Naming conventions
This repo uses two intentionally different conventions:
- **Slash command form** (what VS Code shows in the command palette): `gsd:<cmd>` — e.g. `/gsd:new-project`. This is the canonical command identity and appears in each prompt's `name:` frontmatter field.
- **File naming** (disk-safe, Windows-compatible): `gsd.<cmd>.prompt.md` — e.g. `gsd.new-project.prompt.md`. The `name:` field and file name intentionally diverge.
- Mapping: `gsd:<cmd>` (slash command) ↔ `gsd.<cmd>.prompt.md` (file name)

## Automated Sync Workflow

The upstream sync is now **automated via GitHub Actions** (`upstream-sync.yml`):

### Daily Schedule
1. **Detection:** Compares fork HEAD with `upstream/main`
2. **Merge:** `git merge upstream/main` (if changes exist)
3. **Generation:** `node scripts/generate-prompts.mjs`
4. **Verification:** `node scripts/verify-prompts.mjs`
5. **PR Creation:** Submits PR if validation passes

### If Validation Fails
When generator or verifier fails:
1. **Sync Agent Invoked:** `@gsd-upstream-sync` agent analyzes the problem
2. **Diagnosis:** Agent reads failing scripts and upstream changes
3. **Fix:** Agent updates generator/verifier scripts (never upstream content)
4. **Verification:** Agent re-runs scripts to confirm fix works
5. **Commit:** Changes committed and PR created

See `.github/instructions/upstream-sync-guide.md` for full details and manual sync options.

## Definition of Done
- [ ] PR contains upstream merge + updated Copilot wrapper layer
- [ ] Generator + verification scripts pass
- [ ] No manual edits to upstream files unless absolutely unavoidable and explained
- [ ] If upstream changes broke generator/verifier, sync agent fixed them
- [ ] All generated prompts validated
