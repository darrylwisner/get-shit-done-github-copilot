# GSD Copilot Installer

Install GSD Copilot files into your VS Code workspace with a single PowerShell command — no Node.js required.

---

## Prerequisites

- **PowerShell 5.1+** — built into Windows 10 and Windows 11 (no install needed)
- Internet access to download from GitHub Releases
- No Node.js, npm, or any other runtime required

---

## Quick Start

### One-liner (recommended)

Open a PowerShell terminal in your project root and run:

```powershell
irm "https://raw.githubusercontent.com/darrylwisner/get-shit-done-github-copilot/main/gsd-copilot-installer/install.ps1" | iex
```

This pipes the script directly into PowerShell without saving it to disk, so execution policy is never an issue.

To pass arguments (e.g. a specific tag):

```powershell
& ([scriptblock]::Create((irm "https://raw.githubusercontent.com/darrylwisner/get-shit-done-github-copilot/main/gsd-copilot-installer/install.ps1"))) -Tag v1.0.0
```

### Download-then-run

If you prefer to inspect the script first:

```powershell
# 1. Download the installer
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/darrylwisner/get-shit-done-github-copilot/main/gsd-copilot-installer/install.ps1" -OutFile install.ps1

# 2. Unblock it (removes the internet zone mark Windows adds to downloaded files)
Unblock-File install.ps1

# 3. Run it
.\install.ps1

# 4. Clean up
Remove-Item install.ps1
```

> **Note:** Step 2 (`Unblock-File`) is required. Without it, Windows blocks the script because it was downloaded from the internet and is not digitally signed.

### Installing from the release zip

If you extracted the release zip and want to run `install.ps1` from the extracted `gsd-copilot-installer/` folder, you **must** target your project root explicitly — running the installer from its own directory is blocked with a clear error.

```powershell
# Run from anywhere — point -WorkspaceDir at your project root
Unblock-File .\gsd-copilot-installer\install.ps1
.\gsd-copilot-installer\install.ps1 -WorkspaceDir "C:\path\to\your-project"
```

Or `cd` to your project root first, then unblock and run:

```powershell
cd "C:\path\to\your-project"
Unblock-File .\path\to\gsd-copilot-installer\install.ps1
.\path\to\gsd-copilot-installer\install.ps1
```

That's it. GSD Copilot is now set up in your workspace.

---

## What Gets Installed

The installer writes into two top-level directories:

**`.github/` (Copilot layer)**
- `.github/prompts/` — VS Code slash command prompts (e.g. `/gsd.new-project`)
- `.github/instructions/` — Reusable instruction files for Copilot context

**`.claude/` (GSD runtime)**
- `.claude/commands/gsd/` — Upstream GSD command definitions
- `.claude/get-shit-done/` — GSD runtime: workflows, references, templates, bin
- `.claude/agents/` — GSD agent definitions
- `.claude/hooks/` — GSD hook scripts
- `.claude/package.json` — CommonJS mode marker required by the GSD runtime

Non-GSD files in `.github/` (your workflows, issue templates, etc.) are never touched.
All files under `.claude/` in the workspace are GSD-owned and will be overwritten on upgrade.

---

## Options

| Flag | Description | Example |
|------|-------------|---------|
| `-Tag <version>` | Install a specific release tag instead of latest | `.\install.ps1 -Tag v1.2.0` |
| `-DryRun` | Preview what would be installed without writing any files | `.\install.ps1 -DryRun` |
| `-Force` | Skip overwrite warnings; also overrides the downgrade block | `.\install.ps1 -Force` |
| `-Verbose` | Show file-by-file output as the install runs | `.\install.ps1 -Verbose` |
| `-WorkspaceDir <path>` | Target a directory other than the current one | `.\install.ps1 -WorkspaceDir C:\myproject` |

---

## Upgrading

Re-run the same install command. GSD-owned files are overwritten with a warning; non-GSD files are untouched.

## Downgrades

Blocked by default — the installer exits with an error if the installed version is newer than the target. Use `-Force` to override.

---

## Safety

- **Never touches non-GSD files** — only files from the release zip are written; your workflows, templates, and other `.github/` content remain unchanged.
- **No backup created** — the installer relies on your workspace being under git version control. Run `git status` first if you're unsure.

---

## Version Tracking

After a successful install, `.github/.gsd-version` is written with the installed version string. This file is used for downgrade detection on subsequent runs.
