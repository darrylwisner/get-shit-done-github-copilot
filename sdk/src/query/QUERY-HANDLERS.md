# Query handler conventions (`sdk/src/query/`)

This document records contracts for the typed query layer consumed by `gsd-sdk query` and programmatic `createRegistry()` callers.

## `gsd-sdk query` routing

- **Longest-prefix match** on argv (`resolveQueryArgv` in `registry.ts`): tries joined keys `a.b.c` then `a b c` for each prefix length, longest first. Example: `state update status X` → handler `state.update` with args `[status, X]`.
- **Dotted single token**: one token like `init.new-project` matches the registry; if the first pass finds no handler, a single dotted token is split and matching runs again (same helper as above).
- **No CJS passthrough**: if nothing matches a registered handler, the CLI exits with an error. Operations not ported to the query registry (e.g. `audit-open`, `graphify`, `from-gsd2`, `state validate`) must use `node …/gsd-tools.cjs` directly — see `docs/CLI-TOOLS.md`.
- **Output**: JSON written to stdout for successful handler results.

## Error handling

- **Validation and programmer errors**: Handlers throw `GSDError` with an `ErrorClassification` (e.g. missing required args, invalid phase). The CLI maps these to exit codes via `exitCodeFor()`.
- **Expected domain failures**: Handlers return `{ data: { error: string, ... } }` for cases that are not exceptional in normal use (file not found, intel disabled, todo missing, etc.). Callers must check `data.error` when present.
- Do not mix both styles for the same failure mode in new code: prefer **throw** for "caller must fix input"; prefer **`data.error`** for "operation could not complete in this project state."

## Mutation commands and events

- `QUERY_MUTATION_COMMANDS` in `index.ts` lists every command name (including space-delimited aliases) that performs durable writes. It drives optional `GSDEventStream` wrapping so mutations emit structured events.
- Init composition handlers (`init.*`) are **not** included: they return JSON for workflows; agents perform filesystem work.

## Session correlation (`sessionId`)

- Mutation events include `sessionId: ''` until a future phase threads session identifiers through the query dispatch path. Consumers should not rely on `sessionId` for correlation today.

## Lockfiles (`state-mutation.ts`)

- `STATE.md` (and ROADMAP) locks use a sibling `.lock` file with the holder's PID. Stale locks are cleared when the PID no longer exists (`process.kill(pid, 0)` fails) or when the lock file is older than the existing time-based threshold.

## Intel JSON search

- `searchJsonEntries` in `intel.ts` caps recursion depth (`MAX_JSON_SEARCH_DEPTH`) to avoid stack overflow on pathological nested JSON.
