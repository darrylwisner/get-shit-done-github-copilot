/**
 * Summary query handlers — extract sections and history from SUMMARY.md files.
 *
 * Ported from get-shit-done/bin/lib/commands.cjs (cmdSummaryExtract, cmdHistoryDigest).
 * Provides summary section parsing and condensed phase history generation.
 *
 * @example
 * ```typescript
 * import { summaryExtract, historyDigest } from './summary.js';
 *
 * await summaryExtract(['.planning/phases/09-foundation/09-01-SUMMARY.md'], '/project');
 * // { data: { sections: { what_was_done: '...', tests: '...' }, file: '...' } }
 *
 * await historyDigest([], '/project');
 * // { data: { phases: [...], count: 5 } }
 * ```
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { planningPaths, toPosixPath } from './helpers.js';
import type { QueryHandler } from './utils.js';

export const summaryExtract: QueryHandler = async (args, projectDir) => {
  const filePath = args[0] ? join(projectDir, args[0]) : null;

  if (!filePath || !existsSync(filePath)) {
    return { data: { sections: {}, error: 'file not found' } };
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    const sections: Record<string, string> = {};
    const headingPattern = /^#{1,3}\s+(.+?)[\r\n]+([\s\S]*?)(?=^#{1,3}\s|\Z)/gm;
    let m: RegExpExecArray | null;
    while ((m = headingPattern.exec(content)) !== null) {
      const key = m[1].trim().toLowerCase().replace(/\s+/g, '_');
      sections[key] = m[2].trim();
    }
    return { data: { sections, file: args[0] } };
  } catch {
    return { data: { sections: {}, error: 'unreadable file' } };
  }
};

export const historyDigest: QueryHandler = async (_args, projectDir) => {
  const paths = planningPaths(projectDir);
  const digest: {
    phases: Record<string, { name: string; provides: string[]; affects: string[]; patterns: string[] }>;
    decisions: Array<{ phase: string; decision: string }>;
    tech_stack: string[];
  } = { phases: {}, decisions: [], tech_stack: [] };

  const techStackSet = new Set<string>();

  // Collect all phase directories: archived milestones + current
  const allPhaseDirs: Array<{ name: string; fullPath: string }> = [];

  // Archived phases from milestones/
  const milestonesDir = join(projectDir, '.planning', 'milestones');
  if (existsSync(milestonesDir)) {
    try {
      const milestoneEntries = readdirSync(milestonesDir, { withFileTypes: true });
      const archivedPhaseDirs = milestoneEntries
        .filter(e => e.isDirectory() && /^v[\d.]+-phases$/.test(e.name))
        .map(e => e.name)
        .sort();
      for (const archiveName of archivedPhaseDirs) {
        const archivePath = join(milestonesDir, archiveName);
        try {
          const dirs = readdirSync(archivePath, { withFileTypes: true });
          for (const d of dirs.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
            allPhaseDirs.push({ name: d.name, fullPath: join(archivePath, d.name) });
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  // Current phases
  if (existsSync(paths.phases)) {
    try {
      const currentDirs = readdirSync(paths.phases, { withFileTypes: true });
      for (const d of currentDirs.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
        allPhaseDirs.push({ name: d.name, fullPath: join(paths.phases, d.name) });
      }
    } catch { /* skip */ }
  }

  if (allPhaseDirs.length === 0) {
    return { data: digest };
  }

  for (const { name: dir, fullPath: dirPath } of allPhaseDirs) {
    const summaries = readdirSync(dirPath).filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');

    for (const summary of summaries) {
      try {
        const content = readFileSync(join(dirPath, summary), 'utf-8');
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!fmMatch) continue;

        const fmBlock = fmMatch[1];
        const phaseMatch = fmBlock.match(/^phase:\s*(.+)$/m);
        const nameMatch = fmBlock.match(/^name:\s*(.+)$/m);
        const phaseNum = phaseMatch ? phaseMatch[1].trim() : dir.split('-')[0];

        if (!digest.phases[phaseNum]) {
          const phaseName = nameMatch
            ? nameMatch[1].trim()
            : dir.split('-').slice(1).join(' ') || 'Unknown';
          digest.phases[phaseNum] = { name: phaseName, provides: [], affects: [], patterns: [] };
        }

        const providesSet = new Set(digest.phases[phaseNum].provides);
        const affectsSet = new Set(digest.phases[phaseNum].affects);
        const patternsSet = new Set(digest.phases[phaseNum].patterns);

        // Parse provides from dependency-graph or top-level
        for (const m of fmBlock.matchAll(/^\s+-\s+(.+)$/gm)) {
          const line = m[1].trim();
          if (fmBlock.indexOf(m[0]) > fmBlock.indexOf('provides:') &&
              (fmBlock.indexOf('affects:') === -1 || fmBlock.indexOf(m[0]) < fmBlock.indexOf('affects:'))) {
            providesSet.add(line);
          }
        }

        // Parse key-decisions
        const decisionsStart = fmBlock.indexOf('key-decisions:');
        if (decisionsStart !== -1) {
          const rest = fmBlock.slice(decisionsStart + 'key-decisions:'.length);
          for (const line of rest.split('\n')) {
            const item = line.match(/^\s+-\s+(.+)$/);
            if (item) {
              digest.decisions.push({ phase: phaseNum, decision: item[1].trim() });
            } else if (/^\S/.test(line) && line.trim()) {
              break;
            }
          }
        }

        // Parse patterns-established
        const patternsStart = fmBlock.indexOf('patterns-established:');
        if (patternsStart !== -1) {
          const rest = fmBlock.slice(patternsStart + 'patterns-established:'.length);
          for (const line of rest.split('\n')) {
            const item = line.match(/^\s+-\s+(.+)$/);
            if (item) patternsSet.add(item[1].trim());
            else if (/^\S/.test(line) && line.trim()) break;
          }
        }

        // Parse tech-stack.added
        const techStart = fmBlock.indexOf('tech-stack:');
        if (techStart !== -1) {
          const addedStart = fmBlock.indexOf('added:', techStart);
          if (addedStart !== -1) {
            const rest = fmBlock.slice(addedStart + 'added:'.length);
            for (const line of rest.split('\n')) {
              const item = line.match(/^\s+-\s+(?:name:\s*)?(.+)$/);
              if (item) techStackSet.add(item[1].trim());
              else if (/^\S/.test(line) && line.trim()) break;
            }
          }
        }

        digest.phases[phaseNum].provides = [...providesSet];
        digest.phases[phaseNum].affects = [...affectsSet];
        digest.phases[phaseNum].patterns = [...patternsSet];
      } catch { /* skip malformed summaries */ }
    }
  }

  digest.tech_stack = [...techStackSet];
  return { data: digest };
};
