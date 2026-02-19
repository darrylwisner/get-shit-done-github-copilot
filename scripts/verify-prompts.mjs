// scripts/verify-prompts.mjs
// Verifies every commands/gsd/*.md has a generated .github/prompts/gsd.<cmd>.prompt.md

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COMMANDS_DIR = path.join(ROOT, 'commands', 'gsd');
const OUT_DIR = path.join(ROOT, '.github', 'prompts');

function listFiles(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(suffix));
}

function main() {
  const cmdFiles = listFiles(COMMANDS_DIR, '.md').filter(f => !f.endsWith('.bak'));
  const promptFiles = new Set(listFiles(OUT_DIR, '.prompt.md'));

  const missing = [];
  for (const cmd of cmdFiles) {
    const base = cmd.replace(/\.md$/, '');
    const expected = `gsd.${base}.prompt.md`;
    if (!promptFiles.has(expected)) missing.push(expected);
  }

  if (missing.length) {
    console.error('Missing generated prompt files:');
    for (const m of missing) console.error(`- ${m}`);
    process.exit(1);
  }

  console.log(`OK: ${cmdFiles.length} commands mapped to prompt files.`);
}

main();
