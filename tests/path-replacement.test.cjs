/**
 * GSD Tests - path replacement in install.js
 *
 * Verifies that global installs produce ~/ paths in .md files,
 * never resolved absolute paths containing os.homedir().
 * Reproduces the bug where Windows installs write C:/Users/...
 * paths that break in Docker containers.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const repoRoot = path.join(__dirname, '..');

// Simulate the pathPrefix computation from install.js (global install)
function computePathPrefix(homedir, targetDir) {
  return path.resolve(targetDir).replace(homedir, '~').replace(/\\/g, '/') + '/';
}

describe('pathPrefix computation', () => {
  test('default Claude global install uses ~/', () => {
    const homedir = os.homedir();
    const targetDir = path.join(homedir, '.claude');
    const prefix = computePathPrefix(homedir, targetDir);
    assert.strictEqual(prefix, '~/.claude/');
  });

  test('default Gemini global install uses ~/', () => {
    const homedir = os.homedir();
    const targetDir = path.join(homedir, '.gemini');
    const prefix = computePathPrefix(homedir, targetDir);
    assert.strictEqual(prefix, '~/.gemini/');
  });

  test('custom config dir under home uses ~/', () => {
    const homedir = os.homedir();
    const targetDir = path.join(homedir, '.config', 'claude');
    const prefix = computePathPrefix(homedir, targetDir);
    assert.ok(prefix.startsWith('~/'), `Expected ~/ prefix, got: ${prefix}`);
    assert.ok(!prefix.includes(homedir), `Should not contain homedir: ${homedir}`);
  });

  test('Windows-style paths produce ~/ not C:/', () => {
    // On Windows, path.resolve returns the input unchanged when it's already absolute.
    // Simulate the string operation directly (can't use path.resolve for Windows paths on Linux).
    const winHomedir = 'C:\\Users\\matte';
    const winTargetDir = 'C:\\Users\\matte\\.claude';
    // This is what the fix does: targetDir.replace(homedir, '~').replace(/\\/g, '/') + '/'
    const prefix = winTargetDir.replace(winHomedir, '~').replace(/\\/g, '/') + '/';
    assert.strictEqual(prefix, '~/.claude/');
    assert.ok(!prefix.includes('C:'), `Should not contain drive letter, got: ${prefix}`);
  });
});

describe('installed .md files contain no resolved absolute paths', () => {
  const homedir = os.homedir();
  const targetDir = path.join(homedir, '.claude');
  const pathPrefix = computePathPrefix(homedir, targetDir);
  const claudeDirRegex = /~\/\.claude\//g;
  const claudeHomeRegex = /\$HOME\/\.claude\//g;
  const normalizedHomedir = homedir.replace(/\\/g, '/');

  // Collect all .md files from source directories
  function collectMdFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectMdFiles(fullPath));
      } else if (entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const dirsToCheck = ['commands', 'get-shit-done', 'agents'].map(d => path.join(repoRoot, d));
  const mdFiles = dirsToCheck.flatMap(collectMdFiles);

  test('source .md files exist', () => {
    assert.ok(mdFiles.length > 0, `Expected .md files, found ${mdFiles.length}`);
  });

  test('after replacement, no .md file contains os.homedir()', () => {
    const failures = [];
    for (const file of mdFiles) {
      let content = fs.readFileSync(file, 'utf8');
      content = content.replace(claudeDirRegex, pathPrefix);
      content = content.replace(claudeHomeRegex, pathPrefix);
      if (content.includes(normalizedHomedir) && normalizedHomedir !== '~') {
        failures.push(path.relative(repoRoot, file));
      }
    }
    assert.deepStrictEqual(failures, [], `Files with resolved absolute paths: ${failures.join(', ')}`);
  });
});
