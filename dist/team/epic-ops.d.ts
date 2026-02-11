/**
 * Epic Operations
 * Group tasks into epics for higher-level tracking and progress reporting
 */
/** Epic file stored at ~/.claude/tasks/{team}/epics/{epicId}.json */
export interface EpicFile {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    status: 'active' | 'completed' | 'archived';
}
/** Aggregated status for an epic */
export interface EpicStatus {
    epicId: string;
    epicName: string;
    totalTasks: number;
    pending: number;
    inProgress: number;
    completed: number;
    percentComplete: number;
}
/**
 * Create a new epic
 */
export declare function createEpic(teamName: string, epicId: string, name: string, description: string): EpicFile;
/**
 * Read a single epic
 */
export declare function readEpic(teamName: string, epicId: string): EpicFile | null;
/**
 * List all epics for a team
 */
export declare function listEpics(teamName: string): EpicFile[];
/**
 * List all tasks belonging to a specific epic
 */
export declare function listEpicTasks(teamName: string, epicId: string): string[];
/**
 * Get aggregated status for an epic
 */
export declare function getEpicStatus(teamName: string, epicId: string): EpicStatus | null;
//# sourceMappingURL=epic-ops.d.ts.map