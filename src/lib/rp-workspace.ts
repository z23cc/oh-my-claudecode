/**
 * RepoPrompt Workspace Manager
 *
 * Shared utility for rp-cli availability detection and workspace lifecycle.
 * Extracted from team/rp-integration.ts to allow reuse across review and
 * exploration subsystems without duplicating subprocess + caching logic.
 *
 * Follows the session-level caching pattern from mcp/cli-detection.ts.
 */

import { execSync, execFileSync } from 'child_process';
import { resolve } from 'path';

/** rp-cli availability result */
export interface RpAvailability {
  available: boolean;
  path?: string;
  version?: string;
}

/** A cached rp-cli workspace handle */
export interface RpWorkspace {
  windowId: string;
  repoRoot: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Module-level caches (pattern from src/mcp/cli-detection.ts)
// ---------------------------------------------------------------------------

let availabilityCache: RpAvailability | null = null;
const workspaceCache = new Map<string, RpWorkspace>();

// ---------------------------------------------------------------------------
// Internal helpers (moved from rp-integration.ts)
// ---------------------------------------------------------------------------

/** Normalize tmp paths for macOS (/tmp vs /private/tmp) */
function normalizeTmpPath(p: string): string {
  if (p.startsWith('/private/tmp/')) return p.replace('/private/tmp/', '/tmp/');
  return p;
}

/** List available RepoPrompt windows */
function listWindows(): Array<{ id: string; name: string; path: string }> {
  try {
    const output = execSync('rp-cli windows --json', {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const windows = JSON.parse(output);
    return (windows || []).map((w: Record<string, unknown>) => ({
      id: String(w.id || ''),
      name: String(w.name || ''),
      path: normalizeTmpPath(String(w.path || '')),
    }));
  } catch {
    return [];
  }
}

/** Pick the best window for a given repo root */
function pickWindow(repoRoot: string): string | null {
  const windows = listWindows();
  const normalized = normalizeTmpPath(resolve(repoRoot));

  // Exact match first
  const exact = windows.find(w => normalizeTmpPath(resolve(w.path)) === normalized);
  if (exact) return exact.id;

  // Prefix match (repo is under a window's path)
  const prefix = windows.find(w => normalized.startsWith(normalizeTmpPath(resolve(w.path))));
  if (prefix) return prefix.id;

  return null;
}

/** Create a new rp-cli window for the given repo */
function createWindow(repoRoot: string): string | null {
  try {
    const output = execFileSync('rp-cli', ['create-window', repoRoot, '--json'], {
      encoding: 'utf-8',
      timeout: 30000,
    });
    const result = JSON.parse(output);
    return result.id || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if rp-cli is available on the system PATH.
 * Result is cached at module level; pass `useCache = false` to force re-check.
 */
export function isRpAvailable(useCache = true): RpAvailability {
  if (useCache && availabilityCache) return availabilityCache;

  try {
    const command = process.platform === 'win32' ? 'where rp-cli' : 'which rp-cli';
    const path = execSync(command, { encoding: 'utf-8', timeout: 3000 }).trim();

    let version: string | undefined;
    try {
      version = execSync('rp-cli --version', { encoding: 'utf-8', timeout: 3000 }).trim();
    } catch {
      // Version check is optional
    }

    const result: RpAvailability = { available: true, path, version };
    availabilityCache = result;
    return result;
  } catch {
    const result: RpAvailability = { available: false };
    availabilityCache = result;
    return result;
  }
}

/**
 * Get (or lazily create) a workspace for the given repo root.
 * Returns null when rp-cli is not available or workspace creation fails.
 *
 * Lifecycle: cache check -> pickWindow (existing) -> createWindow -> cache.
 */
export function getWorkspace(repoRoot: string): RpWorkspace | null {
  const key = resolve(repoRoot);

  // 1. Check cache
  const cached = workspaceCache.get(key);
  if (cached) return cached;

  // 2. Verify rp-cli is available
  if (!isRpAvailable().available) return null;

  // 3. Try existing window, then create
  const windowId = pickWindow(repoRoot) ?? createWindow(repoRoot);
  if (!windowId) return null;

  const workspace: RpWorkspace = {
    windowId,
    repoRoot: key,
    createdAt: Date.now(),
  };
  workspaceCache.set(key, workspace);
  return workspace;
}

/**
 * Invalidate the cached workspace for a specific project root.
 */
export function invalidateWorkspace(repoRoot: string): void {
  workspaceCache.delete(resolve(repoRoot));
}

/**
 * Reset all caches (useful for testing).
 */
export function resetRpCache(): void {
  availabilityCache = null;
  workspaceCache.clear();
}
