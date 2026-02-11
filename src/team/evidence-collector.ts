/**
 * Evidence Collector
 * Collects git, test, and review evidence for task completion records
 */

import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { TaskEvidence, TaskReviewVerdict } from './types.js';
import { updateTask } from './task-file-ops.js';
import { atomicWriteJson, ensureDirWithMode, validateResolvedPath } from './fs-utils.js';

/** Sanitize an ID for use as a filename (prevent path traversal) */
function sanitizeId(id: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) {
    throw new Error(`Invalid ID for file path: "${id}"`);
  }
  return id;
}

/**
 * Collect git evidence (commits between base and HEAD)
 */
export function collectGitEvidence(cwd: string, baseCommit?: string): { head: string; commits: string[] } {
  try {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf-8' }).trim();
    let commits: string[] = [];

    if (baseCommit) {
      // Validate baseCommit to prevent injection (alphanumeric, /, -, ., _)
      if (!/^[A-Za-z0-9._\/-]+$/.test(baseCommit) || baseCommit.includes('..')) {
        return { head, commits: [head] };
      }
      try {
        const log = execFileSync('git', ['log', '--oneline', `${baseCommit}..HEAD`], { cwd, encoding: 'utf-8' }).trim();
        commits = log ? log.split('\n') : [];
      } catch {
        commits = [head];
      }
    } else {
      commits = [head];
    }

    return { head, commits };
  } catch (e) {
    process.stderr.write(`[omc] DEBUG: collectGitEvidence failed: ${e}\n`);
    return { head: '', commits: [] };
  }
}

/**
 * Collect test evidence by running a test command
 */
export function collectTestEvidence(cwd: string, testCommand?: string): string[] {
  if (!testCommand) return [];

  try {
    // Split command into executable + args for safe execution
    const parts = testCommand.split(/\s+/);
    const output = execFileSync(parts[0], parts.slice(1), { cwd, encoding: 'utf-8', timeout: 120000 }).trim();
    // Extract test summary lines
    const summaryLines = output.split('\n').filter(
      (line: string) => /(?:pass|fail|test|suite|spec)/i.test(line)
    );
    return summaryLines.slice(-5);
  } catch (error) {
    const err = error as Error & { stdout?: string };
    const output = err.stdout || err.message;
    return [`Test run failed: ${output.substring(0, 200)}`];
  }
}

/**
 * Build a complete TaskEvidence object
 */
export function buildEvidence(
  cwd: string,
  baseCommit?: string,
  testCommand?: string,
  verdicts?: TaskReviewVerdict[],
  prs?: string[]
): TaskEvidence {
  const git = collectGitEvidence(cwd, baseCommit);
  const tests = collectTestEvidence(cwd, testCommand);

  return {
    commits: git.commits,
    tests,
    prs: prs || [],
    reviewVerdicts: verdicts || [],
    baseCommit,
    finalCommit: git.head || undefined,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * Record evidence on a task via updateTask
 */
export function recordEvidence(
  teamName: string,
  taskId: string,
  evidence: TaskEvidence
): void {
  updateTask(teamName, taskId, { evidence });
}

/** Checkpoint state for recovery after context compaction */
export interface Checkpoint {
  epicId: string;
  currentTaskId?: string;
  completedTasks: string[];
  baseCommit?: string;
  reviewState: Record<string, string>;
  savedAt: string;
}

/** Get checkpoint directory for a team */
function checkpointDir(teamName: string): string {
  return join(homedir(), '.claude', 'tasks', teamName, 'checkpoints');
}

/**
 * Save checkpoint for recovery after context compaction
 */
export function saveCheckpoint(teamName: string, checkpoint: Checkpoint): void {
  const dir = checkpointDir(teamName);
  ensureDirWithMode(dir);
  const safeId = sanitizeId(checkpoint.epicId);
  const filePath = join(dir, `${safeId}.json`);
  validateResolvedPath(filePath, dir);
  atomicWriteJson(filePath, checkpoint);
}

/**
 * Restore checkpoint for an epic
 */
export function restoreCheckpoint(teamName: string, epicId: string): Checkpoint | null {
  const safeId = sanitizeId(epicId);
  const filePath = join(checkpointDir(teamName), `${safeId}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Checkpoint;
  } catch (e) {
    process.stderr.write(`[omc] DEBUG: restoreCheckpoint parse failed for ${epicId}: ${e}\n`);
    return null;
  }
}
