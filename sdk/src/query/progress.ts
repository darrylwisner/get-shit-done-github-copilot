/**
 * Progress query handlers — milestone progress rendering in JSON format.
 *
 * Ported from get-shit-done/bin/lib/commands.cjs (cmdProgressRender, determinePhaseStatus).
 * Provides progress handler that scans disk for plan/summary counts per phase
 * and determines status via VERIFICATION.md inspection.
 *
 * @example
 * ```typescript
 * import { progressJson } from './progress.js';
 *
 * const result = await progressJson([], '/project');
 * // { data: { milestone_version: 'v3.0', phases: [...], total_plans: 6, percent: 83 } }
 * ```
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { GSDError, ErrorClassification } from '../errors.js';
import { comparePhaseNum, normalizePhaseName, planningPaths, toPosixPath } from './helpers.js';
import { getMilestoneInfo, roadmapAnalyze } from './roadmap.js';
import type { QueryHandler } from './utils.js';

// ─── Internal helpers ─────────────────────────────────────────────────────

/**
 * Determine the status of a phase based on plan/summary counts and verification state.
 *
 * Port of determinePhaseStatus from commands.cjs lines 15-36.
 *
 * @param plans - Number of PLAN.md files in the phase directory
 * @param summaries - Number of SUMMARY.md files in the phase directory
 * @param phaseDir - Absolute path to the phase directory
 * @returns Status string: Pending, Planned, In Progress, Executed, Complete, Needs Review
 */
export async function determinePhaseStatus(plans: number, summaries: number, phaseDir: string): Promise<string> {
  if (plans === 0) return 'Pending';
  if (summaries < plans && summaries > 0) return 'In Progress';
  if (summaries < plans) return 'Planned';

  // summaries >= plans — check verification
  try {
    const files = await readdir(phaseDir);
    const verificationFile = files.find(f => f === 'VERIFICATION.md' || f.endsWith('-VERIFICATION.md'));
    if (verificationFile) {
      const content = await readFile(join(phaseDir, verificationFile), 'utf-8');
      if (/status:\s*passed/i.test(content)) return 'Complete';
      if (/status:\s*human_needed/i.test(content)) return 'Needs Review';
      if (/status:\s*gaps_found/i.test(content)) return 'Executed';
      // Verification exists but unrecognized status — treat as executed
      return 'Executed';
    }
  } catch { /* directory read failed — fall through */ }

  // No verification file — executed but not verified
  return 'Executed';
}

// ─── Exported handlers ────────────────────────────────────────────────────

/**
 * Query handler for progress / progress.json.
 *
 * Port of cmdProgressRender (JSON format) from commands.cjs lines 535-597.
 * Scans phases directory, counts plans/summaries, determines status per phase.
 *
 * @param args - Unused
 * @param projectDir - Project root directory
 * @returns QueryResult with milestone progress data
 */
export const progressJson: QueryHandler = async (_args, projectDir) => {
  const phasesDir = planningPaths(projectDir).phases;
  const milestone = await getMilestoneInfo(projectDir);

  const phases: Array<Record<string, unknown>> = [];
  let totalPlans = 0;
  let totalSummaries = 0;

  try {
    const entries = await readdir(phasesDir, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort((a, b) => comparePhaseNum(a, b));

    for (const dir of dirs) {
      const dm = dir.match(/^(\d+(?:\.\d+)*)-?(.*)/);
      const phaseNum = dm ? dm[1] : dir;
      const phaseName = dm && dm[2] ? dm[2].replace(/-/g, ' ') : '';
      const phaseFiles = await readdir(join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;

      totalPlans += plans;
      totalSummaries += summaries;

      const status = await determinePhaseStatus(plans, summaries, join(phasesDir, dir));

      phases.push({ number: phaseNum, name: phaseName, plans, summaries, status });
    }
  } catch { /* intentionally empty */ }

  const percent = totalPlans > 0 ? Math.min(100, Math.round((totalSummaries / totalPlans) * 100)) : 0;

  return {
    data: {
      milestone_version: milestone.version,
      milestone_name: milestone.name,
      phases,
      total_plans: totalPlans,
      total_summaries: totalSummaries,
      percent,
    },
  };
};

// ─── progressBar ─────────────────────────────────────────────────────────

export const progressBar: QueryHandler = async (_args, projectDir) => {
  const analysis = await roadmapAnalyze([], projectDir);
  const data = analysis.data as Record<string, unknown>;
  const percent = (data.progress_percent as number) || 0;
  const total = 20;
  const filled = Math.round((percent / 100) * total);
  const bar = '[' + '#'.repeat(filled) + '-'.repeat(total - filled) + ']';
  return { data: { bar: `${bar} ${percent}%`, percent } };
};

// ─── statsJson ───────────────────────────────────────────────────────────

export const statsJson: QueryHandler = async (_args, projectDir) => {
  const paths = planningPaths(projectDir);
  let phasesTotal = 0;
  let plansTotal = 0;
  let summariesTotal = 0;
  let completedPhases = 0;

  if (existsSync(paths.phases)) {
    try {
      const entries = readdirSync(paths.phases, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        phasesTotal++;
        const phaseDir = join(paths.phases, entry.name);
        const files = readdirSync(phaseDir);
        const plans = files.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
        const summaries = files.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
        plansTotal += plans.length;
        summariesTotal += summaries.length;
        if (summaries.length >= plans.length && plans.length > 0) completedPhases++;
      }
    } catch { /* skip */ }
  }

  const progressPercent = phasesTotal > 0 ? Math.round((completedPhases / phasesTotal) * 100) : 0;

  return {
    data: {
      phases_total: phasesTotal,
      plans_total: plansTotal,
      summaries_total: summariesTotal,
      completed_phases: completedPhases,
      in_progress_phases: phasesTotal - completedPhases,
      progress_percent: progressPercent,
    },
  };
};

// ─── todoMatchPhase ──────────────────────────────────────────────────────

export const todoMatchPhase: QueryHandler = async (args, projectDir) => {
  const phase = args[0];
  const todosDir = join(projectDir, '.planning', 'todos');
  const todos: Array<{ file: string; phase: string }> = [];

  if (!existsSync(todosDir)) {
    return { data: { todos: [], count: 0, phase: phase || null } };
  }

  try {
    const files = readdirSync(todosDir).filter(f => f.endsWith('.md') || f.endsWith('.json'));
    for (const file of files) {
      if (!phase || file.includes(normalizePhaseName(phase)) || file.includes(phase)) {
        todos.push({ file: toPosixPath(join('.planning', 'todos', file)), phase: phase || 'all' });
      }
    }
  } catch { /* skip */ }

  return { data: { todos, count: todos.length, phase: phase || null } };
};

// ─── listTodos ──────────────────────────────────────────────────────────

/**
 * List pending todos from .planning/todos/pending/, optionally filtered by area.
 *
 * Port of `cmdListTodos` from commands.cjs lines 74-109.
 *
 * @param args - args[0]: optional area filter
 */
export const listTodos: QueryHandler = async (args, projectDir) => {
  const area = args[0] || null;
  const pendingDir = join(projectDir, '.planning', 'todos', 'pending');

  const todos: Array<{ file: string; created: string; title: string; area: string; path: string }> = [];

  try {
    const files = readdirSync(pendingDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = readFileSync(join(pendingDir, file), 'utf-8');
        const createdMatch = content.match(/^created:\s*(.+)$/m);
        const titleMatch = content.match(/^title:\s*(.+)$/m);
        const areaMatch = content.match(/^area:\s*(.+)$/m);

        const todoArea = areaMatch ? areaMatch[1].trim() : 'general';
        if (area && todoArea !== area) continue;

        todos.push({
          file,
          created: createdMatch ? createdMatch[1].trim() : 'unknown',
          title: titleMatch ? titleMatch[1].trim() : 'Untitled',
          area: todoArea,
          path: toPosixPath(relative(projectDir, join(pendingDir, file))),
        });
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return { data: { count: todos.length, todos } };
};

// ─── todoComplete ───────────────────────────────────────────────────────

/**
 * Move a todo from pending to completed, adding a completion timestamp.
 *
 * Port of `cmdTodoComplete` from commands.cjs lines 724-749.
 *
 * @param args - args[0]: filename (required)
 */
export const todoComplete: QueryHandler = async (args, projectDir) => {
  const filename = args[0];
  if (!filename) {
    throw new GSDError('filename required for todo complete', ErrorClassification.Validation);
  }

  const pendingDir = join(projectDir, '.planning', 'todos', 'pending');
  const completedDir = join(projectDir, '.planning', 'todos', 'completed');
  const sourcePath = join(pendingDir, filename);

  if (!existsSync(sourcePath)) {
    throw new GSDError(`Todo not found: ${filename}`, ErrorClassification.Validation);
  }

  mkdirSync(completedDir, { recursive: true });

  let content = readFileSync(sourcePath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];
  content = `completed: ${today}\n` + content;

  writeFileSync(join(completedDir, filename), content, 'utf-8');
  unlinkSync(sourcePath);

  return { data: { completed: true, file: filename, date: today } };
};
