/**
 * Epic Operations
 * Group tasks into epics for higher-level tracking and progress reporting
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { sanitizeName } from './tmux-session.js';
import { atomicWriteJson, validateResolvedPath, ensureDirWithMode } from './fs-utils.js';
import { listTaskIds, readTask } from './task-file-ops.js';

/** Epic file stored at ~/.claude/tasks/{team}/epics/{epicId}.json */
export interface EpicFile {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  status: 'active' | 'completed' | 'archived';
  dependsOn?: string[];
  completionReviewStatus?: 'pending' | 'passed' | 'failed';
  completionReviewTimestamp?: string;
  /** Default backend specs for tasks in this epic */
  default_impl?: string;
  default_review?: string;
  default_sync?: string;
}

/** Aggregated status for an epic */
export interface EpicStatus {
  epicId: string;
  epicName: string;
  totalTasks: number;
  pending: number;
  inProgress: number;
  completed: number;
  percentComplete: number;
}

/** Epic with blocking info for dependency graph */
export interface EpicDependencyInfo {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'archived';
  dependsOn: string[];
  blockedBy: string[];
  isReady: boolean;
}

/** Execution phase: group of epics that can run in parallel */
export interface ExecutionPhase {
  phase: number;
  epicIds: string[];
}

/** Get the epics directory for a team */
function epicsDir(teamName: string): string {
  const base = join(homedir(), '.claude', 'tasks', sanitizeName(teamName), 'epics');
  validateResolvedPath(base, join(homedir(), '.claude', 'tasks'));
  return base;
}

/** Sanitize epic ID for safe file paths */
function sanitizeEpicId(epicId: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(epicId)) {
    throw new Error(`Invalid epic ID: "${epicId}" contains unsafe characters`);
  }
  return epicId;
}

/** Get path to a specific epic file */
function epicPath(teamName: string, epicId: string): string {
  return join(epicsDir(teamName), `${sanitizeEpicId(epicId)}.json`);
}

/**
 * Create a new epic
 */
export function createEpic(
  teamName: string,
  epicId: string,
  name: string,
  description: string
): EpicFile {
  const dir = epicsDir(teamName);
  ensureDirWithMode(dir);

  const epic: EpicFile = {
    id: epicId,
    name,
    description,
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  atomicWriteJson(epicPath(teamName, epicId), epic);
  return epic;
}

/**
 * Read a single epic
 */
export function readEpic(teamName: string, epicId: string): EpicFile | null {
  const filePath = epicPath(teamName, epicId);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as EpicFile;
  } catch {
    return null;
  }
}

/**
 * List all epics for a team
 */
export function listEpics(teamName: string): EpicFile[] {
  const dir = epicsDir(teamName);
  if (!existsSync(dir)) return [];

  try {
    const files = readdirSync(dir).filter(
      (f: string) => f.endsWith('.json')
    );

    const epics: EpicFile[] = [];
    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), 'utf-8');
        epics.push(JSON.parse(raw) as EpicFile);
      } catch {
        // Skip malformed epic files
      }
    }

    return epics;
  } catch {
    return [];
  }
}

/**
 * List all tasks belonging to a specific epic
 */
export function listEpicTasks(teamName: string, epicId: string): string[] {
  const taskIds = listTaskIds(teamName);
  const matching: string[] = [];

  for (const id of taskIds) {
    const task = readTask(teamName, id);
    if (task && task.epicId === epicId) {
      matching.push(id);
    }
  }

  return matching;
}

/**
 * Get aggregated status for an epic
 */
export function getEpicStatus(teamName: string, epicId: string): EpicStatus | null {
  const epic = readEpic(teamName, epicId);
  if (!epic) return null;

  const taskIds = listEpicTasks(teamName, epicId);
  let pending = 0;
  let inProgress = 0;
  let completed = 0;

  for (const id of taskIds) {
    const task = readTask(teamName, id);
    if (!task) continue;
    switch (task.status) {
      case 'pending': pending++; break;
      case 'in_progress': inProgress++; break;
      case 'completed': completed++; break;
    }
  }

  const total = pending + inProgress + completed;

  return {
    epicId,
    epicName: epic.name,
    totalTasks: total,
    pending,
    inProgress,
    completed,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Build dependency info for all epics (blocking chains analysis)
 */
export function buildEpicDependencyGraph(teamName: string): EpicDependencyInfo[] {
  const epics = listEpics(teamName);
  const statusMap = new Map(epics.map(e => [e.id, e.status]));

  return epics.filter(e => e.status !== 'archived').map(epic => {
    const deps = epic.dependsOn ?? [];
    const blockedBy = deps.filter(depId => statusMap.get(depId) !== 'completed');
    return {
      id: epic.id,
      name: epic.name,
      status: epic.status,
      dependsOn: deps,
      blockedBy,
      isReady: epic.status !== 'completed' && blockedBy.length === 0,
    };
  });
}

/**
 * Compute parallel execution phases using topological sort
 * Each phase contains epics that can run concurrently
 */
export function computeExecutionPhases(teamName: string): ExecutionPhase[] {
  const graph = buildEpicDependencyGraph(teamName);
  const openEpics = graph.filter(e => e.status !== 'completed');
  const assigned = new Set<string>();
  const phases: ExecutionPhase[] = [];

  for (let phase = 1; phase <= openEpics.length; phase++) {
    const ready = openEpics.filter(e =>
      !assigned.has(e.id) &&
      e.dependsOn.every(dep =>
        assigned.has(dep) || graph.find(g => g.id === dep)?.status === 'completed'
      )
    );

    if (ready.length === 0) break;

    phases.push({ phase, epicIds: ready.map(e => e.id) });
    for (const e of ready) assigned.add(e.id);
  }

  return phases;
}

/**
 * Find the critical path (longest chain of dependent epics)
 */
export function findCriticalPath(teamName: string): string[] {
  const graph = buildEpicDependencyGraph(teamName);
  const openEpics = graph.filter(e => e.status !== 'completed');
  const depMap = new Map(openEpics.map(e => [e.id, e.dependsOn]));

  function longestPath(epicId: string, visited: Set<string>): string[] {
    if (visited.has(epicId)) return [];
    visited.add(epicId);

    const deps = (depMap.get(epicId) ?? []).filter(d =>
      openEpics.some(e => e.id === d)
    );

    if (deps.length === 0) return [epicId];

    let longest: string[] = [];
    for (const dep of deps) {
      const path = longestPath(dep, new Set(visited));
      if (path.length > longest.length) longest = path;
    }

    return [...longest, epicId];
  }

  let criticalPath: string[] = [];
  for (const epic of openEpics) {
    const path = longestPath(epic.id, new Set());
    if (path.length > criticalPath.length) criticalPath = path;
  }

  return criticalPath;
}

/**
 * Format dependency graph as markdown for display
 */
export function formatDependencyGraph(teamName: string): string {
  const graph = buildEpicDependencyGraph(teamName);
  const phases = computeExecutionPhases(teamName);
  const criticalPath = findCriticalPath(teamName);

  const lines: string[] = ['## Epic Dependency Graph', ''];

  // Status overview table
  lines.push('### Status Overview', '');
  lines.push('| Epic | Title | Status | Dependencies | Blocked By |');
  lines.push('|------|-------|--------|--------------|------------|');
  for (const epic of graph) {
    const status = epic.isReady ? '**READY**' : epic.status;
    const deps = epic.dependsOn.length > 0 ? epic.dependsOn.join(', ') : '-';
    const blocked = epic.blockedBy.length > 0 ? epic.blockedBy.join(', ') : '-';
    lines.push(`| ${epic.id} | ${epic.name} | ${status} | ${deps} | ${blocked} |`);
  }

  // Execution phases
  if (phases.length > 0) {
    lines.push('', '### Execution Phases', '');
    lines.push('| Phase | Epics | Can Start |');
    lines.push('|-------|-------|-----------|');
    for (const phase of phases) {
      const canStart = phase.phase === 1 ? '**NOW**' : `After Phase ${phase.phase - 1}`;
      lines.push(`| **${phase.phase}** | ${phase.epicIds.join(', ')} | ${canStart} |`);
    }
  }

  // Critical path
  if (criticalPath.length > 1) {
    lines.push('', '### Critical Path', '');
    lines.push(`${criticalPath.join(' → ')} (${criticalPath.length} phases)`);
  }

  return lines.join('\n');
}

/**
 * Check if an epic is ready for completion review (all tasks completed)
 */
export function isEpicReadyForReview(teamName: string, epicId: string): boolean {
  const status = getEpicStatus(teamName, epicId);
  if (!status) return false;
  return status.totalTasks > 0 && status.pending === 0 && status.inProgress === 0;
}

/**
 * Record completion review result for an epic
 */
export function recordCompletionReview(
  teamName: string,
  epicId: string,
  passed: boolean
): void {
  const epic = readEpic(teamName, epicId);
  if (!epic) throw new Error(`Epic not found: ${epicId}`);

  const updated: EpicFile = {
    ...epic,
    completionReviewStatus: passed ? 'passed' : 'failed',
    completionReviewTimestamp: new Date().toISOString(),
    status: passed ? 'completed' : epic.status,
  };

  atomicWriteJson(epicPath(teamName, epicId), updated);
}

/**
 * Set default backend specs for an epic's tasks.
 */
export function setEpicBackend(
  teamName: string,
  epicId: string,
  backends: { impl?: string; review?: string; sync?: string }
): void {
  const epic = readEpic(teamName, epicId);
  if (!epic) throw new Error(`Epic not found: ${epicId}`);

  const updated: EpicFile = { ...epic };
  if (backends.impl !== undefined) updated.default_impl = backends.impl;
  if (backends.review !== undefined) updated.default_review = backends.review;
  if (backends.sync !== undefined) updated.default_sync = backends.sync;

  atomicWriteJson(epicPath(teamName, epicId), updated);
}

/**
 * Check if adding a dependency would create a cycle.
 */
function wouldCreateCycle(teamName: string, epicId: string, dependsOnId: string): boolean {
  // DFS from dependsOnId — if we can reach epicId, it's a cycle
  const visited = new Set<string>();
  const stack = [dependsOnId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === epicId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const ep = readEpic(teamName, current);
    if (ep?.dependsOn) {
      for (const dep of ep.dependsOn) stack.push(dep);
    }
  }
  return false;
}

/**
 * Add dependency between epics (with cycle detection).
 */
export function addEpicDependency(teamName: string, epicId: string, dependsOnId: string): void {
  const epic = readEpic(teamName, epicId);
  if (!epic) throw new Error(`Epic not found: ${epicId}`);

  if (epicId === dependsOnId) throw new Error(`Epic cannot depend on itself: ${epicId}`);
  if (wouldCreateCycle(teamName, epicId, dependsOnId)) {
    throw new Error(`Adding dependency ${epicId} -> ${dependsOnId} would create a cycle`);
  }

  const deps = new Set(epic.dependsOn ?? []);
  deps.add(dependsOnId);
  const updated: EpicFile = { ...epic, dependsOn: [...deps] };
  atomicWriteJson(epicPath(teamName, epicId), updated);
}

/**
 * Remove dependency between epics.
 */
export function removeEpicDependency(teamName: string, epicId: string, dependsOnId: string): void {
  const epic = readEpic(teamName, epicId);
  if (!epic) throw new Error(`Epic not found: ${epicId}`);

  const deps = (epic.dependsOn ?? []).filter(d => d !== dependsOnId);
  const updated: EpicFile = { ...epic, dependsOn: deps };
  atomicWriteJson(epicPath(teamName, epicId), updated);
}
