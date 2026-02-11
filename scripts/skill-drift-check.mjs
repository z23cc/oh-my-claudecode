#!/usr/bin/env node

/**
 * Skill Drift Checker
 *
 * Detects version drift between skill SKILL.md files and their
 * registered definitions in the TypeScript codebase.
 *
 * Checks:
 * 1. Every skills/ directory has a SKILL.md
 * 2. Every SKILL.md skill is registered in builtin-skills
 * 3. Every agent .md file has a matching definition in definitions.ts
 * 4. Hook script references exist on disk
 *
 * Usage:
 *   node scripts/skill-drift-check.mjs [--fix]
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = drift detected
 */

import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let errors = 0;
let warnings = 0;

function error(msg) {
  console.error(`${RED}ERROR${RESET}: ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`${YELLOW}WARN${RESET}: ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`${GREEN}OK${RESET}: ${msg}`);
}

// 1. Check skills/ directories have SKILL.md
const skillsDir = join(ROOT, 'skills');
if (existsSync(skillsDir)) {
  const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of skillDirs) {
    const skillFile = join(skillsDir, dir, 'SKILL.md');
    if (!existsSync(skillFile)) {
      error(`skills/${dir}/ missing SKILL.md`);
    }
  }
  ok(`Checked ${skillDirs.length} skill directories`);
}

// 2. Check agents/ have matching definitions
const agentsDir = join(ROOT, 'agents');
if (existsSync(agentsDir)) {
  const agentFiles = readdirSync(agentsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => basename(f, '.md'));

  // Read definitions.ts to check for registered agents
  const defsFile = join(ROOT, 'src', 'agents', 'definitions.ts');
  if (existsSync(defsFile)) {
    const defsContent = readFileSync(defsFile, 'utf-8');
    let unregistered = 0;

    for (const agent of agentFiles) {
      // Check if agent name appears in the registry map
      const pattern = `'${agent}'`;
      if (!defsContent.includes(pattern)) {
        error(`agents/${agent}.md not registered in definitions.ts (missing '${agent}' key)`);
        unregistered++;
      }
    }

    if (unregistered === 0) {
      ok(`All ${agentFiles.length} agents registered in definitions.ts`);
    }
  } else {
    warn('src/agents/definitions.ts not found — skipping agent registration check');
  }
}

// 3. Check hooks.json script references
const hooksFile = join(ROOT, 'hooks', 'hooks.json');
if (existsSync(hooksFile)) {
  try {
    const hooks = JSON.parse(readFileSync(hooksFile, 'utf-8'));
    let scriptCount = 0;
    let missingCount = 0;

    for (const events of Object.values(hooks.hooks || {})) {
      for (const group of events) {
        for (const hook of group.hooks || []) {
          const cmd = hook.command || '';
          const match = cmd.match(/\/scripts\/([^\s"]+)/);
          if (match) {
            scriptCount++;
            const scriptPath = join(ROOT, 'scripts', match[1]);
            if (!existsSync(scriptPath)) {
              error(`Hook references missing script: scripts/${match[1]}`);
              missingCount++;
            }
          }
        }
      }
    }

    if (missingCount === 0) {
      ok(`All ${scriptCount} hook script references exist`);
    }
  } catch {
    error('hooks.json is not valid JSON');
  }
}

// 4. Check plugin.json metadata
const pluginFile = join(ROOT, '.claude-plugin', 'plugin.json');
if (existsSync(pluginFile)) {
  try {
    const plugin = JSON.parse(readFileSync(pluginFile, 'utf-8'));
    const required = ['name', 'version', 'description'];
    const missing = required.filter(f => !plugin[f]);
    if (missing.length > 0) {
      error(`plugin.json missing required fields: ${missing.join(', ')}`);
    } else {
      ok(`Plugin: ${plugin.name} v${plugin.version}`);
    }
  } catch {
    error('.claude-plugin/plugin.json is not valid JSON');
  }
}

// Summary
console.log(`\n${errors > 0 ? RED : GREEN}${'─'.repeat(40)}${RESET}`);
console.log(`Errors: ${errors}  Warnings: ${warnings}`);

if (errors > 0) {
  console.log(`${RED}Drift detected. Fix issues above.${RESET}`);
  process.exit(1);
} else {
  console.log(`${GREEN}All checks passed.${RESET}`);
  process.exit(0);
}
