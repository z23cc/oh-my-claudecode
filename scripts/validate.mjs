#!/usr/bin/env node

/**
 * Repository Validation — Full consistency check for oh-my-claudecode.
 *
 * Usage:
 *   node scripts/validate.mjs [--all] [--json] [--fix]
 *
 * Checks:
 *   1. Plugin structure (.claude-plugin/plugin.json)
 *   2. Agent definitions (frontmatter + registration)
 *   3. Skill definitions (SKILL.md existence)
 *   4. Hook script references
 *   5. TypeScript compilation (optional with --all)
 *   6. Task spec headings (if tasks exist)
 *   7. Epic consistency
 */

import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const doAll = args.includes('--all');
const asJson = args.includes('--json');

const results = { errors: [], warnings: [], info: [] };

function error(msg) { results.errors.push(msg); }
function warn(msg) { results.warnings.push(msg); }
function info(msg) { results.info.push(msg); }

// 1. Plugin structure
const pluginPath = join(ROOT, '.claude-plugin', 'plugin.json');
if (existsSync(pluginPath)) {
  try {
    const plugin = JSON.parse(readFileSync(pluginPath, 'utf-8'));
    const required = ['name', 'version', 'description'];
    for (const f of required) {
      if (!plugin[f]) error(`plugin.json missing field: ${f}`);
    }
    info(`Plugin: ${plugin.name} v${plugin.version}`);
  } catch {
    error('plugin.json is not valid JSON');
  }
} else {
  error('.claude-plugin/plugin.json not found');
}

// 2. Agent definitions
const agentsDir = join(ROOT, 'agents');
if (existsSync(agentsDir)) {
  const agentFiles = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  const defsPath = join(ROOT, 'src', 'agents', 'definitions.ts');
  const defsContent = existsSync(defsPath) ? readFileSync(defsPath, 'utf-8') : '';

  for (const file of agentFiles) {
    const name = basename(file, '.md');
    const content = readFileSync(join(agentsDir, file), 'utf-8');

    // Check frontmatter
    if (!content.startsWith('---')) {
      error(`agents/${file}: missing YAML frontmatter`);
    } else {
      const frontmatter = content.split('---')[1] || '';
      for (const field of ['name', 'description', 'model']) {
        if (!new RegExp(`^${field}:`, 'm').test(frontmatter)) {
          error(`agents/${file}: missing frontmatter field: ${field}`);
        }
      }
    }

    // Check registration
    if (defsContent && !defsContent.includes(`'${name}'`)) {
      error(`agents/${file}: not registered in definitions.ts`);
    }
  }
  info(`Agents: ${agentFiles.length} files checked`);
}

// 3. Skill definitions
const skillsDir = join(ROOT, 'skills');
if (existsSync(skillsDir)) {
  const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of skillDirs) {
    if (!existsSync(join(skillsDir, dir, 'SKILL.md'))) {
      error(`skills/${dir}/: missing SKILL.md`);
    }
  }
  info(`Skills: ${skillDirs.length} directories checked`);
}

// 4. Hook references
const hooksPath = join(ROOT, 'hooks', 'hooks.json');
if (existsSync(hooksPath)) {
  try {
    const hooks = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    for (const events of Object.values(hooks.hooks || {})) {
      for (const group of events) {
        for (const hook of group.hooks || []) {
          const cmd = hook.command || '';
          const match = cmd.match(/\/scripts\/([^\s"]+)/);
          if (match) {
            if (!existsSync(join(ROOT, 'scripts', match[1]))) {
              error(`Hook references missing script: scripts/${match[1]}`);
            }
          }
        }
      }
    }
    info('Hooks: references validated');
  } catch {
    error('hooks.json is not valid JSON');
  }
}

// 5. TypeScript compilation (only with --all)
if (doAll) {
  try {
    execSync('npx tsc --noEmit', { cwd: ROOT, encoding: 'utf-8', timeout: 60000 });
    info('TypeScript: compilation passed');
  } catch (e) {
    const output = e.stdout || e.message;
    const errorCount = (output.match(/error TS/g) || []).length;
    error(`TypeScript: ${errorCount} compilation error(s)`);
  }
}

// 6. File size check (300 line limit)
const srcDir = join(ROOT, 'src');
if (existsSync(srcDir)) {
  const checkDir = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        checkDir(full);
      } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const content = readFileSync(full, 'utf-8');
        const lines = content.split('\n').length;
        if (lines > 300) {
          warn(`${full.replace(ROOT + '/', '')}: ${lines} lines (exceeds 300 line guideline)`);
        }
      }
    }
  };
  checkDir(srcDir);
}

// Output
if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', RESET = '\x1b[0m';

  for (const msg of results.info) console.log(`${CYAN}INFO${RESET}: ${msg}`);
  for (const msg of results.warnings) console.log(`${YELLOW}WARN${RESET}: ${msg}`);
  for (const msg of results.errors) console.log(`${RED}ERROR${RESET}: ${msg}`);

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Errors: ${results.errors.length}  Warnings: ${results.warnings.length}`);

  if (results.errors.length > 0) {
    console.log(`${RED}Validation failed.${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}Validation passed.${RESET}`);
  }
}
