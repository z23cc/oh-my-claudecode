#!/usr/bin/env node

/**
 * Memory CLI — Command-line interface for project memory management.
 *
 * Usage:
 *   node scripts/memory-cli.mjs init [dir]
 *   node scripts/memory-cli.mjs add --type pitfall|convention|decision --content "..."
 *   node scripts/memory-cli.mjs list [--type pitfall|convention|decision]
 *   node scripts/memory-cli.mjs search <pattern>
 *   node scripts/memory-cli.mjs read <id>
 *   node scripts/memory-cli.mjs stats
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const MEMORY_FILE = '.omc/project-memory.json';

function getMemoryPath(dir) {
  return join(dir || process.cwd(), MEMORY_FILE);
}

function loadMemory(dir) {
  const path = getMemoryPath(dir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch { return null; }
}

function saveMemory(dir, data) {
  const path = getMemoryPath(dir);
  const parentDir = join(dir || process.cwd(), '.omc');
  if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function cmd_init(dir) {
  const path = getMemoryPath(dir);
  if (existsSync(path)) {
    console.log(`Memory already exists: ${path}`);
    return;
  }
  const initial = {
    version: '1.0',
    projectName: '',
    detectedPatterns: [],
    environmentHints: [],
    customNotes: [],
    createdAt: new Date().toISOString(),
  };
  saveMemory(dir, initial);
  console.log(`Initialized: ${path}`);
}

function cmd_add(dir, type, content, category) {
  const memory = loadMemory(dir);
  if (!memory) { console.error('Memory not initialized. Run: memory-cli.mjs init'); process.exit(1); }

  const note = {
    id: `note-${Date.now()}`,
    category: category || type || 'general',
    content,
    noteType: type || 'general',
    addedAt: new Date().toISOString(),
  };

  if (!memory.customNotes) memory.customNotes = [];

  // Dedup by content
  const exists = memory.customNotes.some(n => n.content === content);
  if (exists) { console.log('Note already exists (duplicate content).'); return; }

  // LRU eviction at 20
  if (memory.customNotes.length >= 20) {
    memory.customNotes.shift();
  }

  memory.customNotes.push(note);
  saveMemory(dir, memory);
  console.log(`Added ${type}: ${note.id}`);
}

function cmd_list(dir, filterType) {
  const memory = loadMemory(dir);
  if (!memory) { console.error('Memory not initialized.'); process.exit(1); }

  const notes = (memory.customNotes || []).filter(n =>
    !filterType || n.noteType === filterType || n.category === filterType
  );

  if (notes.length === 0) {
    console.log('No notes found.');
    return;
  }

  for (const note of notes) {
    const tag = note.noteType ? `[${note.noteType}]` : `[${note.category}]`;
    console.log(`  ${note.id}  ${tag}  ${note.content.slice(0, 80)}`);
  }
  console.log(`\n${notes.length} note(s)`);
}

/** Escape special regex characters for safe literal matching */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Validate regex pattern is safe (no catastrophic backtracking) */
function isSafeRegex(pattern) {
  // Reject patterns with nested quantifiers that cause ReDoS
  if (/(\+|\*|\{)\s*\)?\s*(\+|\*|\{)/.test(pattern)) return false;
  // Reject overly complex patterns
  try { new RegExp(pattern); return true; } catch { return false; }
}

function cmd_search(dir, pattern) {
  const memory = loadMemory(dir);
  if (!memory) { console.error('Memory not initialized.'); process.exit(1); }

  // Validate regex safety; fall back to escaped literal if unsafe
  let regex;
  if (isSafeRegex(pattern)) {
    try { regex = new RegExp(pattern, 'i'); } catch { regex = new RegExp(escapeRegex(pattern), 'i'); }
  } else {
    console.error(`Warning: pattern "${pattern}" contains unsafe regex constructs. Using literal match.`);
    regex = new RegExp(escapeRegex(pattern), 'i');
  }
  const results = (memory.customNotes || []).filter(n => regex.test(n.content));

  if (results.length === 0) {
    console.log(`No matches for "${pattern}"`);
    return;
  }

  for (const note of results) {
    const tag = note.noteType ? `[${note.noteType}]` : `[${note.category}]`;
    console.log(`  ${note.id}  ${tag}  ${note.content.slice(0, 80)}`);
  }
  console.log(`\n${results.length} match(es)`);
}

function cmd_read(dir, id) {
  const memory = loadMemory(dir);
  if (!memory) { console.error('Memory not initialized.'); process.exit(1); }

  const note = (memory.customNotes || []).find(n => n.id === id);
  if (!note) { console.error(`Note not found: ${id}`); process.exit(1); }

  console.log(JSON.stringify(note, null, 2));
}

function cmd_stats(dir) {
  const memory = loadMemory(dir);
  if (!memory) { console.error('Memory not initialized.'); process.exit(1); }

  const notes = memory.customNotes || [];
  const byType = {};
  for (const n of notes) {
    const t = n.noteType || n.category || 'general';
    byType[t] = (byType[t] || 0) + 1;
  }

  console.log(`Project Memory Stats`);
  console.log(`  Patterns: ${(memory.detectedPatterns || []).length}`);
  console.log(`  Environment hints: ${(memory.environmentHints || []).length}`);
  console.log(`  Custom notes: ${notes.length}`);
  for (const [type, count] of Object.entries(byType)) {
    console.log(`    ${type}: ${count}`);
  }
}

// Parse args
const args = process.argv.slice(2);
const command = args[0];
const dir = process.cwd();

switch (command) {
  case 'init':
    cmd_init(args[1] || dir);
    break;
  case 'add': {
    let type = 'general', content = '', category = '';
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--type' && args[i+1]) { type = args[++i]; }
      else if (args[i] === '--content' && args[i+1]) { content = args[++i]; }
      else if (args[i] === '--category' && args[i+1]) { category = args[++i]; }
      else if (!content) { content = args[i]; }
    }
    if (!content) { console.error('Usage: add --type pitfall --content "..."'); process.exit(1); }
    cmd_add(dir, type, content, category);
    break;
  }
  case 'list': {
    const filterType = args[1] === '--type' ? args[2] : args[1];
    cmd_list(dir, filterType);
    break;
  }
  case 'search':
    if (!args[1]) { console.error('Usage: search <pattern>'); process.exit(1); }
    cmd_search(dir, args[1]);
    break;
  case 'read':
    if (!args[1]) { console.error('Usage: read <id>'); process.exit(1); }
    cmd_read(dir, args[1]);
    break;
  case 'stats':
    cmd_stats(dir);
    break;
  default:
    console.log('Usage: memory-cli.mjs <init|add|list|search|read|stats>');
    console.log('  init [dir]                      Initialize project memory');
    console.log('  add --type <type> --content "…"  Add a note (pitfall|convention|decision|general)');
    console.log('  list [--type <type>]             List notes, optionally by type');
    console.log('  search <pattern>                 Search notes by regex');
    console.log('  read <id>                        Read full note by ID');
    console.log('  stats                            Show memory statistics');
    break;
}
