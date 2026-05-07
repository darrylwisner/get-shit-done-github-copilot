# Domain Docs

How engineering skills consume this repo's domain documentation.

## Layout: single-context

```
/
├── CONTEXT.md          ← domain glossary + recurring PR rules + workflow learnings
├── docs/adr/           ← architectural decisions
│   ├── 0001-dispatch-policy-module.md
│   └── 0002-command-contract-validation-module.md
└── ...
```

## Before exploring, read these

1. **`CONTEXT.md`** at the repo root — domain terms, module names, recurring PR mistakes, workflow learnings. Read in full before naming anything or proposing architecture changes.
2. **`docs/adr/`** — read ADRs relevant to the area you're working in before proposing structural changes. If your output contradicts an ADR, surface it explicitly:
   > *Contradicts ADR-0002 — but worth reopening because…*

If either file doesn't exist yet, proceed silently.

## Use the glossary's vocabulary

When naming modules, writing issue titles, test descriptions, or commit messages — use terms as defined in `CONTEXT.md`. Don't drift to synonyms. If you need a concept that isn't in the glossary, note it for `/grill-with-docs` rather than inventing language.

## CONTEXT.md sections

- **Domain terms** — canonical module names and seam vocabulary (Dispatch Policy Module, Command Contract Validation Module, etc.)
- **Recurring PR mistakes** — CodeRabbit findings that recur; check before writing tests, shell scripts, changesets, or docs
- **Workflow learnings** — patterns learned from triage + PR cycles; check before writing new command/workflow files or test paths
