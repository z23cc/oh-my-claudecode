import { describe, it, expect, beforeEach, vi } from 'vitest';
import { execSync, execFileSync } from 'child_process';
import {
  isRpAvailable,
  getWorkspace,
  invalidateWorkspace,
  resetRpCache,
} from '../rp-workspace.js';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);
const mockExecFileSync = vi.mocked(execFileSync);

describe('rp-workspace', () => {
  beforeEach(() => {
    resetRpCache();
    vi.clearAllMocks();
  });

  describe('isRpAvailable', () => {
    it('returns available: true when rp-cli is found', () => {
      mockExecSync
        .mockReturnValueOnce('/usr/local/bin/rp-cli')  // which
        .mockReturnValueOnce('1.2.3');                  // --version

      const result = isRpAvailable();
      expect(result).toEqual({
        available: true,
        path: '/usr/local/bin/rp-cli',
        version: '1.2.3',
      });
    });

    it('returns available: false when rp-cli is not found', () => {
      mockExecSync.mockImplementation(() => { throw new Error('not found'); });

      const result = isRpAvailable();
      expect(result).toEqual({ available: false });
    });

    it('caches result on second call', () => {
      mockExecSync.mockReturnValueOnce('/usr/local/bin/rp-cli');

      isRpAvailable();
      isRpAvailable();

      // which called once, version attempt once = 2 total, not 4
      expect(mockExecSync).toHaveBeenCalledTimes(2);
    });

    it('bypasses cache when useCache is false', () => {
      mockExecSync.mockReturnValue('/usr/local/bin/rp-cli');

      isRpAvailable();
      isRpAvailable(false);

      // 2 calls per invocation (which + version) = 4 total
      expect(mockExecSync).toHaveBeenCalledTimes(4);
    });
  });

  describe('getWorkspace', () => {
    it('returns null when rp-cli is unavailable', () => {
      mockExecSync.mockImplementation(() => { throw new Error('not found'); });

      const result = getWorkspace('/some/project');
      expect(result).toBeNull();
    });

    it('returns workspace when pickWindow finds an existing window', () => {
      // isRpAvailable -> which
      mockExecSync
        .mockReturnValueOnce('/usr/local/bin/rp-cli')  // which
        .mockReturnValueOnce('1.0.0')                   // version
        .mockReturnValueOnce(JSON.stringify([            // windows --json
          { id: 'win-1', name: 'test', path: '/some/project' },
        ]));

      const result = getWorkspace('/some/project');
      expect(result).not.toBeNull();
      expect(result!.windowId).toBe('win-1');
    });

    it('caches workspace by project root', () => {
      mockExecSync
        .mockReturnValueOnce('/usr/local/bin/rp-cli')  // which
        .mockReturnValueOnce('1.0.0')                   // version
        .mockReturnValueOnce(JSON.stringify([            // windows --json
          { id: 'win-1', name: 'test', path: '/some/project' },
        ]));

      const first = getWorkspace('/some/project');
      const second = getWorkspace('/some/project');

      expect(first).toBe(second); // same object reference
      // windows --json should only be called once
      expect(mockExecSync).toHaveBeenCalledTimes(3); // which + version + windows
    });

    it('creates a new window when no existing window matches', () => {
      mockExecSync
        .mockReturnValueOnce('/usr/local/bin/rp-cli')  // which
        .mockReturnValueOnce('1.0.0')                   // version
        .mockReturnValueOnce('[]');                      // windows --json (empty)

      mockExecFileSync.mockReturnValueOnce(JSON.stringify({ id: 'new-win' }));

      const result = getWorkspace('/some/project');
      expect(result).not.toBeNull();
      expect(result!.windowId).toBe('new-win');
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'rp-cli',
        ['create-window', '/some/project', '--json'],
        expect.any(Object),
      );
    });
  });

  describe('invalidateWorkspace', () => {
    it('clears only the specified project from cache', () => {
      // Setup: make rp-cli available
      mockExecSync.mockReturnValue('/usr/local/bin/rp-cli');

      // Pre-populate two workspaces via getWorkspace
      mockExecSync
        .mockReturnValueOnce('/usr/local/bin/rp-cli')
        .mockReturnValueOnce('1.0.0')
        .mockReturnValueOnce(JSON.stringify([{ id: 'a', name: 'a', path: '/project-a' }]));
      getWorkspace('/project-a');

      // Reset mock counts before second workspace
      vi.clearAllMocks();
      mockExecSync.mockReturnValueOnce(JSON.stringify([{ id: 'b', name: 'b', path: '/project-b' }]));
      const wsB = getWorkspace('/project-b');

      // Invalidate only project-a
      invalidateWorkspace('/project-a');

      // project-b should still be cached (same reference)
      vi.clearAllMocks();
      const wsB2 = getWorkspace('/project-b');
      expect(wsB2).toBe(wsB);
      // No new subprocess calls for project-b
      expect(mockExecSync).not.toHaveBeenCalled();
    });
  });

  describe('resetRpCache', () => {
    it('clears all caches', () => {
      mockExecSync.mockReturnValueOnce('/usr/local/bin/rp-cli').mockReturnValueOnce('1.0.0');
      isRpAvailable();

      resetRpCache();

      // After reset, isRpAvailable should call execSync again
      mockExecSync.mockImplementation(() => { throw new Error('gone'); });
      const result = isRpAvailable();
      expect(result.available).toBe(false);
    });
  });
});
