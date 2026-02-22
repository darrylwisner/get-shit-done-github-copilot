# Changelog

Fork release history for **get-shit-done-github-copilot** — the VS Code GitHub Copilot compatibility layer for [GSD](https://github.com/gsd-build/get-shit-done).

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Upstream version history:** This changelog covers only fork-specific releases. For the full GSD upstream release history, see the [upstream CHANGELOG](https://github.com/gsd-build/get-shit-done/blob/main/CHANGELOG.md).

---

## [v1.4] - 2026-02-21 — Sync Pipeline Completion

### Added
- **Auto-merge for sync PRs** — upstream sync pull requests now merge automatically once CI passes, eliminating manual merge toil after upstream GSD releases
- **Release lockstep validation** — fork releases are gated on a confirmed, matching upstream tag; prevents the fork from shipping a release that references a non-existent or mismatched upstream version
- Sync merge strategy switched from `--squash` to `--merge` to preserve full upstream commit ancestry, keeping GitHub's "behind upstream" indicator accurate

---

## [v1.3] - 2026-02-21 — Upstream-Driven Automation

### Added
- **Scheduled upstream sync** — a daily GitHub Actions workflow detects upstream GSD commits and opens a sync PR automatically; no human needed to initiate the merge
- **Upstream release mirror** — when upstream publishes a new GSD release, the fork's workflow mirrors it as a tagged GitHub release within this repo; Copilot users always have a matching release entry to reference

---

## [v1.2] - 2026-02-21 — Command Identity & Safety

### Added
- **Consistent dot-namespaced command naming** — all generated VS Code slash commands follow the `/gsd.command-name` namespace to avoid collisions with other Copilot extensions
- **Upstream push guard** — `guard-upstream-files.sh` blocks the self-repair Copilot agent from accidentally modifying upstream source directories (`commands/gsd/`, `get-shit-done/`, `agents/`), preserving the fork's golden rule

---

## [v1.1] - 2026-02-21 — Proper Packaging for Releases

### Added
- **Complete release artifact** — GitHub release zips now include all runtime files required for the Copilot integration to work: `.claude/get-shit-done/`, `agents/`, `commands/gsd/`, and installer scripts (v1.0 release was missing these)
- **Installer completeness fix** — the PowerShell installer now correctly extracts and places all runtime paths, not just `.github/` files; users who ran the v1.0 installer should reinstall

---

## [v1.0] - 2026-02-20 — Initial Copilot Compatibility Layer

### Added
- **VS Code prompt shims** — generated `.github/prompts/*.prompt.md` files expose all GSD slash commands in Copilot Chat using VS Code's prompt file format
- **Tool mapping layer** — GSD's upstream `allowed-tools` YAML frontmatter is translated to Copilot-compatible tool references; unknown tools degrade gracefully with a warning rather than crashing the generator
- **CI pipeline** — GitHub Actions workflow runs the generator and verifier on every push, catches prompt drift before it reaches users
- **Self-repair integration** — a `@copilot` coding agent job auto-repairs broken prompt generation; no API keys required (uses GitHub's native Copilot agent support)
- **PowerShell installer** — one-liner install path for Windows users via `gsd-copilot-installer/gsd-copilot-install.ps1`