# Dispatch policy module as single seam for query execution outcomes

- **Status:** Accepted
- **Date:** 2026-05-03

We decided to centralize query dispatch outcomes in one Dispatch Policy Module that returns a structured union result (`ok` success or failure with typed `kind`, `details`, and final `exit_code`) instead of mixing throws and ad-hoc error mapping across CLI and SDK paths. This keeps fallback policy, timeout classification, and exit mapping in one place for better locality, prevents drift between native and fallback behavior, and makes callers thin adapters over a stable interface.

## Amendment (2026-05-03): query seam deepening completion

To complete the query architecture pass, we deepened adjacent seams around the Dispatch Policy Module:

- Extracted **Query Runtime Context Module** to own `projectDir` + `ws` resolution policy.
- Extracted **Native Dispatch Adapter Module** so Dispatch Policy consumes a stable native dispatch Interface (not closure-wired call sites).
- Extracted **Query CLI Output Module** to own projection from dispatch results/errors to CLI output contract.
- Converged internal command-resolution and policy imports onto canonical modules and removed dead wrapper modules.
- Added **Command Topology Module** as dispatch-facing seam that resolves commands, projects command policy, binds handler Adapters, and emits no-match diagnosis consumed by Dispatch Policy.
- Locked **pre-project query config policy** for parity-sensitive query Interfaces: when `.planning/config.json` is absent, use built-in defaults and parity-aligned empty model ids for model-resolution surfaces.
- Gated real-CLI SDK E2E suites behind explicit opt-in (`GSD_ENABLE_E2E=1`) to keep default CI/local verification deterministic while preserving full-path validation when requested.

### Dead-wrapper convergence

Removed wrapper Modules after call-site convergence:
- `normalize-query-command.ts`
- `command-resolution.ts`
- `policy-convergence.ts`
- `query-policy-snapshot.ts`
- `query-registry-capability.ts`

This amendment preserves the original ADR direction: keep policy depth high, adapters thin, and locality concentrated in explicit modules.

## Amendment (2026-05-05): SDK Runtime Bridge seam deepening

To make SDK dispatch a cleaner publishable seam, we deepened `GSDTools` dispatch behind one **SDK Runtime Bridge Module** (`sdk/src/query-runtime-bridge.ts`) and converged policy wiring into that seam:

- `GSDTools` callers now route through one runtime bridge Interface for command resolution, execution, and hotpath dispatch.
- Added explicit fallback policy at the seam (`allowFallbackToSubprocess`) instead of implicit transport behavior.
- Added strict native-only enforcement mode (`strictSdk`) so SDK consumers can fail fast when a command lacks a native adapter.
- Added structured bridge observability (`onDispatchEvent`) for dispatch mode, fallback reason, latency, outcome, and error kind.
- Kept transport and command callers as thin adapters over the bridge seam.

This continues the dispatch-policy design goal: deep policy Modules, thin Adapters, and high locality for behavior changes.
