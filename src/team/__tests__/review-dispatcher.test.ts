import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock review-backend before importing dispatcher
vi.mock('../review-backend.js', () => ({
  resolveReviewBackend: vi.fn(),
  getChangedFiles: vi.fn(() => ['src/foo.ts']),
  getDiffContent: vi.fn(() => 'diff content'),
  getDiffSummary: vi.fn(() => '1 file changed'),
  embedFileContents: vi.fn(() => ({ content: 'embedded', stats: { embedded: 1, skipped: [], truncated: [], bytes: 100 } })),
  gatherContextHints: vi.fn(() => ''),
  buildReviewPrompt: vi.fn(() => 'review prompt'),
  executeRpReview: vi.fn(),
  writeReceipt: vi.fn(() => '/receipts/test.json'),
}));

import { dispatchReview } from '../review-dispatcher.js';
import {
  resolveReviewBackend,
  getChangedFiles,
  executeRpReview,
  writeReceipt,
} from '../review-backend.js';

const mockResolve = vi.mocked(resolveReviewBackend);
const mockGetChanged = vi.mocked(getChangedFiles);
const mockExecuteRp = vi.mocked(executeRpReview);
const mockWriteReceipt = vi.mocked(writeReceipt);

const baseOpts = {
  projectRoot: '/test/project',
  baseBranch: 'main',
  reviewType: 'impl' as const,
};

describe('dispatchReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChanged.mockReturnValue(['src/foo.ts']);
    mockWriteReceipt.mockReturnValue('/receipts/test.json');
  });

  it('returns null when backend resolves to ASK', () => {
    mockResolve.mockReturnValue('ASK');
    expect(dispatchReview(baseOpts)).toBeNull();
  });

  it('returns auto-SHIP when backend is none', () => {
    mockResolve.mockReturnValue({ backend: 'none' });
    const result = dispatchReview(baseOpts);
    expect(result).toEqual({
      verdict: 'SHIP',
      review: 'Review skipped (backend: none)',
      backend: 'none',
    });
  });

  it('returns null when backend is codex', () => {
    mockResolve.mockReturnValue({ backend: 'codex' });
    expect(dispatchReview(baseOpts)).toBeNull();
  });

  it('calls executeRpReview when backend is rp', () => {
    mockResolve.mockReturnValue({ backend: 'rp' });
    mockExecuteRp.mockReturnValue({ verdict: 'SHIP', review: 'All good' });

    const result = dispatchReview(baseOpts);
    expect(result).toEqual({
      verdict: 'SHIP',
      review: 'All good',
      backend: 'rp',
      receiptPath: '/receipts/test.json',
    });
    expect(mockExecuteRp).toHaveBeenCalledOnce();
  });

  it('writes receipt on successful rp review', () => {
    mockResolve.mockReturnValue({ backend: 'rp' });
    mockExecuteRp.mockReturnValue({ verdict: 'NEEDS_WORK', review: 'Issues found' });

    dispatchReview({ ...baseOpts, taskId: 'task-1' });
    expect(mockWriteReceipt).toHaveBeenCalledOnce();
    const receipt = mockWriteReceipt.mock.calls[0][1];
    expect(receipt.mode).toBe('rp');
    expect(receipt.taskId).toBe('task-1');
    expect(receipt.type).toBe('impl_review');
  });

  it('returns null when rp-cli unavailable (graceful fallback)', () => {
    mockResolve.mockReturnValue({ backend: 'rp' });
    mockExecuteRp.mockReturnValue(null);

    expect(dispatchReview(baseOpts)).toBeNull();
  });

  it('returns SHIP when no changed files', () => {
    mockResolve.mockReturnValue({ backend: 'rp' });
    mockGetChanged.mockReturnValue([]);

    const result = dispatchReview(baseOpts);
    expect(result).toEqual({
      verdict: 'SHIP',
      review: 'No changed files to review',
      backend: 'rp',
    });
    expect(mockExecuteRp).not.toHaveBeenCalled();
  });

  it('maps security reviewType to security_review receipt type', () => {
    mockResolve.mockReturnValue({ backend: 'rp' });
    mockExecuteRp.mockReturnValue({ verdict: 'SHIP', review: 'Secure' });

    dispatchReview({ ...baseOpts, reviewType: 'security' });
    const receipt = mockWriteReceipt.mock.calls[0][1];
    expect(receipt.type).toBe('security_review');
  });
});
