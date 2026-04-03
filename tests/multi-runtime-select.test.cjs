/**
 * Tests for multi-runtime selection in the interactive installer prompt.
 * Verifies that promptRuntime accepts comma-separated, space-separated,
 * and single-choice inputs, deduplicates, and falls back to claude.
 * See issue #1281.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Read install.js source to extract the runtimeMap and parsing logic
const installSrc = fs.readFileSync(
  path.join(__dirname, '..', 'bin', 'install.js'),
  'utf8'
);

// Extract runtimeMap from source for validation
const runtimeMap = {
  '1': 'claude',
  '2': 'kilo',
  '3': 'opencode',
  '4': 'gemini',
  '5': 'codex',
  '6': 'copilot',
  '7': 'antigravity',
  '8': 'cursor',
  '9': 'windsurf',
  '10': 'augment'
};
const allRuntimes = ['claude', 'kilo', 'opencode', 'gemini', 'codex', 'copilot', 'antigravity', 'cursor', 'windsurf', 'augment'];

/**
 * Simulate the parsing logic from promptRuntime without requiring readline.
 * This mirrors the exact logic in the rl.question callback.
 */
function parseRuntimeInput(input) {
  input = input.trim() || '1';

  if (input === '11') {
    return allRuntimes;
  }

  const choices = input.split(/[\s,]+/).filter(Boolean);
  const selected = [];
  for (const c of choices) {
    const runtime = runtimeMap[c];
    if (runtime && !selected.includes(runtime)) {
      selected.push(runtime);
    }
  }

  return selected.length > 0 ? selected : ['claude'];
}

describe('multi-runtime selection parsing', () => {
  test('single choice returns single runtime', () => {
    assert.deepStrictEqual(parseRuntimeInput('1'), ['claude']);
    assert.deepStrictEqual(parseRuntimeInput('2'), ['kilo']);
    assert.deepStrictEqual(parseRuntimeInput('3'), ['opencode']);
    assert.deepStrictEqual(parseRuntimeInput('4'), ['gemini']);
    assert.deepStrictEqual(parseRuntimeInput('5'), ['codex']);
    assert.deepStrictEqual(parseRuntimeInput('8'), ['cursor']);
  });

  test('comma-separated choices return multiple runtimes', () => {
    assert.deepStrictEqual(parseRuntimeInput('1,5,7'), ['claude', 'codex', 'antigravity']);
    assert.deepStrictEqual(parseRuntimeInput('2,3'), ['kilo', 'opencode']);
    assert.deepStrictEqual(parseRuntimeInput('3,4'), ['opencode', 'gemini']);
  });

  test('space-separated choices return multiple runtimes', () => {
    assert.deepStrictEqual(parseRuntimeInput('1 5 7'), ['claude', 'codex', 'antigravity']);
    assert.deepStrictEqual(parseRuntimeInput('6 8'), ['copilot', 'cursor']);
  });

  test('mixed comma and space separators work', () => {
    assert.deepStrictEqual(parseRuntimeInput('1, 5, 7'), ['claude', 'codex', 'antigravity']);
    assert.deepStrictEqual(parseRuntimeInput('2 , 6'), ['kilo', 'copilot']);
  });

  test('single choice for windsurf', () => {
    assert.deepStrictEqual(parseRuntimeInput('9'), ['windsurf']);
  });

  test('single choice for augment', () => {
    assert.deepStrictEqual(parseRuntimeInput('10'), ['augment']);
  });

  test('choice 11 returns all runtimes', () => {
    assert.deepStrictEqual(parseRuntimeInput('11'), allRuntimes);
  });

  test('empty input defaults to claude', () => {
    assert.deepStrictEqual(parseRuntimeInput(''), ['claude']);
    assert.deepStrictEqual(parseRuntimeInput('   '), ['claude']);
  });

  test('invalid choices are ignored, falls back to claude if all invalid', () => {
    assert.deepStrictEqual(parseRuntimeInput('12'), ['claude']);
    assert.deepStrictEqual(parseRuntimeInput('0'), ['claude']);
    assert.deepStrictEqual(parseRuntimeInput('abc'), ['claude']);
  });

  test('invalid choices mixed with valid are filtered out', () => {
    assert.deepStrictEqual(parseRuntimeInput('1,11,5'), ['claude', 'codex']);
    assert.deepStrictEqual(parseRuntimeInput('abc 3 xyz'), ['opencode']);
  });

  test('duplicate choices are deduplicated', () => {
    assert.deepStrictEqual(parseRuntimeInput('1,1,1'), ['claude']);
    assert.deepStrictEqual(parseRuntimeInput('5,5,7,7'), ['codex', 'antigravity']);
  });

  test('preserves selection order', () => {
    assert.deepStrictEqual(parseRuntimeInput('7,1,5'), ['antigravity', 'claude', 'codex']);
    assert.deepStrictEqual(parseRuntimeInput('8,2,6'), ['cursor', 'kilo', 'copilot']);
  });
});

describe('install.js source contains multi-select support', () => {
  test('runtimeMap is defined with all 10 runtimes', () => {
    for (const [key, name] of Object.entries(runtimeMap)) {
      assert.ok(
        installSrc.includes(`'${key}': '${name}'`),
        `runtimeMap has ${key} -> ${name}`
      );
    }
  });

  test('allRuntimes array contains all runtimes', () => {
    const match = installSrc.match(/const allRuntimes = \[([^\]]+)\]/);
    assert.ok(match, 'allRuntimes array found');
    for (const rt of allRuntimes) {
      assert.ok(match[1].includes(`'${rt}'`), `allRuntimes includes ${rt}`);
    }
  });

  test('all shortcut uses option 11', () => {
    assert.ok(
      installSrc.includes("if (input === '11')"),
      'all shortcut uses option 11'
    );
  });

  test('prompt lists Augment as option 10 and All as option 11', () => {
    assert.ok(
      installSrc.includes('10${reset}) Augment'),
      'prompt lists Augment as option 10'
    );
    assert.ok(
      installSrc.includes('11${reset}) All'),
      'prompt lists All as option 11'
    );
  });

  test('prompt text shows multi-select hint', () => {
    assert.ok(
      installSrc.includes('Select multiple'),
      'prompt includes multi-select instructions'
    );
  });

  test('parsing uses split with comma and space regex', () => {
    assert.ok(
      installSrc.includes("split(/[\\s,]+/)"),
      'input is split on commas and whitespace'
    );
  });

  test('deduplication check exists', () => {
    assert.ok(
      installSrc.includes('!selected.includes(runtime)'),
      'deduplication guard exists'
    );
  });
});
