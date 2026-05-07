# Issue tracker: GitHub

Issues for this repo live in **GitHub Issues** at `gsd-build/get-shit-done`.

## Auth

Always read the token from `.envrc` — never use the ambient `gh auth` session (it resolves to enterprise credentials that cannot access this repo):

```bash
export GITHUB_TOKEN=$(grep GITHUB_TOKEN .envrc | cut -d\' -f2)
# or inline:
GITHUB_TOKEN=$(grep GITHUB_TOKEN .envrc | cut -d\' -f2) gh issue create ...
```

## Conventions

- **Create**: `gh issue create --repo gsd-build/get-shit-done --title "..." --body "..."`
- **Read**: `gh issue view <number> --repo gsd-build/get-shit-done --comments`
- **List**: `gh issue list --repo gsd-build/get-shit-done --state open --json number,title,labels --jq '...'`
- **Comment**: `gh issue comment <number> --repo gsd-build/get-shit-done --body "..."`
- **Label**: `gh issue edit <number> --repo gsd-build/get-shit-done --add-label "..." --remove-label "..."`
- **Close**: `gh issue close <number> --repo gsd-build/get-shit-done --comment "..."`

Always pass `--repo gsd-build/get-shit-done` explicitly — the local clone has multiple remotes and `gh` may resolve to the wrong one.

## When a skill says "publish to the issue tracker"

Create a GitHub issue at `gsd-build/get-shit-done`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --repo gsd-build/get-shit-done --comments`.
