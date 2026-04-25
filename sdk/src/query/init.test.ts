/**
 * Unit tests for init composition handlers.
 *
 * Tests all 13 init handlers plus the withProjectRoot helper.
 * Uses mkdtemp temp directories to simulate .planning/ layout.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  withProjectRoot,
  initExecutePhase,
  initPlanPhase,
  initNewMilestone,
  initQuick,
  initResume,
  initVerifyWork,
  initPhaseOp,
  initTodos,
  initMilestoneOp,
  initMapCodebase,
  initNewWorkspace,
  initListWorkspaces,
  initRemoveWorkspace,
  initIngestDocs,
} from './init.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'gsd-init-'));
  // Create minimal .planning structure
  await mkdir(join(tmpDir, '.planning', 'phases', '09-foundation'), { recursive: true });
  await mkdir(join(tmpDir, '.planning', 'phases', '10-read-only-queries'), { recursive: true });
  // Create config.json
  await writeFile(join(tmpDir, '.planning', 'config.json'), JSON.stringify({
    model_profile: 'balanced',
    commit_docs: false,
    git: {
      branching_strategy: 'none',
      phase_branch_template: 'gsd/phase-{phase}-{slug}',
      milestone_branch_template: 'gsd/{milestone}-{slug}',
      quick_branch_template: null,
    },
    workflow: { research: true, plan_check: true, verifier: true, nyquist_validation: true },
  }));
  // Create STATE.md
  await writeFile(join(tmpDir, '.planning', 'STATE.md'), [
    '---',
    'milestone: v3.0',
    'status: executing',
    '---',
    '',
    '# Project State',
    '',
    '## Current Position',
    '',
    'Phase: 9 (foundation)',
    'Plan: 1 of 3',
    'Status: Executing',
    '',
  ].join('\n'));
  // Create ROADMAP.md with phase sections
  await writeFile(join(tmpDir, '.planning', 'ROADMAP.md'), [
    '# Roadmap',
    '',
    '## v3.0: SDK-First Migration',
    '',
    '### Phase 9: Foundation',
    '',
    '**Goal:** Build foundation',
    '',
    '### Phase 10: Read-Only Queries',
    '',
    '**Goal:** Implement queries',
    '',
  ].join('\n'));
  // Create plan and summary files in phase 09
  await writeFile(join(tmpDir, '.planning', 'phases', '09-foundation', '09-01-PLAN.md'), [
    '---',
    'phase: 09-foundation',
    'plan: 01',
    'wave: 1',
    '---',
    '<objective>Test plan</objective>',
  ].join('\n'));
  await writeFile(join(tmpDir, '.planning', 'phases', '09-foundation', '09-01-SUMMARY.md'), '# Summary');
  await writeFile(join(tmpDir, '.planning', 'phases', '09-foundation', '09-CONTEXT.md'), '# Context');
  await writeFile(join(tmpDir, '.planning', 'phases', '09-foundation', '09-RESEARCH.md'), '# Research');
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('withProjectRoot', () => {
  it('injects project_root, agents_installed, missing_agents into result', () => {
    const result: Record<string, unknown> = { foo: 'bar' };
    const enriched = withProjectRoot(tmpDir, result);
    expect(enriched.project_root).toBe(tmpDir);
    expect(typeof enriched.agents_installed).toBe('boolean');
    expect(Array.isArray(enriched.missing_agents)).toBe(true);
    // Original field preserved
    expect(enriched.foo).toBe('bar');
  });

  it('injects response_language when config has it', () => {
    const result: Record<string, unknown> = {};
    const enriched = withProjectRoot(tmpDir, result, { response_language: 'ja' });
    expect(enriched.response_language).toBe('ja');
  });

  it('does not inject response_language when not in config', () => {
    const result: Record<string, unknown> = {};
    const enriched = withProjectRoot(tmpDir, result, {});
    expect(enriched.response_language).toBeUndefined();
  });
});

describe('initExecutePhase', () => {
  it('returns flat JSON with expected keys for existing phase', async () => {
    const result = await initExecutePhase(['9'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.phase_found).toBe(true);
    expect(data.phase_number).toBe('09');
    expect(data.executor_model).toBeDefined();
    expect(data.commit_docs).toBeDefined();
    expect(data.project_root).toBe(tmpDir);
    expect(data.plans).toBeDefined();
    expect(data.summaries).toBeDefined();
    expect(data.milestone_version).toBeDefined();
  });

  it('returns error when phase arg missing', async () => {
    const result = await initExecutePhase([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeDefined();
  });
});

describe('initPlanPhase', () => {
  it('returns flat JSON with expected keys', async () => {
    const result = await initPlanPhase(['9'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.phase_found).toBe(true);
    expect(data.researcher_model).toBeDefined();
    expect(data.planner_model).toBeDefined();
    expect(data.checker_model).toBeDefined();
    expect(data.research_enabled).toBeDefined();
    expect(data.has_research).toBe(true);
    expect(data.has_context).toBe(true);
    expect(data.project_root).toBe(tmpDir);
  });

  it('returns error when phase arg missing', async () => {
    const result = await initPlanPhase([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeDefined();
  });
});

describe('initNewMilestone', () => {
  it('returns flat JSON with milestone info', async () => {
    const result = await initNewMilestone([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.current_milestone).toBeDefined();
    expect(data.current_milestone_name).toBeDefined();
    expect(data.phase_dir_count).toBeGreaterThanOrEqual(0);
    expect(data.project_root).toBe(tmpDir);
  });
});

describe('initQuick', () => {
  it('returns flat JSON with task info', async () => {
    const result = await initQuick(['my-task'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.quick_id).toBeDefined();
    expect(data.slug).toBe('my-task');
    expect(data.description).toBe('my-task');
    expect(data.planner_model).toBeDefined();
    expect(data.executor_model).toBeDefined();
    expect(data.quick_dir).toBe('.planning/quick');
    expect(data.project_root).toBe(tmpDir);
  });
});

describe('initResume', () => {
  it('returns flat JSON with state info', async () => {
    const result = await initResume([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.state_exists).toBe(true);
    expect(data.roadmap_exists).toBe(true);
    expect(data.project_root).toBe(tmpDir);
    expect(data.commit_docs).toBeDefined();
  });
});

describe('initVerifyWork', () => {
  it('returns flat JSON with expected keys', async () => {
    const result = await initVerifyWork(['9'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.phase_found).toBe(true);
    expect(data.phase_number).toBe('09');
    expect(data.planner_model).toBeDefined();
    expect(data.checker_model).toBeDefined();
    expect(data.project_root).toBe(tmpDir);
  });

  it('returns error when phase arg missing', async () => {
    const result = await initVerifyWork([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeDefined();
  });
});

describe('initPhaseOp', () => {
  it('returns flat JSON with phase artifacts', async () => {
    const result = await initPhaseOp(['9'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.phase_found).toBe(true);
    expect(data.phase_number).toBe('09');
    expect(data.has_research).toBe(true);
    expect(data.has_context).toBe(true);
    expect(data.plan_count).toBeGreaterThanOrEqual(1);
    expect(data.project_root).toBe(tmpDir);
  });
});

describe('initTodos', () => {
  it('returns flat JSON with todo inventory', async () => {
    const result = await initTodos([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.todo_count).toBe(0);
    expect(Array.isArray(data.todos)).toBe(true);
    expect(data.area_filter).toBeNull();
    expect(data.project_root).toBe(tmpDir);
  });

  it('filters by area when provided', async () => {
    const result = await initTodos(['code'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.area_filter).toBe('code');
  });
});

describe('initMilestoneOp', () => {
  it('returns flat JSON with milestone info', async () => {
    const result = await initMilestoneOp([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.milestone_version).toBeDefined();
    expect(data.milestone_name).toBeDefined();
    expect(data.phase_count).toBeGreaterThanOrEqual(0);
    expect(data.completed_phases).toBeGreaterThanOrEqual(0);
    expect(data.project_root).toBe(tmpDir);
  });

  // Regression: #2633 — ROADMAP.md is the authority for current-milestone
  // phase count, not on-disk phase directories. After `phases clear` a new
  // milestone's roadmap may list phases 3/4/5 while only 03 and 04 exist on
  // disk yet. Deriving phase_count from disk yields 2 and falsely flags
  // all_phases_complete=true once both on-disk phases have summaries.
  it('derives phase_count from ROADMAP current milestone, not on-disk dirs (#2633)', async () => {
    // Custom fixture overriding the shared beforeEach: simulate post-cleanup
    // start of v1.1 where roadmap declares phases 3, 4, 5 but only 03 and 04
    // have been materialized on disk (both with summaries).
    const fresh = await mkdtemp(join(tmpdir(), 'gsd-init-2633-'));
    try {
      await mkdir(join(fresh, '.planning', 'phases', '03-alpha'), { recursive: true });
      await mkdir(join(fresh, '.planning', 'phases', '04-beta'), { recursive: true });
      await writeFile(join(fresh, '.planning', 'config.json'), JSON.stringify({
        model_profile: 'balanced',
        workflow: { nyquist_validation: true },
      }));
      await writeFile(join(fresh, '.planning', 'STATE.md'), [
        '---', 'milestone: v1.1', 'milestone_name: Next', 'status: executing', '---', '',
      ].join('\n'));
      await writeFile(join(fresh, '.planning', 'ROADMAP.md'), [
        '# Roadmap', '',
        '## v1.1: Next',
        '',
        '### Phase 3: Alpha', '**Goal:** A', '',
        '### Phase 4: Beta', '**Goal:** B', '',
        '### Phase 5: Gamma', '**Goal:** C', '',
      ].join('\n'));
      // Both on-disk phases have summaries (completed).
      await writeFile(join(fresh, '.planning', 'phases', '03-alpha', '03-01-SUMMARY.md'), '# S');
      await writeFile(join(fresh, '.planning', 'phases', '04-beta', '04-01-SUMMARY.md'), '# S');

      const result = await initMilestoneOp([], fresh);
      const data = result.data as Record<string, unknown>;
      // Roadmap declares 3 phases for the current milestone.
      expect(data.phase_count).toBe(3);
      // Only 2 are materialized + summarized on disk.
      expect(data.completed_phases).toBe(2);
      // Therefore milestone is NOT complete — phase 5 is still outstanding.
      expect(data.all_phases_complete).toBe(false);
    } finally {
      await rm(fresh, { recursive: true, force: true });
    }
  });
});

describe('initMapCodebase', () => {
  it('returns flat JSON with mapper info', async () => {
    const result = await initMapCodebase([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.mapper_model).toBeDefined();
    expect(Array.isArray(data.existing_maps)).toBe(true);
    expect(data.codebase_dir).toBe('.planning/codebase');
    expect(data.project_root).toBe(tmpDir);
  });
});

describe('initNewWorkspace', () => {
  it('returns flat JSON with workspace info', async () => {
    const result = await initNewWorkspace([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.default_workspace_base).toBeDefined();
    expect(typeof data.worktree_available).toBe('boolean');
    expect(data.project_root).toBe(tmpDir);
  });

  it('detects git availability', async () => {
    const result = await initNewWorkspace([], tmpDir);
    const data = result.data as Record<string, unknown>;
    // worktree_available depends on whether git is installed
    expect(typeof data.worktree_available).toBe('boolean');
  });
});

describe('initListWorkspaces', () => {
  it('returns flat JSON with workspaces array', async () => {
    const result = await initListWorkspaces([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.workspaces)).toBe(true);
    expect(data.workspace_count).toBeGreaterThanOrEqual(0);
  });
});

describe('initRemoveWorkspace', () => {
  it('returns error when name arg missing', async () => {
    const result = await initRemoveWorkspace([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeDefined();
  });

  it('rejects path separator in workspace name (T-14-01)', async () => {
    const result = await initRemoveWorkspace(['../../bad'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeDefined();
  });
});

describe('initIngestDocs', () => {
  it('returns flat JSON with ingest-docs branching fields', async () => {
    const result = await initIngestDocs([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.project_exists).toBe(false);
    expect(data.planning_exists).toBe(true);
    expect(typeof data.has_git).toBe('boolean');
    expect(data.project_path).toBe('.planning/PROJECT.md');
    expect(data.commit_docs).toBeDefined();
    expect(data.project_root).toBe(tmpDir);
  });

  it('reports project_exists true when PROJECT.md is present', async () => {
    await writeFile(join(tmpDir, '.planning', 'PROJECT.md'), '# project');
    const result = await initIngestDocs([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.project_exists).toBe(true);
    expect(data.planning_exists).toBe(true);
  });
});
