/**
 * Custom Error Classes for oh-my-claudecode
 *
 * Structured errors with kind/exitCode/output for better error handling.
 */

/** Error kinds for categorized handling */
export type ErrorKind =
  | 'task_not_found'
  | 'epic_not_found'
  | 'invalid_state'
  | 'path_traversal'
  | 'sandbox_failure'
  | 'timeout'
  | 'review_failed'
  | 'lock_contention'
  | 'validation'
  | 'config'
  | 'unknown';

/**
 * Structured error with kind, exit code, and captured output.
 */
export class OmcError extends Error {
  readonly kind: ErrorKind;
  readonly exitCode: number;
  readonly output: string;

  constructor(message: string, kind: ErrorKind = 'unknown', exitCode: number = 1, output: string = '') {
    super(message);
    this.name = 'OmcError';
    this.kind = kind;
    this.exitCode = exitCode;
    this.output = output;
  }
}

/** Task-related errors */
export class TaskError extends OmcError {
  readonly taskId: string;

  constructor(message: string, taskId: string, kind: ErrorKind = 'task_not_found') {
    super(message, kind);
    this.name = 'TaskError';
    this.taskId = taskId;
  }
}

/** Sandbox failure detection */
export function isSandboxFailure(exitCode: number, output: string, stderr: string): boolean {
  if (exitCode === 0) return false;
  const patterns = [
    /permission denied/i,
    /sandbox blocked/i,
    /operation not permitted/i,
    /read-only file system/i,
  ];
  const combined = `${output}\n${stderr}`;
  return patterns.some(p => p.test(combined));
}

/** Timeout error */
export class TimeoutError extends OmcError {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message, 'timeout', 124);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}
