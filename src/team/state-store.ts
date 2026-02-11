/**
 * State Store — Runtime state management with file locking.
 *
 * Separates runtime state (status, assignee, timestamps) from
 * tracked definitions (spec, description, acceptance criteria).
 *
 * State directory resolution:
 *   1. OMC_STATE_DIR env var (explicit override)
 *   2. git common-dir (shared across worktrees)
 *   3. ~/.claude/tasks/{team}/state/ fallback
 */

import { existsSync, readFileSync, openSync, closeSync, writeSync, readdirSync, statSync, unlinkSync, constants } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { atomicWriteJson, ensureDirWithMode } from './fs-utils.js';

/** Fields that belong in runtime state, not tracked definitions */
export const RUNTIME_FIELDS = new Set([
  'status',
  'updated_at',
  'claimed_at',
  'assignee',
  'claim_note',
  'evidence',
  'blocked_reason',
]);

/** Lock file stale timeout (ms) */
const LOCK_STALE_MS = 30_000;

/** Abstract state store interface */
export interface StateStore {
  loadRuntime(taskId: string): Record<string, unknown> | null;
  saveRuntime(taskId: string, data: Record<string, unknown>): void;
  listRuntimeFiles(): string[];
}

/**
 * Resolve the state directory for runtime task state.
 */
export function getStateDir(teamName: string): string {
  // 1. Explicit override
  const envDir = process.env['OMC_STATE_DIR'];
  if (envDir) return join(envDir, teamName);

  // 2. Git common-dir (shared across worktrees)
  try {
    const commonDir = execSync('git rev-parse --git-common-dir', {
      encoding: 'utf-8', timeout: 3000,
    }).trim();
    if (commonDir && commonDir !== '.git') {
      return join(commonDir, 'omc-state', teamName);
    }
  } catch { /* not a git repo */ }

  // 3. Fallback
  return join(homedir(), '.claude', 'tasks', teamName, 'state');
}

/**
 * File-based state store with atomic writes.
 */
export class LocalFileStateStore implements StateStore {
  private tasksDir: string;
  private locksDir: string;

  constructor(stateDir: string) {
    this.tasksDir = join(stateDir, 'tasks');
    this.locksDir = join(stateDir, 'locks');
  }

  private statePath(taskId: string): string {
    return join(this.tasksDir, `${taskId}.state.json`);
  }

  private lockPath(taskId: string): string {
    return join(this.locksDir, `${taskId}.lock`);
  }

  loadRuntime(taskId: string): Record<string, unknown> | null {
    const path = this.statePath(taskId);
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      return null;
    }
  }

  saveRuntime(taskId: string, data: Record<string, unknown>): void {
    ensureDirWithMode(this.tasksDir);
    atomicWriteJson(this.statePath(taskId), data);
  }

  /**
   * Acquire an exclusive lock file using O_CREAT|O_EXCL (kernel-atomic).
   * Returns fd on success, -1 if lock is held by another process.
   * Reaps stale locks (older than LOCK_STALE_MS with dead PID).
   */
  acquireLock(taskId: string): number {
    ensureDirWithMode(this.locksDir);
    const lockFile = this.lockPath(taskId);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const fd = openSync(lockFile, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
        // Write PID for stale detection
        const payload = JSON.stringify({ pid: process.pid, ts: Date.now() });
        writeSync(fd, payload, null, 'utf-8');
        return fd;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'EEXIST') {
          // Lock exists — check if stale on first attempt
          if (attempt === 0) {
            try {
              const stat = statSync(lockFile);
              if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
                // Check if owning PID is alive
                let pidAlive = false;
                try {
                  const raw = readFileSync(lockFile, 'utf-8');
                  const data = JSON.parse(raw) as { pid?: number };
                  if (data.pid) {
                    try { process.kill(data.pid, 0); pidAlive = true; } catch { /* dead */ }
                  }
                } catch { /* unreadable = stale */ }
                if (!pidAlive) {
                  try { unlinkSync(lockFile); } catch { /* another reaper */ }
                  continue;
                }
              }
            } catch { /* stat failed = file gone */ }
          }
          return -1;
        }
        throw err;
      }
    }
    return -1;
  }

  /** Release a lock file and remove it */
  releaseLock(fd: number, taskId: string): void {
    if (fd < 0) return;
    try { closeSync(fd); } catch { /* already closed */ }
    try { unlinkSync(this.lockPath(taskId)); } catch { /* already removed */ }
  }

  listRuntimeFiles(): string[] {
    if (!existsSync(this.tasksDir)) return [];
    try {
      return readdirSync(this.tasksDir)
        .filter(f => f.endsWith('.state.json'))
        .map(f => f.replace('.state.json', ''));
    } catch {
      return [];
    }
  }
}

/** Get or create a state store for a team */
export function getStateStore(teamName: string): LocalFileStateStore {
  const dir = getStateDir(teamName);
  return new LocalFileStateStore(dir);
}

/**
 * Load task with runtime state merged over definition.
 * Runtime fields override definition fields.
 */
export function loadTaskWithState(
  definition: Record<string, unknown>,
  taskId: string,
  store: StateStore
): Record<string, unknown> {
  const runtime = store.loadRuntime(taskId);
  if (!runtime) {
    // Backward compat: extract runtime fields from definition
    const extracted: Record<string, unknown> = {};
    for (const key of RUNTIME_FIELDS) {
      if (key in definition) extracted[key] = definition[key];
    }
    return { ...definition, ...(Object.keys(extracted).length > 0 ? extracted : { status: 'pending' }) };
  }
  return { ...definition, ...runtime };
}

/**
 * Save only runtime fields, never touching definition file.
 */
export function saveTaskRuntime(
  taskId: string,
  updates: Record<string, unknown>,
  store: LocalFileStateStore
): void {
  const current = store.loadRuntime(taskId) || { status: 'pending' };
  const merged = { ...current, ...updates, updated_at: new Date().toISOString() };
  store.saveRuntime(taskId, merged);
}

/**
 * Strip runtime fields from a definition object.
 * Used when saving definition files that should be git-tracked.
 */
export function stripRuntimeFields(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!RUNTIME_FIELDS.has(key)) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Migrate runtime fields from definition files to state store.
 */
export function migrateRuntimeState(
  teamName: string,
  definitions: Array<{ taskId: string; data: Record<string, unknown> }>
): { migrated: string[]; skipped: string[] } {
  const store = getStateStore(teamName);
  const migrated: string[] = [];
  const skipped: string[] = [];

  for (const { taskId, data } of definitions) {
    // Skip if state file already exists
    if (store.loadRuntime(taskId) !== null) {
      skipped.push(taskId);
      continue;
    }

    // Extract runtime fields
    const runtime: Record<string, unknown> = {};
    for (const key of RUNTIME_FIELDS) {
      if (key in data) runtime[key] = data[key];
    }

    if (Object.keys(runtime).length === 0 || runtime.status === 'pending') {
      skipped.push(taskId);
      continue;
    }

    store.saveRuntime(taskId, runtime);
    migrated.push(taskId);
  }

  return { migrated, skipped };
}
