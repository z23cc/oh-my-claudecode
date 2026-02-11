/**
 * Review Receipt Persistence
 * Stores and retrieves review gate receipts for task verification
 */
import type { ReviewReceipt } from './types.js';
/**
 * Write a review receipt to disk
 */
export declare function writeReceipt(projectRoot: string, receipt: ReviewReceipt): void;
/**
 * Read all receipts for a given task
 */
export declare function readReceipts(projectRoot: string, taskId: string): ReviewReceipt[];
/**
 * Get the most recent receipt for a task and review type
 */
export declare function getLatestReceipt(projectRoot: string, taskId: string, reviewType: ReviewReceipt['reviewType']): ReviewReceipt | null;
/**
 * Check if a passing (SHIP) receipt exists for a task and review type
 */
export declare function hasPassingReceipt(projectRoot: string, taskId: string, reviewType: ReviewReceipt['reviewType']): boolean;
//# sourceMappingURL=receipts.d.ts.map