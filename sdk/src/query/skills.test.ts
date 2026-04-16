/**
 * Tests for agent skills query handler.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { agentSkills } from './skills.js';

describe('agentSkills', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gsd-skills-'));
    await mkdir(join(tmpDir, '.cursor', 'skills', 'my-skill'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns deduped skill names from project skill dirs', async () => {
    const r = await agentSkills(['gsd-executor'], tmpDir);
    const data = r.data as Record<string, unknown>;
    expect(data.skill_count).toBeGreaterThan(0);
    expect((data.skills as string[]).length).toBeGreaterThan(0);
  });
});
