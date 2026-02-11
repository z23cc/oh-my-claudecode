/**
 * Review Dispatcher
 *
 * Central dispatch function that resolves the configured review backend
 * and runs the review. Bridges resolveReviewBackend() to actual execution.
 */

import {
  resolveReviewBackend,
  getChangedFiles,
  getDiffContent,
  getDiffSummary,
  embedFileContents,
  gatherContextHints,
  buildReviewPrompt,
  executeRpReview,
  writeReceipt,
  type ReviewVerdict,
  type ReviewBackendType,
  type ReviewReceipt,
} from './review-backend.js';

export interface ReviewResult {
  verdict: ReviewVerdict | null;
  review: string;
  backend: ReviewBackendType;
  receiptPath?: string;
}

/**
 * Run a review using the configured backend.
 * Returns null when backend requires agent-driven flow (codex, ASK).
 */
export function dispatchReview(opts: {
  projectRoot: string;
  baseBranch: string;
  reviewType: 'impl' | 'plan' | 'security' | 'completion';
  specContent?: string;
  taskBackend?: string;
  epicBackend?: string;
  taskId?: string;
  epicId?: string;
}): ReviewResult | null {
  const resolved = resolveReviewBackend(opts.projectRoot, opts.taskBackend, opts.epicBackend);

  // ASK — needs user prompt, fall back to agent-driven
  if (resolved === 'ASK') return null;

  const { backend } = resolved;

  // none — auto-approve
  if (backend === 'none') {
    return { verdict: 'SHIP', review: 'Review skipped (backend: none)', backend: 'none' };
  }

  // codex — MCP-tool-driven by agent prompts, not programmatic
  if (backend === 'codex') return null;

  // rp — programmatic review via RepoPrompt CLI
  const changedFiles = getChangedFiles(opts.projectRoot, opts.baseBranch);
  if (changedFiles.length === 0) {
    return { verdict: 'SHIP', review: 'No changed files to review', backend: 'rp' };
  }

  const diffContent = getDiffContent(opts.projectRoot, opts.baseBranch);
  const diffSummary = getDiffSummary(opts.projectRoot, opts.baseBranch);
  const contextHints = gatherContextHints(opts.projectRoot, opts.baseBranch);
  const { content: embeddedFiles } = embedFileContents(opts.projectRoot, changedFiles);

  const prompt = buildReviewPrompt({
    reviewType: opts.reviewType,
    specContent: opts.specContent,
    contextHints,
    diffSummary,
    diffContent,
    embeddedFiles,
  });

  const rpResult = executeRpReview(opts.projectRoot, changedFiles, prompt);
  if (!rpResult) return null; // rp-cli unavailable — graceful fallback

  const receiptType = opts.reviewType === 'security'
    ? 'security_review'
    : opts.reviewType === 'plan'
      ? 'plan_review'
      : opts.reviewType === 'completion'
        ? 'completion_review'
        : 'impl_review';

  const receipt: ReviewReceipt = {
    type: receiptType,
    id: `${receiptType}-${Date.now()}`,
    mode: 'rp',
    base: opts.baseBranch,
    verdict: rpResult.verdict,
    timestamp: new Date().toISOString(),
    review: rpResult.review,
    taskId: opts.taskId,
    epicId: opts.epicId,
  };

  const receiptPath = writeReceipt(opts.projectRoot, receipt);

  return {
    verdict: rpResult.verdict,
    review: rpResult.review,
    backend: 'rp',
    receiptPath,
  };
}
