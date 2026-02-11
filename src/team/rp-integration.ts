/**
 * RepoPrompt (rp-cli) Integration Utilities
 *
 * Provides helper functions for interacting with RepoPrompt CLI
 * for token-efficient codebase exploration and review context building.
 *
 * Workspace lifecycle (availability, window management, caching) is
 * handled by ../lib/rp-workspace.ts. This file contains the
 * operation-level commands (structure, search, review, etc.).
 */

import { execSync, execFileSync } from 'child_process';
import { getWorkspace } from '../lib/rp-workspace.js';

// Re-export for backward compatibility
export { isRpAvailable } from '../lib/rp-workspace.js';

/** Get code structure (function/type signatures) for a file */
export function getStructure(windowId: string, filePath: string): string {
  try {
    return execFileSync('rp-cli', ['-w', windowId, 'structure', filePath], {
      encoding: 'utf-8', timeout: 10000,
    }).trim();
  } catch {
    return '';
  }
}

/** Read a specific section of a file */
export function readSection(windowId: string, filePath: string, startLine: number, limit: number): string {
  try {
    return execFileSync('rp-cli', [
      '-w', windowId, 'read', filePath,
      '--start-line', String(startLine), '--limit', String(limit),
    ], { encoding: 'utf-8', timeout: 10000 }).trim();
  } catch {
    return '';
  }
}

/** Search for a pattern across the workspace */
export function searchWorkspace(windowId: string, pattern: string, maxResults: number = 20): string {
  try {
    return execFileSync('rp-cli', [
      '-w', windowId, 'search', pattern,
      '--max-results', String(maxResults),
    ], { encoding: 'utf-8', timeout: 15000 }).trim();
  } catch {
    return '';
  }
}

/** Run the AI-powered context builder */
export function runBuilder(windowId: string, tabId?: string, timeout: number = 300000): string {
  try {
    const args = ['-w', windowId];
    if (tabId) args.push('-t', tabId);
    args.push('builder');
    return execFileSync('rp-cli', args, { encoding: 'utf-8', timeout }).trim();
  } catch {
    return '';
  }
}

/** Get current file selection */
export function getSelection(windowId: string): string[] {
  try {
    const output = execFileSync('rp-cli', ['-w', windowId, 'select-get', '--json'], {
      encoding: 'utf-8', timeout: 5000,
    });
    return JSON.parse(output) || [];
  } catch {
    return [];
  }
}

/** Add files to the selection */
export function addToSelection(windowId: string, files: string[]): void {
  for (const file of files) {
    try {
      execFileSync('rp-cli', ['-w', windowId, 'select-add', file], {
        encoding: 'utf-8', timeout: 5000,
      });
    } catch (e) { process.stderr.write(`[omc] DEBUG: rp-cli select-add failed for ${file}: ${e}\n`); }
  }
}

/** Get the current prompt */
export function getPrompt(windowId: string): string {
  try {
    return execFileSync('rp-cli', ['-w', windowId, 'prompt-get'], {
      encoding: 'utf-8', timeout: 5000,
    }).trim();
  } catch {
    return '';
  }
}

/** Set the prompt */
export function setPrompt(windowId: string, prompt: string): void {
  try {
    execSync(`rp-cli -w "${windowId}" prompt-set`, {
      input: prompt, encoding: 'utf-8', timeout: 5000,
    });
  } catch (e) { process.stderr.write(`[omc] DEBUG: rp-cli prompt-set failed: ${e}\n`); }
}

/** Send a chat message for review */
export function sendChat(windowId: string): string {
  try {
    return execFileSync('rp-cli', ['-w', windowId, 'chat-send'], {
      encoding: 'utf-8', timeout: 120000,
    }).trim();
  } catch {
    return '';
  }
}

/** Export the current prompt + context */
export function exportPrompt(windowId: string): string {
  try {
    return execFileSync('rp-cli', ['-w', windowId, 'prompt-export'], {
      encoding: 'utf-8', timeout: 10000,
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Setup a complete review workflow:
 * 1. Ensure workspace (via cached workspace manager)
 * 2. Run builder for context
 * 3. Add changed files to selection
 * 4. Set review prompt
 * 5. Send chat
 */
export function setupReview(
  repoRoot: string,
  changedFiles: string[],
  reviewPrompt: string
): { windowId: string; response: string } | null {
  const ws = getWorkspace(repoRoot);
  if (!ws) return null;

  const { windowId } = ws;

  // Run builder for context
  runBuilder(windowId);

  // Add changed files
  addToSelection(windowId, changedFiles);

  // Set prompt and send
  setPrompt(windowId, reviewPrompt);
  const response = sendChat(windowId);

  return { windowId, response };
}
