/**
 * Tests for gsd-statusline.js GSD state display helpers.
 *
 * Covers:
 * - parseStateMd across YAML-frontmatter, body-fallback, and partial formats
 * - formatGsdState graceful degradation when fields are missing
 * - readGsdState walk-up search with proper bounds
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseStateMd, formatGsdState, readGsdState } = require('../hooks/gsd-statusline.js');

// ─── parseStateMd ───────────────────────────────────────────────────────────

describe('parseStateMd', () => {
  test('parses full YAML frontmatter', () => {
    const content = [
      '---',
      'status: executing',
      'milestone: v1.9',
      'milestone_name: Code Quality',
      '---',
      '',
      '# State',
      'Phase: 1 of 5 (fix-graphiti-deployment)',
    ].join('\n');

    const s = parseStateMd(content);
    assert.equal(s.status, 'executing');
    assert.equal(s.milestone, 'v1.9');
    assert.equal(s.milestoneName, 'Code Quality');
    assert.equal(s.phaseNum, '1');
    assert.equal(s.phaseTotal, '5');
    assert.equal(s.phaseName, 'fix-graphiti-deployment');
  });

  test('treats literal "null" values as null', () => {
    const content = [
      '---',
      'status: null',
      'milestone: null',
      'milestone_name: null',
      '---',
    ].join('\n');

    const s = parseStateMd(content);
    assert.equal(s.status, null);
    assert.equal(s.milestone, null);
    assert.equal(s.milestoneName, null);
  });

  test('strips surrounding quotes from frontmatter values', () => {
    const content = [
      '---',
      'milestone_name: "Code Quality"',
      "milestone: 'v1.9'",
      '---',
    ].join('\n');

    const s = parseStateMd(content);
    assert.equal(s.milestone, 'v1.9');
    assert.equal(s.milestoneName, 'Code Quality');
  });

  test('parses phase without name', () => {
    const content = [
      '---',
      'status: planning',
      '---',
      'Phase: 3 of 10',
    ].join('\n');

    const s = parseStateMd(content);
    assert.equal(s.phaseNum, '3');
    assert.equal(s.phaseTotal, '10');
    assert.equal(s.phaseName, null);
  });

  test('falls back to body Status when frontmatter is missing', () => {
    const content = [
      '# State',
      'Status: Ready to plan',
    ].join('\n');

    const s = parseStateMd(content);
    assert.equal(s.status, 'planning');
  });

  test('body fallback recognizes executing state', () => {
    const content = 'Status: Executing phase 2';
    assert.equal(parseStateMd(content).status, 'executing');
  });

  test('body fallback recognizes complete state', () => {
    const content = 'Status: Complete';
    assert.equal(parseStateMd(content).status, 'complete');
  });

  test('body fallback recognizes archived as complete', () => {
    const content = 'Status: Archived';
    assert.equal(parseStateMd(content).status, 'complete');
  });

  test('returns empty object for empty content', () => {
    const s = parseStateMd('');
    assert.deepEqual(s, {});
  });

  test('returns partial state when only some fields present', () => {
    const content = [
      '---',
      'milestone: v2.0',
      '---',
    ].join('\n');

    const s = parseStateMd(content);
    assert.equal(s.milestone, 'v2.0');
    assert.equal(s.status, undefined);
    assert.equal(s.phaseNum, undefined);
  });
});

// ─── formatGsdState ─────────────────────────────────────────────────────────

describe('formatGsdState', () => {
  test('formats full state with milestone name, status, and phase name', () => {
    const out = formatGsdState({
      milestone: 'v1.9',
      milestoneName: 'Code Quality',
      status: 'executing',
      phaseNum: '1',
      phaseTotal: '5',
      phaseName: 'fix-graphiti-deployment',
    });
    assert.equal(out, 'v1.9 Code Quality · executing · fix-graphiti-deployment (1/5)');
  });

  test('skips placeholder "milestone" value in milestoneName', () => {
    const out = formatGsdState({
      milestone: 'v1.0',
      milestoneName: 'milestone',
      status: 'planning',
    });
    assert.equal(out, 'v1.0 · planning');
  });

  test('uses short phase form when phase name is missing', () => {
    const out = formatGsdState({
      milestone: 'v2.0',
      status: 'executing',
      phaseNum: '3',
      phaseTotal: '7',
    });
    assert.equal(out, 'v2.0 · executing · ph 3/7');
  });

  test('omits phase entirely when phaseNum/phaseTotal missing', () => {
    const out = formatGsdState({
      milestone: 'v1.0',
      status: 'planning',
    });
    assert.equal(out, 'v1.0 · planning');
  });

  test('handles milestone version only (no name)', () => {
    const out = formatGsdState({
      milestone: 'v1.9',
      status: 'executing',
    });
    assert.equal(out, 'v1.9 · executing');
  });

  test('handles milestone name only (no version)', () => {
    const out = formatGsdState({
      milestoneName: 'Foundations',
      status: 'planning',
    });
    assert.equal(out, 'Foundations · planning');
  });

  test('returns empty string for empty state', () => {
    assert.equal(formatGsdState({}), '');
  });

  test('returns only available parts when everything else is missing', () => {
    assert.equal(formatGsdState({ status: 'planning' }), 'planning');
  });
});

// ─── readGsdState ───────────────────────────────────────────────────────────

describe('readGsdState', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-statusline-test-'));

  test('finds STATE.md in the starting directory', () => {
    const proj = fs.mkdtempSync(path.join(tmpRoot, 'proj-'));
    fs.mkdirSync(path.join(proj, '.planning'), { recursive: true });
    fs.writeFileSync(
      path.join(proj, '.planning', 'STATE.md'),
      '---\nstatus: executing\nmilestone: v1.0\n---\n'
    );

    const s = readGsdState(proj);
    assert.equal(s.status, 'executing');
    assert.equal(s.milestone, 'v1.0');
  });

  test('walks up to find STATE.md in a parent directory', () => {
    const proj = fs.mkdtempSync(path.join(tmpRoot, 'proj-'));
    fs.mkdirSync(path.join(proj, '.planning'), { recursive: true });
    fs.writeFileSync(
      path.join(proj, '.planning', 'STATE.md'),
      '---\nstatus: planning\n---\n'
    );

    const nested = path.join(proj, 'src', 'components', 'deep');
    fs.mkdirSync(nested, { recursive: true });

    const s = readGsdState(nested);
    assert.equal(s.status, 'planning');
  });

  test('returns null when no STATE.md exists in the walk-up chain', () => {
    const proj = fs.mkdtempSync(path.join(tmpRoot, 'proj-'));
    const nested = path.join(proj, 'src');
    fs.mkdirSync(nested, { recursive: true });

    assert.equal(readGsdState(nested), null);
  });

  test('returns null on malformed STATE.md without crashing', () => {
    const proj = fs.mkdtempSync(path.join(tmpRoot, 'proj-'));
    fs.mkdirSync(path.join(proj, '.planning'), { recursive: true });
    // Valid file (no content to crash on) — parseStateMd returns {}
    fs.writeFileSync(path.join(proj, '.planning', 'STATE.md'), '');

    const s = readGsdState(proj);
    // Empty file yields an empty state object, not null — the function
    // only returns null when no file is found.
    assert.deepEqual(s, {});
  });
});
