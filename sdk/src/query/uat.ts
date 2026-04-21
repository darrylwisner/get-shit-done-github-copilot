/**
 * UAT query handlers — checkpoint rendering and audit scanning.
 *
 * Ported from get-shit-done/bin/lib/uat.cjs.
 * Provides UAT checkpoint rendering for verify-work workflows and
 * audit scanning for UAT/VERIFICATION files across phases.
 *
 * @example
 * ```typescript
 * import { uatRenderCheckpoint, auditUat } from './uat.js';
 *
 * await uatRenderCheckpoint(['--file', 'path/to/UAT.md'], '/project');
 * // { data: { test_number: 1, test_name: 'Login', checkpoint: '...' } }
 *
 * await auditUat([], '/project');
 * // { data: { results: [...], summary: { total_files: 2, total_items: 5 } } }
 * ```
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { planningPaths, toPosixPath } from './helpers.js';
import type { QueryHandler } from './utils.js';

// ─── uatRenderCheckpoint ─────────────────────────────────────────────────

/**
 * Render the current UAT checkpoint — reads a UAT file, parses the
 * "Current Test" section, and returns a formatted checkpoint prompt.
 *
 * Args: --file <path>
 */
export const uatRenderCheckpoint: QueryHandler = async (args, projectDir) => {
  const fileIdx = args.indexOf('--file');
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;
  if (!filePath) {
    return { data: { error: 'UAT file required: use uat render-checkpoint --file <path>' } };
  }

  const resolvedPath = resolve(projectDir, filePath);
  if (!existsSync(resolvedPath)) {
    return { data: { error: `UAT file not found: ${filePath}` } };
  }

  const content = readFileSync(resolvedPath, 'utf-8');

  const currentTestMatch = content.match(/##\s*Current Test\s*(?:\n<!--[\s\S]*?-->)?\n([\s\S]*?)(?=\n##\s|$)/i);
  if (!currentTestMatch) {
    return { data: { error: 'UAT file is missing a Current Test section' } };
  }

  const section = currentTestMatch[1].trimEnd();
  if (!section.trim()) {
    return { data: { error: 'Current Test section is empty' } };
  }

  if (/\[testing complete\]/i.test(section)) {
    return { data: { complete: true, checkpoint: null } };
  }

  const numberMatch = section.match(/^number:\s*(\d+)\s*$/m);
  const nameMatch = section.match(/^name:\s*(.+)\s*$/m);
  const expectedBlockMatch = section.match(/^expected:\s*\|\n([\s\S]*?)(?=^\w[\w-]*:\s)/m)
    || section.match(/^expected:\s*\|\n([\s\S]+)/m);
  const expectedInlineMatch = section.match(/^expected:\s*(.+)\s*$/m);

  if (!numberMatch || !nameMatch || (!expectedBlockMatch && !expectedInlineMatch)) {
    return { data: { error: 'Current Test section is malformed — requires number, name, and expected fields' } };
  }

  let expected: string;
  if (expectedBlockMatch) {
    expected = expectedBlockMatch[1]
      .split('\n')
      .map(line => line.replace(/^ {2}/, ''))
      .join('\n')
      .trim();
  } else {
    expected = expectedInlineMatch![1].trim();
  }

  const testNumber = parseInt(numberMatch[1], 10);
  const testName = nameMatch[1].trim();

  const checkpoint = [
    '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557',
    '\u2551  CHECKPOINT: Verification Required                           \u2551',
    '\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d',
    '',
    `**Test ${testNumber}: ${testName}**`,
    '',
    expected,
    '',
    '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
    "Type `pass` or describe what's wrong.",
    '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
  ].join('\n');

  return {
    data: {
      file_path: toPosixPath(relative(projectDir, resolvedPath)),
      test_number: testNumber,
      test_name: testName,
      checkpoint,
    },
  };
};

// ─── auditUat ────────────────────────────────────────────────────────────

function parseUatItems(content: string): string[] {
  const items: string[] = [];
  for (const line of content.split('\n')) {
    if (/^-\s*\[\s*\]/.test(line) || /^-\s*\[[ ]\]/.test(line)) {
      items.push(line.trim());
    }
  }
  return items;
}

function parseVerificationItems(content: string): string[] {
  const items: string[] = [];
  const gapSection = /## gaps?|## issues?|## failures?/i;
  let inGapSection = false;
  for (const line of content.split('\n')) {
    if (/^##/.test(line)) { inGapSection = gapSection.test(line); continue; }
    if (inGapSection && line.trim().startsWith('-')) items.push(line.trim());
  }
  return items;
}

function extractFrontmatterStatus(content: string): string {
  const match = content.match(/^---[\s\S]*?^status:\s*(.+?)[\r\n]/m);
  return match ? match[1].trim() : 'unknown';
}

export const auditUat: QueryHandler = async (_args, projectDir) => {
  const paths = planningPaths(projectDir);
  if (!existsSync(paths.phases)) {
    return { data: { results: [], summary: { total_files: 0, total_items: 0 } } };
  }

  const results: Record<string, unknown>[] = [];
  const entries = readdirSync(paths.phases, { withFileTypes: true });

  for (const entry of entries.filter(e => e.isDirectory())) {
    const phaseMatch = entry.name.match(/^(\d+[A-Z]?(?:\.\d+)*)/i);
    const phaseNum = phaseMatch ? phaseMatch[1] : entry.name;
    const phaseDir = join(paths.phases, entry.name);
    const files = readdirSync(phaseDir);

    for (const file of files.filter(f => f.includes('-UAT') && f.endsWith('.md'))) {
      const content = readFileSync(join(phaseDir, file), 'utf-8');
      const items = parseUatItems(content);
      if (items.length > 0) {
        results.push({ phase: phaseNum, phase_dir: entry.name, file, file_path: toPosixPath(relative(projectDir, join(phaseDir, file))), type: 'uat', status: extractFrontmatterStatus(content), items });
      }
    }

    for (const file of files.filter(f => f.includes('-VERIFICATION') && f.endsWith('.md'))) {
      const content = readFileSync(join(phaseDir, file), 'utf-8');
      const status = extractFrontmatterStatus(content);
      if (status === 'human_needed' || status === 'gaps_found') {
        const items = parseVerificationItems(content);
        if (items.length > 0) {
          results.push({ phase: phaseNum, phase_dir: entry.name, file, file_path: toPosixPath(relative(projectDir, join(phaseDir, file))), type: 'verification', status, items });
        }
      }
    }
  }

  const totalItems = results.reduce((sum, r) => sum + ((r.items as unknown[]).length), 0);
  return { data: { results, summary: { total_files: results.length, total_items: totalItems } } };
};
