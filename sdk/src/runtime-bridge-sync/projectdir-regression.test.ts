/**
 * Regression test for the Phase 5.0 worker bug: projectDir and workstream were
 * dropped from RuntimeBridgeExecuteInput before being forwarded to
 * registry.dispatch(). The worker constructed a module-scoped
 * QueryNativeDirectAdapter with a hardcoded projectDir='' — meaning any handler
 * that reads .planning/ (e.g. state.*) would either fail silently or read from
 * the process CWD rather than the requested project directory.
 *
 * Fix (Phase 5.1): the adapter is now constructed per-request inside
 * dispatchNative so request.projectDir and request.workstream close over the
 * correct values.
 *
 * These tests must:
 * - FAIL against the unfixed worker (projectDir='', handler sees wrong dir).
 * - PASS against the fixed worker (projectDir threaded correctly).
 *
 * NOTE: executeForCjs uses a compiled dist/ worker (see index.ts comments).
 * The tests here call executeForCjs, which requires the worker to be rebuilt
 * before the fix is observable. Run `npm run build` in sdk/ first.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { executeForCjs } from './index.js';

// ─── Fixture STATE.md with parseable frontmatter ──────────────────────────

const FIXTURE_STATE = `---
gsd_state_version: 1.0
milestone: v9.1
milestone_name: Regression Test Milestone
status: executing
---

# Project State

## Current Position

Phase: 9 (Regression Tests) — EXECUTING
Plan: 1 of 2
Status: Executing Phase 9
Last activity: 2026-05-15 -- Regression test started

Progress: [█████░░░░░] 50%
`;

// ─── Helpers ───────────────────────────────────────────────────────────────

let tmpDir: string;

beforeAll(async () => {
  tmpDir = join(
    tmpdir(),
    `gsd-projectdir-regression-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(join(tmpDir, '.planning'), { recursive: true });
  await writeFile(join(tmpDir, '.planning', 'STATE.md'), FIXTURE_STATE, 'utf-8');
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('executeForCjs projectDir regression (Phase 5.0 bug)', () => {
  it('threads projectDir to the handler: state.json returns frontmatter data from the tmpdir fixture', () => {
    // This test FAILS against the unfixed worker because projectDir='' causes
    // the handler to look for .planning/STATE.md relative to '' (process CWD),
    // which does not have a STATE.md fixture. The handler returns { error: 'STATE.md not found' }.
    //
    // With the fix, projectDir=tmpDir is forwarded and the handler reads the fixture.
    const result = executeForCjs({
      registryCommand: 'state.json',
      registryArgs: [],
      legacyCommand: 'state',
      legacyArgs: ['json'],
      mode: 'json',
      projectDir: tmpDir,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrow for TS

    const data = result.data as Record<string, unknown>;

    // The handler should have found the fixture and returned parsed frontmatter.
    // Key assertions: these fields come from FIXTURE_STATE and are absent from
    // any STATE.md that might exist at ''.
    expect(data).not.toHaveProperty('error');
    expect(data.milestone).toBe('v9.1');
    expect(data.milestone_name).toBe('Regression Test Milestone');
    expect(data.status).toBe('executing');
  });

  it('negative: nonexistent projectDir returns ok:true with {error} (handler-level not-found)', () => {
    // A completely nonexistent directory: handler cannot find .planning/STATE.md
    // and returns a structured error payload rather than throwing. This is the
    // expected "soft failure" shape for state.json on a missing project.
    const result = executeForCjs({
      registryCommand: 'state.json',
      registryArgs: [],
      legacyCommand: 'state',
      legacyArgs: ['json'],
      mode: 'json',
      projectDir: '/nonexistent-gsd-project-regression-test-dir',
    });

    // The handler returns { data: { error: 'STATE.md not found' } } — ok:true
    // because it is a domain-level not-found, not a dispatch error.
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('error');
    expect(String(data.error)).toMatch(/STATE\.md not found/i);
  });

  it('workstream transport contract: GSDTransport forces subprocess for workstream requests (subprocess disabled in worker → ok:false)', () => {
    // This test documents an architectural constraint, not a bug.
    //
    // GSDTransport.subprocessReason() returns 'workstream_forced' when
    // request.workstream is set (gsd-transport.ts line ~72). The worker has
    // subprocess disabled (allowFallbackToSubprocess=false), so a workstream
    // request always surfaces as ok:false / internal_error.
    //
    // This is the expected contract for the sync bridge worker: workstream
    // scoped commands cannot run natively in the worker and must be invoked
    // via the async bridge or gsd-tools.cjs subprocess fallback instead.
    //
    // This test is here to document + pin the behavior, not to assert a fix.
    const result = executeForCjs({
      registryCommand: 'state.json',
      registryArgs: [],
      legacyCommand: 'state',
      legacyArgs: ['json'],
      mode: 'json',
      projectDir: tmpDir,
      workstream: 'some-workstream',
    });

    // Workstream forces subprocess; subprocess disabled → ok:false.
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The error surfaces as internal_error because 'Subprocess fallback disabled'
    // does not match the unknown_command classifier pattern.
    expect(['internal_error', 'unknown_command']).toContain(result.errorKind);
  });
});
