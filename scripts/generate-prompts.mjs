// scripts/generate-prompts.mjs
// Generates .github/prompts/*.prompt.md from upstream commands/gsd/*.md
// No external deps. Minimal YAML frontmatter parsing.
// Adds: Preflight + Copilot Runtime Adapter shim (universal).
// Fixes: ~/.claude and /.claude path rewrites to workspace-local ./.claude.
//
// Determinism:
// - stable file ordering
// - stable formatting
// - overwrite outputs

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const COMMANDS_DIR = path.join(ROOT, "commands", "gsd");
const OUT_DIR = path.join(ROOT, ".github", "prompts");

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.endsWith(".bak"))
    .sort((a, b) => a.localeCompare(b))
    .map((f) => path.join(dir, f));
}

// extremely small frontmatter parser: expects leading --- block
function parseFrontmatter(md) {
  if (!md.startsWith("---")) return { data: {}, body: md };

  // Find closing delimiter on its own line
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: md };

  const fm = match[1].trim();
  const body = match[2].trimStart();

  const data = {};
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (!m) continue;
    let [, k, v] = m;
    v = v.trim();

    // strip surrounding quotes if present
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }

    data[k] = v;
  }

  return { data, body };
}

function normalizeName(name) {
  // upstream uses gsd:new-project; VS Code prompt uses gsd.new-project
  return String(name).replace(/^gsd:/, "gsd.").replace(/:/g, ".");
}

function convertIncludes(text) {
  // Convert Claude-style @ includes into Copilot-friendly "Read file at:" bullets
  // Be conservative: only lines where first non-whitespace is '@'
  return text.replace(/^\s*@(?:include\s+)?(.+?)\s*$/gm, (m, p1) => {
    return `- Read file at: ${p1.trim()}`;
  });
}

function normalizeRuntimePathsForLocalInstall(text) {
  // Convert global/home runtime paths to workspace-local paths.
  // Handles:
  // - ~/.claude/... -> ./.claude/...
  // - /.claude/...  -> ./.claude/...   (important: appears in some upstream renderings)
  // Also supports opencode/gemini if present.
  return text
    .replace(/~\/\.(claude|opencode|gemini)\//g, "./.$1/")
    .replace(/\/\.(claude|opencode|gemini)\//g, "./.$1/");
}

function preflightBlock(cmdName) {
  return `## Preflight (required)

If the local GSD install does not exist in this workspace, do this **once**:

1. Check for: \`./.claude/get-shit-done/\`
2. If missing, run:

\`\`\`bash
npx get-shit-done-cc --claude --local
\`\`\`

3. Then re-run the slash command: \`/${cmdName}\`

---
`;
}

function adapterBlock() {
  // Universal shim: map upstream AskUserQuestion to VS Code's askQuestions tool.
  return `## Copilot Runtime Adapter (important)

Upstream GSD command sources may reference an \`AskUserQuestion\` tool (Claude/OpenCode runtime concept).

In VS Code Copilot, **do not attempt to call a tool named \`AskUserQuestion\`**.
Instead, whenever the upstream instructions say "Use AskUserQuestion", use **#tool:vscode/askQuestions** with:

- Combine the **Header** and **Question** into a single clear question string.
- If the upstream instruction specifies **Options**, present them as numbered choices.
- If no options are specified, ask as a freeform question.

**Rules:**
1. If the options include "Other", "Something else", or "Let me explain", and the user selects it, follow up with a freeform question via #tool:vscode/askQuestions.
2. Follow the upstream branching and loop rules exactly as written (e.g., "if X selected, do Y; otherwise continue").
3. If the upstream flow says to **exit/stop** and run another command, tell the user to run that slash command next, then stop.
4. Use #tool:vscode/askQuestions freely — do not guess or assume user intent.

---
`;
}

function generatedBanner(sourceRel) {
  return `<!-- GENERATED FILE — DO NOT EDIT.
Source: ${sourceRel}
Regenerate: node scripts/generate-prompts.mjs
-->`;
}

function escapeYamlString(s) {
  // safest deterministic quoting for YAML one-liners
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildPrompt({ cmdFile, fm, body }) {
  const upstreamName = fm.name || "";
  const cmdName = upstreamName
    ? normalizeName(upstreamName)
    : "gsd." + path.basename(cmdFile, ".md");

  const description = fm.description || `GSD command ${cmdName}`;
  const argumentHint = fm["argument-hint"] || "";

  // Transform body with minimal changes
  let converted = body;
  converted = convertIncludes(converted);
  converted = normalizeRuntimePathsForLocalInstall(converted);

  // Normalize newlines
  converted = converted.replace(/\r\n/g, "\n");

  // Detect if upstream body references AskUserQuestion — if so, declare the tool
  const needsAskTool = /AskUserQuestion/i.test(converted);

  const sourceRel = path.posix.join(
    "commands",
    "gsd",
    path.basename(cmdFile)
  );

  // Build tools array: always include base tools, conditionally add askQuestions
  const tools = ["agent", "search", "read", "vscode/askQuestions", "execute", "edit"];
  /*if (needsAskTool) {
    tools.push("vscode/askQuestions");
  }*/
  const toolsYaml = `[${tools.map((t) => `'${t}'`).join(", ")}]`;

  return `---
name: ${cmdName}
description: "${escapeYamlString(description)}"
argument-hint: "${escapeYamlString(argumentHint)}"
tools: ${toolsYaml}
agent: agent
---

${generatedBanner(sourceRel)}

${preflightBlock(cmdName)}
${adapterBlock()}
${converted.trimEnd()}
`;
}

function main() {
  const files = listMarkdownFiles(COMMANDS_DIR);
  if (!files.length) {
    console.error(`No command files found at ${COMMANDS_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const f of files) {
    const md = readFile(f);
    const { data, body } = parseFrontmatter(md);
    const prompt = buildPrompt({ cmdFile: f, fm: data, body });

    const base = path.basename(f, ".md"); // e.g., new-project
    const outName = `gsd.${base}.prompt.md`;
    const outPath = path.join(OUT_DIR, outName);

    writeFile(outPath, prompt);
  }

  console.log(`Generated ${files.length} prompt files into ${OUT_DIR}`);
}

main();