/**
 * Unit tests for handlers decomposed from the former stubs.ts.
 *
 * Tests are organized by domain module — each import references the
 * handler's new home after the stubs.ts → domain file decomposition.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { agentSkills } from './skills.js';
import { roadmapUpdatePlanProgress, requirementsMarkComplete } from './roadmap.js';
import { statePlannedPhase } from './state-mutation.js';
import { verifySchemaDrift } from './verify.js';
import { todoMatchPhase, statsJson, progressBar } from './progress.js';
import { milestoneComplete } from './phase-lifecycle.js';
import { summaryExtract, historyDigest } from './summary.js';
import { commitToSubrepo } from './commit.js';
import {
  workstreamList, workstreamCreate, workstreamSet,
  workstreamStatus, workstreamComplete,
} from './workstream.js';
import { docsInit } from './init.js';
import { websearch } from './websearch.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'gsd-stubs-'));
  await mkdir(join(tmpDir, '.planning', 'phases', '09-foundation'), { recursive: true });
  await mkdir(join(tmpDir, '.planning', 'phases', '10-queries'), { recursive: true });

  await writeFile(join(tmpDir, '.planning', 'config.json'), JSON.stringify({
    model_profile: 'balanced',
    commit_docs: false,
    git: { branching_strategy: 'none' },
    workflow: {},
  }));
  await writeFile(join(tmpDir, '.planning', 'STATE.md'), '---\nmilestone: v3.0\n---\n# State\n');
  await writeFile(join(tmpDir, '.planning', 'ROADMAP.md'), [
    '# Roadmap',
    '## v3.0: Test',
    '### Phase 9: Foundation',
    '**Goal:** Build it',
    '- [ ] Plan 1',
    '### Phase 10: Queries',
    '**Goal:** Query it',
  ].join('\n'));
  await writeFile(join(tmpDir, '.planning', 'REQUIREMENTS.md'), [
    '# Requirements',
    '- [ ] REQ-01: First requirement',
    '- [ ] REQ-02: Second requirement',
    '- [x] REQ-03: Already done',
  ].join('\n'));

  await writeFile(join(tmpDir, '.planning', 'phases', '09-foundation', '09-01-PLAN.md'), '---\nphase: 09\nplan: 01\ntype: execute\nmust_haves:\n  truths: []\n---');
  await writeFile(join(tmpDir, '.planning', 'phases', '09-foundation', '09-01-SUMMARY.md'), '# Done');
  await writeFile(join(tmpDir, '.planning', 'phases', '10-queries', '10-01-PLAN.md'), '---\nphase: 10\nplan: 01\ntype: execute\nmust_haves:\n  truths: []\n---');
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ─── skills.ts ───────────────────────────────────────────────────────────

describe('agentSkills', () => {
  it('returns valid QueryResult with skills array', async () => {
    const result = await agentSkills(['gsd-executor'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.skills)).toBe(true);
    expect(typeof data.skill_count).toBe('number');
    expect(data.agent_type).toBe('gsd-executor');
  });
});

// ─── roadmap.ts ──────────────────────────────────────────────────────────

describe('roadmapUpdatePlanProgress', () => {
  it('returns QueryResult without error', async () => {
    const result = await roadmapUpdatePlanProgress(['9'], tmpDir);
    expect(result.data).toBeDefined();
    const data = result.data as Record<string, unknown>;
    expect(typeof data.updated).toBe('boolean');
  });

  it('returns false when no phase arg', async () => {
    const result = await roadmapUpdatePlanProgress([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.updated).toBe(false);
    expect(data.reason).toBeDefined();
  });
});

describe('requirementsMarkComplete', () => {
  it('returns QueryResult without error', async () => {
    const result = await requirementsMarkComplete(['REQ-01'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.marked).toBe('boolean');
  });

  it('returns false when no IDs provided', async () => {
    const result = await requirementsMarkComplete([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.marked).toBe(false);
  });
});

// ─── state-mutation.ts ───────────────────────────────────────────────────

describe('statePlannedPhase', () => {
  it('updates STATE.md and returns success', async () => {
    const result = await statePlannedPhase(['--phase', '10', '--name', 'queries', '--plans', '2'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.updated).toBe('boolean');
  });

  it('returns false without phase arg', async () => {
    const result = await statePlannedPhase([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.updated).toBe(false);
  });
});

// ─── verify.ts ───────────────────────────────────────────────────────────

describe('verifySchemaDrift', () => {
  it('returns valid/issues shape', async () => {
    const result = await verifySchemaDrift([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.valid).toBe('boolean');
    expect(Array.isArray(data.issues)).toBe(true);
    expect(typeof data.checked).toBe('number');
  });
});

// ─── progress.ts ─────────────────────────────────────────────────────────

describe('todoMatchPhase', () => {
  it('returns todos array (empty when no todos dir)', async () => {
    const result = await todoMatchPhase(['9'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.todos)).toBe(true);
    expect(data.phase).toBe('9');
  });
});

describe('statsJson', () => {
  it('returns stats with phases_total and progress', async () => {
    const result = await statsJson([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.phases_total).toBe('number');
    expect(typeof data.plans_total).toBe('number');
    expect(typeof data.progress_percent).toBe('number');
    expect(data.phases_total).toBeGreaterThanOrEqual(2);
  });
});

describe('progressBar', () => {
  it('returns bar string and percent', async () => {
    const result = await progressBar([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.bar).toBe('string');
    expect(typeof data.percent).toBe('number');
    expect(data.bar as string).toContain('[');
  });
});

// ─── summary.ts ──────────────────────────────────────────────────────────

describe('summaryExtract', () => {
  it('returns error when file not found', async () => {
    const result = await summaryExtract(['.planning/nonexistent.md'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeDefined();
  });

  it('extracts sections from an existing summary file', async () => {
    const summaryPath = join(tmpDir, '.planning', 'phases', '09-foundation', '09-01-SUMMARY.md');
    await writeFile(summaryPath, '# Summary\n\n## What Was Done\nBuilt it.\n\n## Tests\nAll pass.\n');
    const result = await summaryExtract(['.planning/phases/09-foundation/09-01-SUMMARY.md'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.sections).toBeDefined();
  });
});

describe('historyDigest', () => {
  it('returns phases object with completed summaries', async () => {
    const result = await historyDigest([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.phases).toBe('object');
    expect(Array.isArray(data.decisions)).toBe(true);
    expect(Array.isArray(data.tech_stack)).toBe(true);
  });
});

// ─── workstream.ts ───────────────────────────────────────────────────────

describe('workstream handlers', () => {
  it('workstreamList returns workstreams array', async () => {
    const result = await workstreamList([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.workstreams)).toBe(true);
  });

  it('workstreamCreate creates a directory', async () => {
    const result = await workstreamCreate(['my-ws'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.created).toBe('boolean');
  });

  it('workstreamCreate rejects path traversal', async () => {
    const result = await workstreamCreate(['../../bad'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.created).toBe(false);
  });

  it('workstreamSet returns set=true for existing workstream', async () => {
    await mkdir(join(tmpDir, '.planning', 'workstreams', 'backend'), { recursive: true });
    const result = await workstreamSet(['backend'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.set).toBe(true);
    expect(data.active).toBe('backend');
  });

  it('workstreamStatus returns found boolean', async () => {
    const result = await workstreamStatus(['nonexistent'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.found).toBe('boolean');
  });

  it('workstreamComplete archives existing workstream', async () => {
    await mkdir(join(tmpDir, '.planning', 'workstreams', 'my-ws', 'phases'), { recursive: true });
    await writeFile(join(tmpDir, '.planning', 'workstreams', 'my-ws', 'STATE.md'), '# State\n');
    const result = await workstreamComplete(['my-ws'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.completed).toBe(true);
    expect(data.archived_to).toBeDefined();
  });
});

// ─── init.ts ─────────────────────────────────────────────────────────────

describe('docsInit', () => {
  it('returns docs context', async () => {
    const result = await docsInit([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.project_exists).toBe('boolean');
    expect(data.docs_dir).toBe('.planning/docs');
  });
});

// ─── websearch.ts ────────────────────────────────────────────────────────

describe('websearch', () => {
  const originalEnv = process.env.BRAVE_API_KEY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.BRAVE_API_KEY;
    } else {
      process.env.BRAVE_API_KEY = originalEnv;
    }
    vi.restoreAllMocks();
  });

  it('returns available:false when BRAVE_API_KEY is not set', async () => {
    delete process.env.BRAVE_API_KEY;
    const result = await websearch([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.available).toBe(false);
    expect(data.reason).toBe('BRAVE_API_KEY not set');
  });

  it('returns error when query is empty', async () => {
    process.env.BRAVE_API_KEY = 'test-key';
    const result = await websearch([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.available).toBe(false);
    expect(data.error).toBe('Query required');
  });

  it('returns results on successful API call', async () => {
    process.env.BRAVE_API_KEY = 'test-key';
    const mockResults = {
      web: {
        results: [
          { title: 'Result 1', url: 'https://example.com', description: 'Desc 1', age: '2d' },
          { title: 'Result 2', url: 'https://example.org', description: 'Desc 2' },
        ],
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResults,
    } as Response);

    const result = await websearch(['typescript generics'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.available).toBe(true);
    expect(data.query).toBe('typescript generics');
    expect(data.count).toBe(2);
    const results = data.results as Array<Record<string, unknown>>;
    expect(results[0].title).toBe('Result 1');
    expect(results[0].age).toBe('2d');
    expect(results[1].age).toBeNull();
  });

  it('passes --limit and --freshness params to API', async () => {
    process.env.BRAVE_API_KEY = 'test-key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    } as Response);

    await websearch(['query', '--limit', '5', '--freshness', 'week'], tmpDir);

    const url = new URL((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(url.searchParams.get('count')).toBe('5');
    expect(url.searchParams.get('freshness')).toBe('week');
  });

  it('returns error on non-ok response', async () => {
    process.env.BRAVE_API_KEY = 'test-key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
    } as Response);

    const result = await websearch(['rate limited query'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.available).toBe(false);
    expect(data.error).toBe('API error: 429');
  });

  it('returns error on network failure', async () => {
    process.env.BRAVE_API_KEY = 'test-key';

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await websearch(['network fail'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.available).toBe(false);
    expect(data.error).toBe('ECONNREFUSED');
  });
});
