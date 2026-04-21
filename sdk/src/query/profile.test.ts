/**
 * Tests for profile / learnings query handlers (filesystem writes use temp dirs).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { writeProfile, learningsCopy } from './profile.js';

describe('writeProfile', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gsd-profile-'));
    await mkdir(join(tmpDir, '.planning'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes USER-PROFILE.md from --input JSON', async () => {
    const analysisPath = join(tmpDir, 'analysis.json');
    await writeFile(analysisPath, JSON.stringify({ communication_style: 'terse' }), 'utf-8');
    const result = await writeProfile(['--input', analysisPath], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.written).toBe(true);
    const md = await readFile(join(tmpDir, '.planning', 'USER-PROFILE.md'), 'utf-8');
    expect(md).toContain('User Developer Profile');
    expect(md).toMatch(/Communication Style/i);
  });
});

describe('learningsCopy', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gsd-learn-'));
    await mkdir(join(tmpDir, '.planning'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns copied:false when LEARNINGS.md is missing', async () => {
    const result = await learningsCopy([], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data.copied).toBe(false);
    expect(data.reason).toContain('LEARNINGS');
  });
});
