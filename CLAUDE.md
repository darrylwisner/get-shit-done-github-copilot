## GitHub access

**Always** set `GITHUB_TOKEN` from `.envrc` before any `gh` CLI call:

```bash
export GITHUB_TOKEN=$(grep GITHUB_TOKEN .envrc | cut -d\' -f2)
```

Or prefix every `gh` command:

```bash
GITHUB_TOKEN=$(grep GITHUB_TOKEN .envrc | cut -d\' -f2) gh issue create ...
```

**Never** use the ambient `gh auth` session — it resolves to enterprise credentials that cannot access this repo. The `.envrc` token is the only credential authorised for `gsd-build/get-shit-done`.

---

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`gsd-build/get-shit-done`). Always use the `.envrc` token — never the ambient `gh auth` session. See `docs/agents/issue-tracker.md`.

### Triage labels

Custom label mapping: `confirmed` = AFK-agent-ready (bugs); `approved-enhancement` / `approved-feature` = human-ready (enhancements/features); `needs-reproduction` = waiting on reporter. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — `CONTEXT.md` + `docs/adr/` at the root. See `docs/agents/domain.md`.
