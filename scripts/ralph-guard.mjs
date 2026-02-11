#!/usr/bin/env node

/**
 * PostToolUse Hook: Ralph Guard
 *
 * Enforces review discipline during ralph mode:
 * 1. Detects when ralph mode is active
 * 2. After a review verdict (SHIP/NEEDS_WORK/MAJOR_RETHINK), reminds to write receipt
 * 3. Tracks review state across tool calls within a session
 * 4. Warns if completion is claimed without passing reviews
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { readStdin } from './lib/stdin.mjs';

/** Atomic write: temp file + rename to prevent corruption */
function atomicWrite(filePath, data) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}`;
  writeFileSync(tmp, data, { mode: 0o600 });
  renameSync(tmp, filePath);
}

const GUARD_VERSION = '1.0.0';

/**
 * Get ralph guard state file path
 */
function getStatePath(directory, sessionId) {
  const stateDir = join(directory, '.omc', 'state');
  if (!existsSync(stateDir)) {
    try {
      mkdirSync(stateDir, { recursive: true });
    } catch { /* ignore */ }
  }
  const safeSession = (sessionId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(stateDir, `ralph-guard-${safeSession}.json`);
}

/**
 * Load guard state
 */
function loadState(directory, sessionId) {
  const path = getStatePath(directory, sessionId);
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {
    version: GUARD_VERSION,
    lastVerdict: null,
    verdictWritten: false,
    codeReviewPassed: false,
    securityReviewPassed: false,
    completionClaimed: false,
  };
}

/**
 * Save guard state
 */
function saveState(directory, sessionId, state) {
  const path = getStatePath(directory, sessionId);
  try {
    atomicWrite(path, JSON.stringify(state, null, 2));
  } catch { /* ignore */ }
}

/**
 * Check if ralph mode is active
 */
function isRalphActive(directory) {
  const ralphPaths = [
    join(directory, '.omc', 'ralph-verification.json'),
    join(directory, '.omc', 'state', 'ralph-mode.json'),
  ];
  return ralphPaths.some(p => existsSync(p));
}

/**
 * Detect review verdicts in tool output
 */
function detectVerdict(output) {
  if (!output || typeof output !== 'string') return null;

  // Look for structured verdict patterns
  if (/\bverdict[:\s]*SHIP\b/i.test(output) || /\b##\s*Verdict\s*\n\s*SHIP\b/i.test(output)) {
    return 'SHIP';
  }
  if (/\bverdict[:\s]*NEEDS_WORK\b/i.test(output) || /\bNEEDS_WORK\b/.test(output)) {
    return 'NEEDS_WORK';
  }
  if (/\bverdict[:\s]*MAJOR_RETHINK\b/i.test(output) || /\bMAJOR_RETHINK\b/.test(output)) {
    return 'MAJOR_RETHINK';
  }
  return null;
}

/**
 * Detect review type from output context
 */
function detectReviewType(output) {
  if (!output) return null;
  if (/security.review/i.test(output) || /OWASP/i.test(output)) return 'security';
  if (/code.review/i.test(output) || /spec.compliance/i.test(output)) return 'code';
  return null;
}

/**
 * Detect completion claim
 */
function detectCompletionClaim(output) {
  if (!output) return false;
  return /architect-approved.*VERIFIED_COMPLETE/is.test(output) ||
         /task.*(complete|done|finished)/i.test(output);
}

/**
 * Validate receipt JSON has required fields
 */
function validateReceipt(content) {
  try {
    const receipt = JSON.parse(content);
    if (!receipt.taskId) return 'Receipt missing required "taskId" field';
    if (!receipt.reviewType) return 'Receipt missing required "reviewType" field';
    if (!receipt.verdict) return 'Receipt missing required "verdict" field';
    return null; // valid
  } catch {
    return 'Receipt is not valid JSON';
  }
}

/**
 * Check for informal approvals without proper verdict tags
 */
function detectInformalApproval(output) {
  if (!output) return false;
  return /\bLGTM\b/i.test(output) ||
         /\blooks good to me\b/i.test(output) ||
         /\bapproved\b/i.test(output);
}

async function main() {
  try {
    const input = await readStdin();
    const data = JSON.parse(input);

    const directory = data.cwd || data.directory || process.cwd();
    const sessionId = data.session_id || data.sessionId || '';
    const toolOutput = data.tool_output || data.toolOutput || '';
    const toolName = data.tool_name || data.toolName || '';

    // Only activate during ralph mode
    if (!isRalphActive(directory)) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const state = loadState(directory, sessionId);
    let message = null;

    // Check for review verdicts in Task (subagent) output
    if (toolName === 'Task' || toolName === 'TaskOutput') {
      const verdict = detectVerdict(toolOutput);
      if (verdict) {
        const reviewType = detectReviewType(toolOutput);
        state.lastVerdict = verdict;
        state.verdictWritten = false;

        if (verdict === 'SHIP') {
          if (reviewType === 'code') state.codeReviewPassed = true;
          if (reviewType === 'security') state.securityReviewPassed = true;
          message = `[Ralph Guard] ${reviewType || 'Review'} verdict: SHIP. Write a receipt to .omc/receipts/ to record this passing review.`;
        } else {
          message = `[Ralph Guard] Review verdict: ${verdict}. Fix the identified issues before re-submitting for review.`;
        }
      }

      // Warn about informal approvals without structured verdict tags
      if (!verdict && detectInformalApproval(toolOutput)) {
        message = `[Ralph Guard] WARNING: Informal approval detected (LGTM/approved) without structured verdict tag. Use SHIP/NEEDS_WORK/MAJOR_RETHINK for proper tracking.`;
      }
    }

    // Validate receipt format when writing to .omc/receipts/
    if (toolName === 'Write') {
      const filePath = data.tool_input?.file_path || data.toolInput?.file_path || '';
      if (filePath.includes('.omc/receipts/') && filePath.endsWith('.json')) {
        const content = data.tool_input?.content || data.toolInput?.content || '';
        const error = validateReceipt(content);
        if (error) {
          message = `[Ralph Guard] Receipt validation failed: ${error}. Receipts must be JSON with taskId, reviewType, and verdict fields.`;
        } else {
          state.verdictWritten = true;
        }
      }
    }

    // Check for premature completion claims
    if (detectCompletionClaim(toolOutput)) {
      state.completionClaimed = true;
      if (!state.codeReviewPassed || !state.securityReviewPassed) {
        const missing = [];
        if (!state.codeReviewPassed) missing.push('code review');
        if (!state.securityReviewPassed) missing.push('security review');
        message = `[Ralph Guard] WARNING: Completion claimed but ${missing.join(' and ')} not yet passed. Run missing reviews before completing.`;
      }
    }

    saveState(directory, sessionId, state);

    if (message) {
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: message,
        },
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch {
    // Never block tool execution
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
