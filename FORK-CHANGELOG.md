# Fork Changelog

All fork-specific changes to `get-shit-done-github-copilot` are documented here.  
This file covers **v1.5 and later**. For v1.0–v1.4 history, see [CHANGELOG.md](CHANGELOG.md).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
This fork tracks the upstream [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) release cadence and layers a VS Code Copilot compatibility shim on top.

---

## [v1.5] - 2026-02-22 — Repo Metadata Alignment

### Added
- `FORK-CHANGELOG.md` — fork-specific release history (this file), forward-looking from v1.5
- Fork identity documentation phase (Phase 16): rewrote README for VS Code Copilot audience, added AGENTS.md and CLAUDE.md, documented fork vs upstream relationship, recorded fork-specific CHANGELOG history through v1.4

### Changed
- `package.json`: updated `description` and `repository.url` to reflect this fork (not upstream)
- `.github/FUNDING.yml`: added comment explaining intentional decision to retain upstream funding link
- `.github/ISSUE_TEMPLATE/bug_report.yml`: replaced upstream-specific fields (npm version check, runtime dropdown) with fork-appropriate AI assistant input field
- `README.md`: removed broken Option A install method (degit `.github`-only copy); removed incorrect "no Node.js required" claims; installation section now directs users to PowerShell installer or release zip
