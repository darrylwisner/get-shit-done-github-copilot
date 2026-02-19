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
- Prompt command names use dot-namespace: /gsd.new-project
- Mapping is stable: gsd:<cmd> → gsd.<cmd>

## Definition of done
- PR contains upstream merge + updated Copilot wrapper layer
- Generator + verification scripts pass
- No manual edits to upstream files unless absolutely unavoidable and explained
