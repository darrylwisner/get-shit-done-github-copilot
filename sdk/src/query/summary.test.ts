/**
 * Tests for summary / history digest handlers.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { summaryExtract, historyDigest } from './summary.js';

describe('summaryExtract', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gsd-sum-'));
    await mkdir(join(tmpDir, '.planning', 'phases', '01-x'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('extracts headings from a summary file', async () => {
    const rel = '.planning/phases/01-x/01-SUMMARY.md';
    await writeFile(
      join(tmpDir, '.planning', 'phases', '01-x', '01-SUMMARY.md'),
      '# Summary\n\n## What Was Done\n\nBuilt the thing.\n\n## Tests\n\nUnit tests pass.\n',
      'utf-8',
    );
    const r = await summaryExtract([rel], tmpDir);
    const data = r.data as Record<string, Record<string, string>>;
    expect(data.sections.what_was_done).toContain('Built');
  });
});

describe('historyDigest', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gsd-hist-'));
    await mkdir(join(tmpDir, '.planning'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns digest object for project without phases', async () => {
    const r = await historyDigest([], tmpDir);
    const data = r.data as Record<string, unknown>;
    expect(data.phases).toBeDefined();
    expect(data.decisions).toBeDefined();
  });
});
