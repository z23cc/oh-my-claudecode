/**
 * Review Receipt Persistence
 * Stores and retrieves review gate receipts for task verification
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { atomicWriteJsonSync, ensureDirSync } from '../../lib/atomic-write.js';
/**
 * Sanitize a task ID for safe use in file paths
 */
function sanitizeForPath(value) {
    return value.replace(/[^A-Za-z0-9._-]/g, '_');
}
/**
 * Get the receipts directory for a project
 */
function receiptsDir(projectRoot) {
    return join(projectRoot, '.omc', 'receipts');
}
/**
 * Build the file path for a receipt
 */
function receiptPath(projectRoot, taskId, reviewType, attempt) {
    const safeTaskId = sanitizeForPath(taskId);
    const safeType = sanitizeForPath(reviewType);
    return join(receiptsDir(projectRoot), `${safeTaskId}-${safeType}-${attempt}.json`);
}
/**
 * Write a review receipt to disk
 */
export function writeReceipt(projectRoot, receipt) {
    const dir = receiptsDir(projectRoot);
    ensureDirSync(dir);
    const filePath = receiptPath(projectRoot, receipt.taskId, receipt.reviewType, receipt.attempt);
    atomicWriteJsonSync(filePath, receipt);
}
/**
 * Read all receipts for a given task
 */
export function readReceipts(projectRoot, taskId) {
    const dir = receiptsDir(projectRoot);
    if (!existsSync(dir))
        return [];
    const safeTaskId = sanitizeForPath(taskId);
    const prefix = `${safeTaskId}-`;
    try {
        const files = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.json'));
        const receipts = [];
        for (const file of files) {
            try {
                const raw = readFileSync(join(dir, file), 'utf-8');
                receipts.push(JSON.parse(raw));
            }
            catch {
                // Skip malformed receipts
            }
        }
        return receipts.sort((a, b) => a.attempt - b.attempt);
    }
    catch {
        return [];
    }
}
/**
 * Get the most recent receipt for a task and review type
 */
export function getLatestReceipt(projectRoot, taskId, reviewType) {
    const all = readReceipts(projectRoot, taskId);
    const matching = all.filter(r => r.reviewType === reviewType);
    return matching.length > 0 ? matching[matching.length - 1] : null;
}
/**
 * Check if a passing (SHIP) receipt exists for a task and review type
 */
export function hasPassingReceipt(projectRoot, taskId, reviewType) {
    const latest = getLatestReceipt(projectRoot, taskId, reviewType);
    return latest !== null && latest.verdict === 'SHIP';
}
//# sourceMappingURL=receipts.js.map