/**
 * Evidence Collector
 * Collects git, test, and review evidence for task completion records
 */
import { execSync } from 'child_process';
import { updateTask } from './task-file-ops.js';
/**
 * Collect git evidence (commits between base and HEAD)
 */
export function collectGitEvidence(cwd, baseCommit) {
    try {
        const head = execSync('git rev-parse HEAD', { cwd, encoding: 'utf-8' }).trim();
        let commits = [];
        if (baseCommit) {
            try {
                const log = execSync(`git log --oneline ${baseCommit}..HEAD`, { cwd, encoding: 'utf-8' }).trim();
                commits = log ? log.split('\n') : [];
            }
            catch {
                commits = [head];
            }
        }
        else {
            commits = [head];
        }
        return { head, commits };
    }
    catch {
        return { head: '', commits: [] };
    }
}
/**
 * Collect test evidence by running a test command
 */
export function collectTestEvidence(cwd, testCommand) {
    if (!testCommand)
        return [];
    try {
        const output = execSync(testCommand, { cwd, encoding: 'utf-8', timeout: 120000 }).trim();
        // Extract test summary lines
        const summaryLines = output.split('\n').filter((line) => /(?:pass|fail|test|suite|spec)/i.test(line));
        return summaryLines.slice(-5);
    }
    catch (error) {
        const err = error;
        const output = err.stdout || err.message;
        return [`Test run failed: ${output.substring(0, 200)}`];
    }
}
/**
 * Build a complete TaskEvidence object
 */
export function buildEvidence(cwd, baseCommit, testCommand, verdicts, prs) {
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
export function recordEvidence(teamName, taskId, evidence) {
    updateTask(teamName, taskId, { evidence });
}
//# sourceMappingURL=evidence-collector.js.map