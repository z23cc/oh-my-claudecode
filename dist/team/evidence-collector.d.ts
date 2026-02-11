/**
 * Evidence Collector
 * Collects git, test, and review evidence for task completion records
 */
import type { TaskEvidence, TaskReviewVerdict } from './types.js';
/**
 * Collect git evidence (commits between base and HEAD)
 */
export declare function collectGitEvidence(cwd: string, baseCommit?: string): {
    head: string;
    commits: string[];
};
/**
 * Collect test evidence by running a test command
 */
export declare function collectTestEvidence(cwd: string, testCommand?: string): string[];
/**
 * Build a complete TaskEvidence object
 */
export declare function buildEvidence(cwd: string, baseCommit?: string, testCommand?: string, verdicts?: TaskReviewVerdict[], prs?: string[]): TaskEvidence;
/**
 * Record evidence on a task via updateTask
 */
export declare function recordEvidence(teamName: string, taskId: string, evidence: TaskEvidence): void;
//# sourceMappingURL=evidence-collector.d.ts.map