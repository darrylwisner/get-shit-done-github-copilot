/**
 * Profile and learnings query handlers — session scanning, questionnaire,
 * profile generation, and knowledge store management.
 *
 * Ported from get-shit-done/bin/lib/profile-pipeline.cjs, profile-output.cjs,
 * and learnings.cjs.
 *
 * @example
 * ```typescript
 * import { scanSessions, profileQuestionnaire } from './profile.js';
 *
 * await scanSessions([], '/project');
 * // { data: { projects: [...], project_count: 5, session_count: 42 } }
 *
 * await profileQuestionnaire([], '/project');
 * // { data: { questions: [...], total: 3 } }
 * ```
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, relative, basename, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomBytes } from 'node:crypto';

import { planningPaths, toPosixPath } from './helpers.js';
import type { QueryHandler } from './utils.js';

// ─── Learnings — ~/.gsd/knowledge/ knowledge store ───────────────────────

const STORE_DIR = join(homedir(), '.gsd', 'knowledge');

function ensureStore(): void {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
}

function learningsWrite(entry: { source_project: string; learning: string; context?: string; tags?: string[] }): { created: boolean; id: string } {
  ensureStore();
  const hash = createHash('sha256').update(entry.learning + '\n' + entry.source_project).digest('hex');
  for (const file of readdirSync(STORE_DIR).filter(f => f.endsWith('.json'))) {
    try {
      const r = JSON.parse(readFileSync(join(STORE_DIR, file), 'utf-8'));
      if (r.content_hash === hash) return { created: false, id: r.id };
    } catch { /* skip */ }
  }
  const id = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
  const record = { id, source_project: entry.source_project, date: new Date().toISOString(), context: entry.context ?? '', learning: entry.learning, tags: entry.tags ?? [], content_hash: hash };
  writeFileSync(join(STORE_DIR, `${id}.json`), JSON.stringify(record, null, 2), 'utf-8');
  return { created: true, id };
}

function learningsList(): Array<Record<string, unknown>> {
  if (!existsSync(STORE_DIR)) return [];
  const results: Array<Record<string, unknown>> = [];
  for (const file of readdirSync(STORE_DIR).filter(f => f.endsWith('.json'))) {
    try {
      const record = JSON.parse(readFileSync(join(STORE_DIR, file), 'utf-8'));
      results.push(record);
    } catch { /* skip */ }
  }
  results.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
  return results;
}

/**
 * Query learnings from the global knowledge store, optionally filtered by tag.
 *
 * Port of `cmdLearningsQuery` from learnings.cjs lines 316-323.
 * Called by gsd-planner agent to inject prior learnings into plan generation.
 *
 * Args: --tag <tag> [--limit N]
 */
export const learningsQuery: QueryHandler = async (args) => {
  const tagIdx = args.indexOf('--tag');
  const tag = tagIdx !== -1 ? args[tagIdx + 1] : null;
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined;

  let results = learningsList();
  if (tag) {
    results = results.filter(r => Array.isArray(r.tags) && (r.tags as string[]).includes(tag));
  }
  if (limit && limit > 0) {
    results = results.slice(0, limit);
  }
  return { data: { learnings: results, count: results.length, tag } };
};

export const learningsCopy: QueryHandler = async (_args, projectDir) => {
  const paths = planningPaths(projectDir);
  const learningsPath = join(paths.planning, 'LEARNINGS.md');
  if (!existsSync(learningsPath)) {
    return { data: { copied: false, total: 0, created: 0, skipped: 0, reason: 'No LEARNINGS.md found' } };
  }
  const content = readFileSync(learningsPath, 'utf-8');
  const sourceProject = basename(resolve(projectDir));
  const sections = content.split(/^## /m).slice(1);
  let created = 0; let skipped = 0;

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    if (!body) continue;
    const tags = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const result = learningsWrite({ source_project: sourceProject, learning: body, context: title, tags });
    if (result.created) created++; else skipped++;
  }
  return { data: { copied: true, total: created + skipped, created, skipped } };
};

// ─── extractMessages — session message extraction for profiling ───────────

/**
 * Extract user messages from Claude Code session files for a given project.
 *
 * Port of `cmdExtractMessages` from profile-pipeline.cjs lines 252-391.
 * Simplified to use the SDK's existing session scanning infrastructure.
 *
 * @param args - args[0]: project name/keyword (required), --limit N, --session-id ID
 */
export const extractMessages: QueryHandler = async (args) => {
  const projectArg = args[0];
  if (!projectArg) {
    return { data: { error: 'project name required', messages: [], total: 0 } };
  }

  const sessionsBase = join(homedir(), '.claude', 'projects');
  if (!existsSync(sessionsBase)) {
    return { data: { error: 'No Claude Code sessions found', messages: [], total: 0 } };
  }

  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) || 300 : 300;
  const sessionIdIdx = args.indexOf('--session-id');
  const sessionIdFilter = sessionIdIdx !== -1 ? args[sessionIdIdx + 1] : null;

  let projectDirs: string[];
  try {
    projectDirs = readdirSync(sessionsBase, { withFileTypes: true })
      .filter((e: { isDirectory(): boolean }) => e.isDirectory())
      .map((e: { name: string }) => e.name);
  } catch {
    return { data: { error: 'Cannot read sessions directory', messages: [], total: 0 } };
  }

  const lowerArg = projectArg.toLowerCase();
  const matchedDir = projectDirs.find(d => d === projectArg)
    || projectDirs.find(d => d.toLowerCase().includes(lowerArg));

  if (!matchedDir) {
    return { data: { error: `No project matching "${projectArg}"`, available: projectDirs.slice(0, 10), messages: [], total: 0 } };
  }

  const projectPath = join(sessionsBase, matchedDir);
  let sessionFiles = readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));
  if (sessionIdFilter) {
    sessionFiles = sessionFiles.filter(f => f.includes(sessionIdFilter));
  }

  const messages: Array<{ role: string; content: string; session: string }> = [];
  let sessionsProcessed = 0;
  let sessionsSkipped = 0;

  for (const sessionFile of sessionFiles) {
    if (messages.length >= limit) break;
    try {
      const content = readFileSync(join(projectPath, sessionFile), 'utf-8');
      for (const line of content.split('\n').filter(Boolean)) {
        if (messages.length >= limit) break;
        try {
          const record = JSON.parse(line);
          if (record.type === 'user' && typeof record.message?.content === 'string') {
            const text = record.message.content;
            if (text.length > 3 && !text.startsWith('/') && !/^\s*(y|n|yes|no|ok)\s*$/i.test(text)) {
              messages.push({
                role: 'user',
                content: text.length > 2000 ? text.slice(0, 2000) + '... [truncated]' : text,
                session: sessionFile.replace('.jsonl', ''),
              });
            }
          }
        } catch { /* skip malformed line */ }
      }
      sessionsProcessed++;
    } catch {
      sessionsSkipped++;
    }
  }

  return {
    data: {
      project: matchedDir,
      sessions_processed: sessionsProcessed,
      sessions_skipped: sessionsSkipped,
      messages_extracted: messages.length,
      messages,
    },
  };
};

// ─── Profile — session scanning and profile generation ────────────────────

const SESSIONS_DIR = join(homedir(), '.claude', 'projects');

export const scanSessions: QueryHandler = async (_args, _projectDir) => {
  if (!existsSync(SESSIONS_DIR)) {
    return { data: { projects: [], project_count: 0, session_count: 0 } };
  }

  const projects: Record<string, unknown>[] = [];
  let sessionCount = 0;

  try {
    const projectDirs = readdirSync(SESSIONS_DIR, { withFileTypes: true });
    for (const pDir of projectDirs.filter(e => e.isDirectory())) {
      const pPath = join(SESSIONS_DIR, pDir.name);
      const sessions = readdirSync(pPath).filter(f => f.endsWith('.jsonl'));
      sessionCount += sessions.length;
      projects.push({ name: pDir.name, path: toPosixPath(pPath), session_count: sessions.length });
    }
  } catch { /* skip */ }

  return { data: { projects, project_count: projects.length, session_count: sessionCount } };
};

export const profileSample: QueryHandler = async (_args, _projectDir) => {
  if (!existsSync(SESSIONS_DIR)) {
    return { data: { messages: [], total: 0, projects_sampled: 0 } };
  }
  const messages: string[] = [];
  let projectsSampled = 0;

  try {
    const projectDirs = readdirSync(SESSIONS_DIR, { withFileTypes: true });
    for (const pDir of projectDirs.filter(e => e.isDirectory()).slice(0, 5)) {
      const pPath = join(SESSIONS_DIR, pDir.name);
      const sessions = readdirSync(pPath).filter(f => f.endsWith('.jsonl')).slice(0, 3);
      for (const session of sessions) {
        try {
          const content = readFileSync(join(pPath, session), 'utf-8');
          for (const line of content.split('\n').filter(Boolean)) {
            try {
              const record = JSON.parse(line);
              if (record.type === 'user' && typeof record.message?.content === 'string') {
                messages.push(record.message.content.slice(0, 500));
                if (messages.length >= 50) break;
              }
            } catch { /* skip malformed */ }
          }
        } catch { /* skip */ }
        if (messages.length >= 50) break;
      }
      projectsSampled++;
      if (messages.length >= 50) break;
    }
  } catch { /* skip */ }

  return { data: { messages, total: messages.length, projects_sampled: projectsSampled } };
};

const PROFILING_QUESTIONS = [
  { dimension: 'communication_style', header: 'Communication Style', question: 'When you ask Claude to build something, how much context do you typically provide?', options: [{ label: 'Minimal', value: 'a', rating: 'terse-direct' }, { label: 'Some context', value: 'b', rating: 'conversational' }, { label: 'Detailed specs', value: 'c', rating: 'detailed-structured' }, { label: 'It depends', value: 'd', rating: 'mixed' }] },
  { dimension: 'decision_speed', header: 'Decision Making', question: 'When Claude presents you with options, how do you typically decide?', options: [{ label: 'Pick quickly', value: 'a', rating: 'fast-intuitive' }, { label: 'Ask for comparison', value: 'b', rating: 'deliberate-informed' }, { label: 'Research independently', value: 'c', rating: 'research-first' }, { label: 'Let Claude recommend', value: 'd', rating: 'delegator' }] },
  { dimension: 'explanation_depth', header: 'Explanation Preferences', question: 'When Claude explains something, how much detail do you want?', options: [{ label: 'Just the code', value: 'a', rating: 'code-only' }, { label: 'Brief explanation', value: 'b', rating: 'concise' }, { label: 'Detailed walkthrough', value: 'c', rating: 'detailed' }, { label: 'Deep dive', value: 'd', rating: 'educational' }] },
];

export const profileQuestionnaire: QueryHandler = async (args, _projectDir) => {
  const answersFlag = args.indexOf('--answers');
  if (answersFlag >= 0 && args[answersFlag + 1]) {
    try {
      const answers = JSON.parse(readFileSync(resolve(args[answersFlag + 1]), 'utf-8')) as Record<string, string>;
      const analysis: Record<string, string> = {};
      for (const q of PROFILING_QUESTIONS) {
        const answer = answers[q.dimension];
        const option = q.options.find(o => o.value === answer);
        analysis[q.dimension] = option?.rating ?? 'unknown';
      }
      return { data: { analysis, answered: Object.keys(answers).length, questions_total: PROFILING_QUESTIONS.length } };
    } catch {
      return { data: { error: 'Failed to read answers file', path: args[answersFlag + 1] } };
    }
  }
  return { data: { questions: PROFILING_QUESTIONS, total: PROFILING_QUESTIONS.length } };
};

export const writeProfile: QueryHandler = async (args, projectDir) => {
  const inputFlag = args.indexOf('--input');
  const inputPath = inputFlag >= 0 ? args[inputFlag + 1] : null;
  if (!inputPath || !existsSync(resolve(inputPath))) {
    return { data: { written: false, reason: 'No --input analysis file provided' } };
  }
  try {
    const analysis = JSON.parse(readFileSync(resolve(inputPath), 'utf-8')) as Record<string, unknown>;
    const profilePath = join(projectDir, '.planning', 'USER-PROFILE.md');
    const lines = ['# User Developer Profile', '', `*Generated: ${new Date().toISOString()}*`, ''];
    for (const [key, value] of Object.entries(analysis)) {
      lines.push(`## ${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`);
      lines.push('');
      lines.push(String(value));
      lines.push('');
    }
    await writeFile(profilePath, lines.join('\n'), 'utf-8');
    return { data: { written: true, path: toPosixPath(relative(projectDir, profilePath)) } };
  } catch (err) {
    return { data: { written: false, reason: String(err) } };
  }
};

export const generateClaudeProfile: QueryHandler = async (args, _projectDir) => {
  const analysisFlag = args.indexOf('--analysis');
  const analysisPath = analysisFlag >= 0 ? args[analysisFlag + 1] : null;
  let profile = '> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.\n> This section is managed by `generate-claude-profile` -- do not edit manually.';

  if (analysisPath && existsSync(resolve(analysisPath))) {
    try {
      const analysis = JSON.parse(readFileSync(resolve(analysisPath), 'utf-8')) as Record<string, unknown>;
      const lines = ['## Developer Profile', ''];
      for (const [key, value] of Object.entries(analysis)) {
        lines.push(`- **${key.replace(/_/g, ' ')}**: ${value}`);
      }
      profile = lines.join('\n');
    } catch { /* use fallback */ }
  }

  return { data: { profile, generated: true } };
};

export const generateDevPreferences: QueryHandler = async (args, projectDir) => {
  const analysisFlag = args.indexOf('--analysis');
  const analysisPath = analysisFlag >= 0 ? args[analysisFlag + 1] : null;
  const prefs: Record<string, unknown> = {};

  if (analysisPath && existsSync(resolve(analysisPath))) {
    try {
      const analysis = JSON.parse(readFileSync(resolve(analysisPath), 'utf-8')) as Record<string, unknown>;
      Object.assign(prefs, analysis);
    } catch { /* use empty */ }
  }

  const prefsPath = join(projectDir, '.planning', 'dev-preferences.md');
  const lines = ['# Developer Preferences', '', `*Generated: ${new Date().toISOString()}*`, ''];
  for (const [key, value] of Object.entries(prefs)) {
    lines.push(`- **${key}**: ${value}`);
  }
  await writeFile(prefsPath, lines.join('\n'), 'utf-8');
  return { data: { written: true, path: toPosixPath(relative(projectDir, prefsPath)), preferences: prefs } };
};

export const generateClaudeMd: QueryHandler = async (_args, projectDir) => {
  const safeRead = (path: string): string | null => {
    try { return existsSync(path) ? readFileSync(path, 'utf-8') : null; } catch { return null; }
  };

  const sections: string[] = [];

  const projectContent = safeRead(join(projectDir, '.planning', 'PROJECT.md'));
  if (projectContent) {
    const h1 = projectContent.match(/^# (.+)$/m);
    if (h1) sections.push(`## Project\n\n${h1[1]}\n`);
  }

  const stackContent = safeRead(join(projectDir, '.planning', 'codebase', 'STACK.md')) ?? safeRead(join(projectDir, '.planning', 'research', 'STACK.md'));
  if (stackContent) sections.push(`## Technology Stack\n\n${stackContent.slice(0, 1000)}\n`);

  return { data: { sections, generated: true, section_count: sections.length } };
};
