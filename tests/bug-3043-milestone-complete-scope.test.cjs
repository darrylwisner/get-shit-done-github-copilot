const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createTempProject, cleanup, runGsdTools } = require('./helpers.cjs');

describe('bug #3043: milestone complete respects explicit version scope', () => {
  test('milestone.complete v3.6 uses v3.6 phases even when STATE milestone is v3.5', () => {
    const tmpDir = createTempProject('gsd-bug-3043-');
    try {
      fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), '---\nmilestone: v3.5\n---\n');
      fs.writeFileSync(
        path.join(tmpDir, '.planning', 'ROADMAP.md'),
        '# Roadmap\n\n## 🚧 v3.5 Paused\n### Phase 103: old\n### Phase 104: old2\n\n## 🚧 v3.6 Current\n### Phase 108: new\n',
      );
      fs.writeFileSync(path.join(tmpDir, '.planning', 'REQUIREMENTS.md'), '# Requirements\n');

      const oldDirA = path.join(tmpDir, '.planning', 'phases', '103.old');
      const oldDirB = path.join(tmpDir, '.planning', 'phases', '104.old');
      const newDir = path.join(tmpDir, '.planning', 'phases', '108.new');
      fs.mkdirSync(oldDirA, { recursive: true });
      fs.mkdirSync(oldDirB, { recursive: true });
      fs.mkdirSync(newDir, { recursive: true });
      fs.writeFileSync(path.join(oldDirA, 'SUMMARY.md'), 'one-liner: old milestone A\n\n## Summary\nold\n');
      fs.writeFileSync(path.join(oldDirB, 'SUMMARY.md'), 'one-liner: old milestone B\n\n## Summary\nold\n');
      fs.writeFileSync(path.join(newDir, 'SUMMARY.md'), 'one-liner: new milestone\n\n## Summary\nnew\n');

      const result = runGsdTools(['milestone', 'complete', 'v3.6', '--raw'], tmpDir);
      assert.equal(result.success, true, result.error || result.output);
      const payload = JSON.parse(result.output);

      assert.equal(payload.version, 'v3.6');
      assert.equal(payload.phases, 1, `expected v3.6 to scope to one phase, got ${payload.phases}`);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('milestone.complete fails when explicit milestone version resolves no phases', () => {
    const tmpDir = createTempProject('gsd-bug-3043-empty-');
    try {
      fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), '---\nmilestone: v1.0\n---\n');
      fs.writeFileSync(
        path.join(tmpDir, '.planning', 'ROADMAP.md'),
        '# Roadmap\n\n## 🚧 v1.0\n### Phase 1: foundation\n',
      );
      fs.writeFileSync(path.join(tmpDir, '.planning', 'REQUIREMENTS.md'), '# Requirements\n');
      fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-foundation'), { recursive: true });

      const result = runGsdTools(['milestone', 'complete', 'v9.9', '--raw'], tmpDir);
      assert.equal(result.success, false, 'expected command to fail when no phases match explicit version');
      assert.match(result.error || '', /no phases|phase/i);
    } finally {
      cleanup(tmpDir);
    }
  });
});
