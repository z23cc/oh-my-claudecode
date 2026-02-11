// src/team/fs-utils.ts

/**
 * Shared filesystem utilities with permission hardening.
 *
 * All file writes default to 0o600 (owner-only read/write).
 * All directory creates default to 0o700 (owner-only access).
 * Atomic writes use PID+timestamp temp files to prevent collisions.
 */

import { writeFileSync, existsSync, mkdirSync, renameSync, openSync, writeSync, closeSync, readSync, readFileSync, realpathSync, constants } from 'fs';
import { dirname, resolve, relative, basename } from 'path';

/** Atomic write: write JSON to temp file with permissions, then rename (prevents corruption on crash) */
export function atomicWriteJson(filePath: string, data: unknown, mode: number = 0o600): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf-8', mode });
  renameSync(tmpPath, filePath);
}

/** Write file with explicit permission mode */
export function writeFileWithMode(filePath: string, data: string, mode: number = 0o600): void {
  writeFileSync(filePath, data, { encoding: 'utf-8', mode });
}

/** Append to file with explicit permission mode. Creates with mode if file doesn't exist.
 *  Uses O_WRONLY|O_APPEND|O_CREAT to atomically create-or-append in a single syscall,
 *  avoiding TOCTOU race between existence check and write. */
export function appendFileWithMode(filePath: string, data: string, mode: number = 0o600): void {
  // Ensure parent directory exists
  const dir = dirname(filePath);
  ensureDirWithMode(dir);
  const fd = openSync(filePath, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT, mode);
  try {
    writeSync(fd, data, null, 'utf-8');
  } finally {
    closeSync(fd);
  }
}

/** Create directory with explicit permission mode (atomic, no TOCTOU) */
export function ensureDirWithMode(dirPath: string, mode: number = 0o700): void {
  try {
    mkdirSync(dirPath, { recursive: true, mode });
  } catch (err: unknown) {
    // EEXIST is expected if another process created it first
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code !== 'EEXIST') throw err;
  }
}

/**
 * Slugify a string for use as a safe file/ID component.
 * Unicode-aware: normalizes to ASCII, replaces non-alphanum with hyphens.
 */
export function slugify(input: string, maxLength: number = 60): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')    // Non-alphanum to hyphens
    .replace(/^-+|-+$/g, '')        // Trim leading/trailing hyphens
    .slice(0, maxLength)
    .replace(/-+$/, '');             // Trim trailing hyphen after slice
}

/**
 * Parse a slug-based ID like "fn-1-add-oauth" or "fn-1-add-oauth.2".
 * Returns { prefix, epicNum, slug, taskNum } or null if not parseable.
 */
export function parseSlugId(id: string): {
  prefix: string; epicNum: number; slug: string; taskNum?: number;
} | null {
  // Task ID: fn-1-slug.2 or fn-1.2
  const taskMatch = id.match(/^([a-z]+)-(\d+)(?:-([a-z0-9-]+))?\.(\d+)$/);
  if (taskMatch) {
    return {
      prefix: taskMatch[1],
      epicNum: parseInt(taskMatch[2], 10),
      slug: taskMatch[3] || '',
      taskNum: parseInt(taskMatch[4], 10),
    };
  }

  // Epic ID: fn-1-slug or fn-1
  const epicMatch = id.match(/^([a-z]+)-(\d+)(?:-([a-z0-9-]+))?$/);
  if (epicMatch) {
    return {
      prefix: epicMatch[1],
      epicNum: parseInt(epicMatch[2], 10),
      slug: epicMatch[3] || '',
    };
  }

  return null;
}

/**
 * Read content from a file path or stdin (if path is "-").
 * Useful for heredoc patterns and piped input.
 */
export function readFileOrStdin(filePath: string): string {
  if (filePath === '-') {
    // Read from stdin synchronously
    const chunks: Buffer[] = [];
    const BUFSIZE = 1024;
    const buf = Buffer.alloc(BUFSIZE);
    let bytesRead: number;
    const fd = 0; // stdin
    try {
      while (true) {
        bytesRead = readSync(fd, buf, 0, BUFSIZE, null);
        if (bytesRead === 0) break;
        chunks.push(Buffer.from(buf.subarray(0, bytesRead)));
      }
    } catch { /* EOF or error */ }
    return Buffer.concat(chunks).toString('utf-8');
  }
  return readFileSync(filePath, 'utf-8');
}

/** Resolve a path through symlinks where possible, falling back to resolve for non-existent paths.
 *  Walks up the directory tree to find the deepest existing ancestor, resolves its symlinks,
 *  then appends the remaining non-existent path segments. This handles macOS symlinks like
 *  /var → /private/var, /tmp → /private/tmp, /home → /System/Volumes/Data/home. */
function safeRealpath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    // Walk up until we find an existing directory
    const abs = resolve(p);
    let current = abs;
    const parts: string[] = [];
    while (current !== dirname(current)) {
      try {
        const real = realpathSync(current);
        return parts.length > 0 ? resolve(real, ...parts) : real;
      } catch {
        parts.unshift(basename(current));
        current = dirname(current);
      }
    }
    // Nothing resolved (shouldn't happen in practice — root always exists)
    return abs;
  }
}

/** Validate that a resolved path is under the expected base directory. Throws if not.
 *  Uses realpathSync to resolve symlinks, preventing symlink-based escapes. */
export function validateResolvedPath(resolvedPath: string, expectedBase: string): void {
  const absResolved = safeRealpath(resolvedPath);
  const absBase = safeRealpath(expectedBase);
  const rel = relative(absBase, absResolved);
  if (rel.startsWith('..') || resolve(absBase, rel) !== absResolved) {
    throw new Error(`Path traversal detected: "${resolvedPath}" escapes base "${expectedBase}"`);
  }
}
