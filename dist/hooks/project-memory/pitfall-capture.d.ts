/**
 * Pitfall Capture
 * Structured learning from review rejections and discovered patterns
 */
import type { CustomNote } from './types.js';
/**
 * Capture a pitfall discovered during review or execution
 */
export declare function capturePitfall(projectRoot: string, content: string, sourceTask?: string, sourceVerdict?: string): Promise<void>;
/**
 * Capture a discovered convention
 */
export declare function captureConvention(projectRoot: string, content: string): Promise<void>;
/**
 * Capture an architecture decision
 */
export declare function captureDecision(projectRoot: string, content: string, rationale?: string): Promise<void>;
/**
 * Search custom notes by regex query
 */
export declare function searchMemory(projectRoot: string, query: string): Promise<CustomNote[]>;
/**
 * Get notes filtered by noteType
 */
export declare function getNotesByType(projectRoot: string, noteType: 'pitfall' | 'convention' | 'decision' | 'general'): Promise<CustomNote[]>;
//# sourceMappingURL=pitfall-capture.d.ts.map