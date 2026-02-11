/**
 * Plan Sync - Detect spec drift after task completion
 *
 * When a task completes, compares its original spec against actual implementation
 * to find downstream tasks that reference stale identifiers (function names,
 * file paths, API routes, type names).
 */

import { listTaskIds, readTask } from './task-file-ops.js';
import type { TaskFile } from './types.js';

/** A single drift item: planned name vs actual name */
export interface DriftItem {
  planned: string;
  actual: string;
  type: 'function' | 'file_path' | 'type' | 'api_route' | 'class' | 'variable';
}

/** A downstream task affected by drift */
export interface AffectedTask {
  taskId: string;
  subject: string;
  staleReferences: StaleReference[];
}

/** A specific stale reference in a downstream task */
export interface StaleReference {
  planned: string;
  actual: string;
  context: string;
  confidence: 'HIGH' | 'MEDIUM';
}

/** Full drift report */
export interface DriftReport {
  completedTaskId: string;
  completedSubject: string;
  baseCommit?: string;
  finalCommit?: string;
  driftItems: DriftItem[];
  affectedTasks: AffectedTask[];
  unaffectedTasks: string[];
  timestamp: string;
}

/**
 * Find all downstream tasks that depend on the completed task.
 * Includes both direct blockedBy dependents and same-epic tasks.
 */
export function findDownstreamTasks(
  teamName: string,
  completedTaskId: string,
  epicId?: string
): TaskFile[] {
  const allIds = listTaskIds(teamName);
  const downstream: TaskFile[] = [];
  const seen = new Set<string>();

  for (const id of allIds) {
    if (id === completedTaskId) continue;
    const task = readTask(teamName, id);
    if (!task) continue;
    if (task.status === 'completed') continue;

    // Direct dependency: task is blocked by the completed task
    if (task.blockedBy?.includes(completedTaskId)) {
      if (!seen.has(id)) {
        downstream.push(task);
        seen.add(id);
      }
    }

    // Same epic: if completed task has an epicId, check siblings
    if (epicId && task.epicId === epicId && !seen.has(id)) {
      downstream.push(task);
      seen.add(id);
    }
  }

  // Limit to 10 to prevent token explosion
  return downstream.slice(0, 10);
}

/**
 * Scan a downstream task's description for references to any drifted identifiers.
 * Returns stale references found.
 */
export function scanForStaleReferences(
  task: TaskFile,
  driftItems: DriftItem[]
): StaleReference[] {
  const results: StaleReference[] = [];
  const text = `${task.subject}\n${task.description}`;

  for (const drift of driftItems) {
    if (!drift.planned || !drift.actual) continue;
    if (drift.planned === drift.actual) continue;

    // Exact match (HIGH confidence)
    if (text.includes(drift.planned)) {
      // Find context line
      const lines = text.split('\n');
      const matchLine = lines.find(l => l.includes(drift.planned)) || '';
      results.push({
        planned: drift.planned,
        actual: drift.actual,
        context: matchLine.trim(),
        confidence: 'HIGH',
      });
      continue;
    }

    // Partial match: check base name without path/extension (MEDIUM confidence)
    const plannedBase = extractBaseName(drift.planned);
    const actualBase = extractBaseName(drift.actual);
    if (plannedBase && plannedBase !== actualBase && text.includes(plannedBase)) {
      const lines = text.split('\n');
      const matchLine = lines.find(l => l.includes(plannedBase)) || '';
      results.push({
        planned: drift.planned,
        actual: drift.actual,
        context: matchLine.trim(),
        confidence: 'MEDIUM',
      });
    }
  }

  return results;
}

/**
 * Build a drift report for a completed task against its downstream dependents.
 */
export function buildDriftReport(
  teamName: string,
  completedTaskId: string,
  driftItems: DriftItem[]
): DriftReport {
  const task = readTask(teamName, completedTaskId);
  if (!task) {
    return {
      completedTaskId,
      completedSubject: '(task not found)',
      driftItems,
      affectedTasks: [],
      unaffectedTasks: [],
      timestamp: new Date().toISOString(),
    };
  }

  const downstream = findDownstreamTasks(teamName, completedTaskId, task.epicId);
  const affectedTasks: AffectedTask[] = [];
  const unaffectedTasks: string[] = [];

  for (const dt of downstream) {
    const staleRefs = scanForStaleReferences(dt, driftItems);
    if (staleRefs.length > 0) {
      affectedTasks.push({
        taskId: dt.id,
        subject: dt.subject,
        staleReferences: staleRefs,
      });
    } else {
      unaffectedTasks.push(dt.id);
    }
  }

  return {
    completedTaskId,
    completedSubject: task.subject,
    baseCommit: task.evidence?.baseCommit,
    finalCommit: task.evidence?.finalCommit,
    driftItems,
    affectedTasks,
    unaffectedTasks,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format a drift report as markdown.
 */
export function formatDriftReport(report: DriftReport): string {
  const lines: string[] = [];

  lines.push('## Plan Sync Report');
  lines.push('');
  lines.push(`**Completed Task:** ${report.completedTaskId} - ${report.completedSubject}`);
  if (report.baseCommit) lines.push(`**Base Commit:** ${report.baseCommit}`);
  if (report.finalCommit) lines.push(`**Final Commit:** ${report.finalCommit}`);
  lines.push('');

  if (report.driftItems.length === 0) {
    lines.push('### No Drift Detected');
    lines.push('Implementation matches the original spec.');
    return lines.join('\n');
  }

  lines.push('### Drift Detected');
  lines.push('| Planned | Actual | Type |');
  lines.push('|---------|--------|------|');
  for (const item of report.driftItems) {
    lines.push(`| \`${item.planned}\` | \`${item.actual}\` | ${item.type} |`);
  }
  lines.push('');

  if (report.affectedTasks.length > 0) {
    lines.push('### Affected Downstream Tasks');
    lines.push('');
    for (const at of report.affectedTasks) {
      lines.push(`**Task ${at.taskId}: ${at.subject}**`);
      for (const ref of at.staleReferences) {
        lines.push(`- Context: "${ref.context}"`);
        lines.push(`  - Replace: \`${ref.planned}\` -> \`${ref.actual}\``);
        lines.push(`  - Confidence: ${ref.confidence}`);
      }
      lines.push('');
    }
  }

  if (report.unaffectedTasks.length > 0) {
    lines.push('### Unaffected Tasks');
    lines.push(report.unaffectedTasks.map(id => `- Task ${id}: no stale references`).join('\n'));
    lines.push('');
  }

  lines.push('### Summary');
  lines.push(`- Drift items: ${report.driftItems.length}`);
  lines.push(`- Affected tasks: ${report.affectedTasks.length}`);
  const action = report.affectedTasks.length > 0 ? 'Update affected task specs' : 'No action needed';
  lines.push(`- Recommended action: ${action}`);

  return lines.join('\n');
}

/** Extract base name from a path or qualified name */
function extractBaseName(name: string): string {
  // Handle file paths: src/auth/user-auth.ts -> user-auth
  if (name.includes('/')) {
    const parts = name.split('/');
    const file = parts[parts.length - 1];
    return file.replace(/\.[^.]+$/, '');
  }
  // Handle qualified names: UserAuth.login -> login
  if (name.includes('.')) {
    const parts = name.split('.');
    return parts[parts.length - 1];
  }
  return name;
}
