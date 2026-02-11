/**
 * Pitfall Capture
 * Structured learning from review rejections and discovered patterns
 */

import { loadProjectMemory, saveProjectMemory } from './storage.js';
import type { CustomNote } from './types.js';

const MAX_NOTES = 20;

/**
 * Capture a pitfall discovered during review or execution
 */
export async function capturePitfall(
  projectRoot: string,
  content: string,
  sourceTask?: string,
  sourceVerdict?: string
): Promise<void> {
  await addTypedNote(projectRoot, {
    noteType: 'pitfall',
    category: 'pitfall',
    content,
    sourceTask,
    sourceVerdict,
  });
}

/**
 * Capture a discovered convention
 */
export async function captureConvention(
  projectRoot: string,
  content: string
): Promise<void> {
  await addTypedNote(projectRoot, {
    noteType: 'convention',
    category: 'convention',
    content,
  });
}

/**
 * Capture an architecture decision
 */
export async function captureDecision(
  projectRoot: string,
  content: string,
  rationale?: string
): Promise<void> {
  await addTypedNote(projectRoot, {
    noteType: 'decision',
    category: 'decision',
    content,
    rationale,
  });
}

/**
 * Search custom notes by regex query
 */
export async function searchMemory(
  projectRoot: string,
  query: string
): Promise<CustomNote[]> {
  const memory = await loadProjectMemory(projectRoot);
  if (!memory) return [];

  const regex = new RegExp(query, 'i');
  return memory.customNotes.filter(
    n => regex.test(n.content) || regex.test(n.category)
  );
}

/**
 * Get notes filtered by noteType
 */
export async function getNotesByType(
  projectRoot: string,
  noteType: 'pitfall' | 'convention' | 'decision' | 'general'
): Promise<CustomNote[]> {
  const memory = await loadProjectMemory(projectRoot);
  if (!memory) return [];

  return memory.customNotes.filter(n => n.noteType === noteType);
}

/**
 * Internal helper to add a typed note with deduplication and LRU eviction
 */
async function addTypedNote(
  projectRoot: string,
  fields: {
    noteType: CustomNote['noteType'];
    category: string;
    content: string;
    sourceTask?: string;
    sourceVerdict?: string;
    rationale?: string;
  }
): Promise<void> {
  try {
    const memory = await loadProjectMemory(projectRoot);
    if (!memory) return;

    // Deduplicate by content + category
    const exists = memory.customNotes.some(
      n => n.content === fields.content && n.category === fields.category
    );
    if (exists) return;

    const note: CustomNote = {
      timestamp: Date.now(),
      source: 'learned',
      category: fields.category,
      content: fields.content,
      noteType: fields.noteType,
      sourceTask: fields.sourceTask,
      sourceVerdict: fields.sourceVerdict,
      rationale: fields.rationale,
    };

    memory.customNotes.push(note);

    // LRU eviction at MAX_NOTES entries
    if (memory.customNotes.length > MAX_NOTES) {
      memory.customNotes = memory.customNotes.slice(-MAX_NOTES);
    }

    await saveProjectMemory(projectRoot, memory);
  } catch (error) {
    console.error('Error capturing note:', error);
  }
}
