/**
 * Epic Operations
 * Group tasks into epics for higher-level tracking and progress reporting
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { sanitizeName } from './tmux-session.js';
import { atomicWriteJson, validateResolvedPath, ensureDirWithMode } from './fs-utils.js';
import { listTaskIds, readTask } from './task-file-ops.js';
/** Get the epics directory for a team */
function epicsDir(teamName) {
    const base = join(homedir(), '.claude', 'tasks', sanitizeName(teamName), 'epics');
    validateResolvedPath(base, join(homedir(), '.claude', 'tasks'));
    return base;
}
/** Sanitize epic ID for safe file paths */
function sanitizeEpicId(epicId) {
    if (!/^[A-Za-z0-9._-]+$/.test(epicId)) {
        throw new Error(`Invalid epic ID: "${epicId}" contains unsafe characters`);
    }
    return epicId;
}
/** Get path to a specific epic file */
function epicPath(teamName, epicId) {
    return join(epicsDir(teamName), `${sanitizeEpicId(epicId)}.json`);
}
/**
 * Create a new epic
 */
export function createEpic(teamName, epicId, name, description) {
    const dir = epicsDir(teamName);
    ensureDirWithMode(dir);
    const epic = {
        id: epicId,
        name,
        description,
        createdAt: new Date().toISOString(),
        status: 'active',
    };
    atomicWriteJson(epicPath(teamName, epicId), epic);
    return epic;
}
/**
 * Read a single epic
 */
export function readEpic(teamName, epicId) {
    const filePath = epicPath(teamName, epicId);
    if (!existsSync(filePath))
        return null;
    try {
        const raw = readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/**
 * List all epics for a team
 */
export function listEpics(teamName) {
    const dir = epicsDir(teamName);
    if (!existsSync(dir))
        return [];
    try {
        const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
        const epics = [];
        for (const file of files) {
            try {
                const raw = readFileSync(join(dir, file), 'utf-8');
                epics.push(JSON.parse(raw));
            }
            catch {
                // Skip malformed epic files
            }
        }
        return epics;
    }
    catch {
        return [];
    }
}
/**
 * List all tasks belonging to a specific epic
 */
export function listEpicTasks(teamName, epicId) {
    const taskIds = listTaskIds(teamName);
    const matching = [];
    for (const id of taskIds) {
        const task = readTask(teamName, id);
        if (task && task.epicId === epicId) {
            matching.push(id);
        }
    }
    return matching;
}
/**
 * Get aggregated status for an epic
 */
export function getEpicStatus(teamName, epicId) {
    const epic = readEpic(teamName, epicId);
    if (!epic)
        return null;
    const taskIds = listEpicTasks(teamName, epicId);
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    for (const id of taskIds) {
        const task = readTask(teamName, id);
        if (!task)
            continue;
        switch (task.status) {
            case 'pending':
                pending++;
                break;
            case 'in_progress':
                inProgress++;
                break;
            case 'completed':
                completed++;
                break;
        }
    }
    const total = pending + inProgress + completed;
    return {
        epicId,
        epicName: epic.name,
        totalTasks: total,
        pending,
        inProgress,
        completed,
        percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
}
//# sourceMappingURL=epic-ops.js.map