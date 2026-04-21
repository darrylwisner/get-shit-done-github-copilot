/**
 * Shared query helpers — cross-cutting utility functions used across query modules.
 *
 * Ported from get-shit-done/bin/lib/core.cjs and state.cjs.
 * Provides phase name normalization, path handling, regex escaping,
 * and STATE.md field extraction.
 *
 * @example
 * ```typescript
 * import { normalizePhaseName, planningPaths } from './helpers.js';
 *
 * normalizePhaseName('9');     // '09'
 * normalizePhaseName('CK-01'); // '01'
 *
 * const paths = planningPaths('/project');
 * // { planning: '/project/.planning', state: '/project/.planning/STATE.md', ... }
 * ```
 */

import { join, relative, resolve, isAbsolute, normalize } from 'node:path';
import { realpath } from 'node:fs/promises';
import { GSDError, ErrorClassification } from '../errors.js';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Paths to common .planning files. */
export interface PlanningPaths {
  planning: string;
  state: string;
  roadmap: string;
  project: string;
  config: string;
  phases: string;
  requirements: string;
}

// ─── escapeRegex ────────────────────────────────────────────────────────────

/**
 * Escape regex special characters in a string.
 *
 * @param value - String to escape
 * @returns String with regex special characters escaped
 */
export function escapeRegex(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── normalizePhaseName ─────────────────────────────────────────────────────

/**
 * Normalize a phase identifier to a canonical form.
 *
 * Strips optional project code prefix (e.g., 'CK-01' -> '01'),
 * pads numeric part to 2 digits, preserves letter suffix and decimal parts.
 *
 * @param phase - Phase identifier string
 * @returns Normalized phase name
 */
export function normalizePhaseName(phase: string): string {
  const str = String(phase);
  // Strip optional project_code prefix (e.g., 'CK-01' -> '01')
  const stripped = str.replace(/^[A-Z]{1,6}-(?=\d)/, '');
  // Standard numeric phases: 1, 01, 12A, 12.1
  const match = stripped.match(/^(\d+)([A-Z])?((?:\.\d+)*)/i);
  if (match) {
    const padded = match[1].padStart(2, '0');
    const letter = match[2] ? match[2].toUpperCase() : '';
    const decimal = match[3] || '';
    return padded + letter + decimal;
  }
  // Custom phase IDs (e.g. PROJ-42, AUTH-101): return as-is
  return str;
}

// ─── comparePhaseNum ────────────────────────────────────────────────────────

/**
 * Compare two phase directory names for sorting.
 *
 * Handles numeric, letter-suffixed, and decimal phases.
 * Falls back to string comparison for custom IDs.
 *
 * @param a - First phase directory name
 * @param b - Second phase directory name
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function comparePhaseNum(a: string, b: string): number {
  // Strip optional project_code prefix before comparing
  const sa = String(a).replace(/^[A-Z]{1,6}-/, '');
  const sb = String(b).replace(/^[A-Z]{1,6}-/, '');
  const pa = sa.match(/^(\d+)([A-Z])?((?:\.\d+)*)/i);
  const pb = sb.match(/^(\d+)([A-Z])?((?:\.\d+)*)/i);
  // If either is non-numeric (custom ID), fall back to string comparison
  if (!pa || !pb) return String(a).localeCompare(String(b));
  const intDiff = parseInt(pa[1], 10) - parseInt(pb[1], 10);
  if (intDiff !== 0) return intDiff;
  // No letter sorts before letter: 12 < 12A < 12B
  const la = (pa[2] || '').toUpperCase();
  const lb = (pb[2] || '').toUpperCase();
  if (la !== lb) {
    if (!la) return -1;
    if (!lb) return 1;
    return la < lb ? -1 : 1;
  }
  // Segment-by-segment decimal comparison: 12A < 12A.1 < 12A.1.2 < 12A.2
  const aDecParts = pa[3] ? pa[3].slice(1).split('.').map(p => parseInt(p, 10)) : [];
  const bDecParts = pb[3] ? pb[3].slice(1).split('.').map(p => parseInt(p, 10)) : [];
  const maxLen = Math.max(aDecParts.length, bDecParts.length);
  if (aDecParts.length === 0 && bDecParts.length > 0) return -1;
  if (bDecParts.length === 0 && aDecParts.length > 0) return 1;
  for (let i = 0; i < maxLen; i++) {
    const av = Number.isFinite(aDecParts[i]) ? aDecParts[i] : 0;
    const bv = Number.isFinite(bDecParts[i]) ? bDecParts[i] : 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

// ─── extractPhaseToken ──────────────────────────────────────────────────────

/**
 * Extract the phase token from a directory name.
 *
 * Supports: '01-name', '1009A-name', '999.6-name', 'CK-01-name', 'PROJ-42-name'.
 *
 * @param dirName - Directory name to extract token from
 * @returns The token portion (e.g. '01', '1009A', '999.6', 'PROJ-42')
 */
export function extractPhaseToken(dirName: string): string {
  // Try project-code-prefixed numeric: CK-01-name -> CK-01
  const codePrefixed = dirName.match(/^([A-Z]{1,6}-\d+[A-Z]?(?:\.\d+)*)(?:-|$)/i);
  if (codePrefixed) return codePrefixed[1];
  // Try plain numeric: 01-name, 1009A-name, 999.6-name
  const numeric = dirName.match(/^(\d+[A-Z]?(?:\.\d+)*)(?:-|$)/i);
  if (numeric) return numeric[1];
  // Custom IDs: PROJ-42-name -> everything before the last segment that looks like a name
  const custom = dirName.match(/^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*)(?:-[a-z]|$)/i);
  if (custom) return custom[1];
  return dirName;
}

// ─── phaseTokenMatches ──────────────────────────────────────────────────────

/**
 * Check if a directory name's phase token matches the normalized phase exactly.
 *
 * Case-insensitive comparison for the token portion.
 *
 * @param dirName - Directory name to check
 * @param normalized - Normalized phase name to match against
 * @returns True if the directory matches the phase
 */
export function phaseTokenMatches(dirName: string, normalized: string): boolean {
  const token = extractPhaseToken(dirName);
  if (token.toUpperCase() === normalized.toUpperCase()) return true;
  // Strip optional project_code prefix from dir and retry
  const stripped = dirName.replace(/^[A-Z]{1,6}-(?=\d)/i, '');
  if (stripped !== dirName) {
    const strippedToken = extractPhaseToken(stripped);
    if (strippedToken.toUpperCase() === normalized.toUpperCase()) return true;
  }
  return false;
}

// ─── toPosixPath ────────────────────────────────────────────────────────────

/**
 * Convert a path to POSIX format (forward slashes).
 *
 * @param p - Path to convert
 * @returns Path with all separators as forward slashes
 */
export function toPosixPath(p: string): string {
  return p.split('\\').join('/');
}

// ─── stateExtractField ──────────────────────────────────────────────────────

/**
 * Extract a field value from STATE.md content.
 *
 * Supports both **bold:** and plain: formats, case-insensitive.
 *
 * @param content - STATE.md content string
 * @param fieldName - Field name to extract
 * @returns The field value, or null if not found
 */
export function stateExtractField(content: string, fieldName: string): string | null {
  const escaped = escapeRegex(fieldName);
  const boldPattern = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*(.+)`, 'i');
  const boldMatch = content.match(boldPattern);
  if (boldMatch) return boldMatch[1].trim();
  const plainPattern = new RegExp(`^${escaped}:\\s*(.+)`, 'im');
  const plainMatch = content.match(plainPattern);
  return plainMatch ? plainMatch[1].trim() : null;
}

// ─── normalizeMd ───────────────────────────────────────────────────────────

/**
 * Normalize markdown content for consistent formatting.
 *
 * Port of `normalizeMd` from core.cjs lines 434-529.
 * Applies: CRLF normalization, blank lines around headings/fences/lists,
 * blank line collapsing (3+ to 2), terminal newline.
 *
 * @param content - Markdown content to normalize
 * @returns Normalized markdown string
 */
export function normalizeMd(content: string): string {
  if (!content || typeof content !== 'string') return content;

  // Normalize line endings to LF
  let text = content.replace(/\r\n/g, '\n');

  const lines = text.split('\n');
  const result: string[] = [];

  // Pre-compute fence state in a single O(n) pass
  const fenceRegex = /^```/;
  const insideFence = new Array<boolean>(lines.length);
  let fenceOpen = false;
  for (let i = 0; i < lines.length; i++) {
    if (fenceRegex.test(lines[i].trimEnd())) {
      if (fenceOpen) {
        insideFence[i] = false;
        fenceOpen = false;
      } else {
        insideFence[i] = false;
        fenceOpen = true;
      }
    } else {
      insideFence[i] = fenceOpen;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = i > 0 ? lines[i - 1] : '';
    const prevTrimmed = prev.trimEnd();
    const trimmed = line.trimEnd();
    const isFenceLine = fenceRegex.test(trimmed);

    // MD022: Blank line before headings (skip first line and frontmatter delimiters)
    if (/^#{1,6}\s/.test(trimmed) && i > 0 && prevTrimmed !== '' && prevTrimmed !== '---') {
      result.push('');
    }

    // MD031: Blank line before fenced code blocks (opening fences only)
    if (isFenceLine && i > 0 && prevTrimmed !== '' && !insideFence[i] && (i === 0 || !insideFence[i - 1] || isFenceLine)) {
      if (i === 0 || !insideFence[i - 1]) {
        result.push('');
      }
    }

    // MD032: Blank line before lists
    if (/^(\s*[-*+]\s|\s*\d+\.\s)/.test(line) && i > 0 &&
        prevTrimmed !== '' && !/^(\s*[-*+]\s|\s*\d+\.\s)/.test(prev) &&
        prevTrimmed !== '---') {
      result.push('');
    }

    result.push(line);

    // MD022: Blank line after headings
    if (/^#{1,6}\s/.test(trimmed) && i < lines.length - 1) {
      const next = lines[i + 1];
      if (next !== undefined && next.trimEnd() !== '') {
        result.push('');
      }
    }

    // MD031: Blank line after closing fenced code blocks
    if (/^```\s*$/.test(trimmed) && i > 0 && insideFence[i - 1] && i < lines.length - 1) {
      const next = lines[i + 1];
      if (next !== undefined && next.trimEnd() !== '') {
        result.push('');
      }
    }

    // MD032: Blank line after last list item in a block
    if (/^(\s*[-*+]\s|\s*\d+\.\s)/.test(line) && i < lines.length - 1) {
      const next = lines[i + 1];
      if (next !== undefined && next.trimEnd() !== '' &&
          !/^(\s*[-*+]\s|\s*\d+\.\s)/.test(next) &&
          !/^\s/.test(next)) {
        result.push('');
      }
    }
  }

  text = result.join('\n');

  // MD012: Collapse 3+ consecutive blank lines to 2
  text = text.replace(/\n{3,}/g, '\n\n');

  // MD047: Ensure file ends with exactly one newline
  text = text.replace(/\n*$/, '\n');

  return text;
}

// ─── planningPaths ──────────────────────────────────────────────────────────

/**
 * Get common .planning file paths for a project directory.
 *
 * Simplified version (no workstream/project env vars).
 * All paths returned in POSIX format.
 *
 * @param projectDir - Root project directory
 * @returns Object with paths to common .planning files
 */
export function planningPaths(projectDir: string): PlanningPaths {
  const base = join(projectDir, '.planning');
  return {
    planning: toPosixPath(base),
    state: toPosixPath(join(base, 'STATE.md')),
    roadmap: toPosixPath(join(base, 'ROADMAP.md')),
    project: toPosixPath(join(base, 'PROJECT.md')),
    config: toPosixPath(join(base, 'config.json')),
    phases: toPosixPath(join(base, 'phases')),
    requirements: toPosixPath(join(base, 'REQUIREMENTS.md')),
  };
}

// ─── resolvePathUnderProject ───────────────────────────────────────────────

/**
 * Resolve a user-supplied path against the project and ensure it cannot escape
 * the real project root (prefix checks are insufficient; symlinks are handled
 * via realpath).
 *
 * @param projectDir - Project root directory
 * @param userPath - Relative or absolute path from user input
 * @returns Canonical resolved path within the project
 */
export async function resolvePathUnderProject(projectDir: string, userPath: string): Promise<string> {
  const projectReal = await realpath(projectDir);
  const candidate = isAbsolute(userPath) ? normalize(userPath) : resolve(projectReal, userPath);
  let realCandidate: string;
  try {
    realCandidate = await realpath(candidate);
  } catch {
    realCandidate = candidate;
  }
  const rel = relative(projectReal, realCandidate);
  if (rel.startsWith('..') || (isAbsolute(rel) && rel.length > 0)) {
    throw new GSDError('path escapes project directory', ErrorClassification.Validation);
  }
  return realCandidate;
}
