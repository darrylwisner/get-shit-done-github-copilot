# Copilot Instructions — GSD Copilot Port

This repo is a fork of gsd-build/get-shit-done.

## Maintain a derived compatibility layer
Do not rewrite upstream content. Instead:
- Generate VS Code prompt files in .github/prompts using scripts/generate-prompts.mjs
- Verify prompt coverage using scripts/verify-prompts.mjs
- Keep custom agent profiles in .github/agents minimal and stable

## When working on sync PRs
- Prefer fixing the generator over hand-editing many prompt files.
- Keep diffs minimal and easy to review.
