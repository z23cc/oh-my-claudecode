---
name: deps
description: Show epic dependency graph and execution order
---

# Epic Dependency Graph

Show the dependency graph, execution phases, and critical path for epics.

## Trigger

`/oh-my-claudecode:deps [team-name]`

## Steps

1. Read all epics from `~/.claude/tasks/{team}/epics/`
2. Build the dependency graph (which epics block which)
3. Compute parallel execution phases via topological sort
4. Identify the critical path (longest dependency chain)
5. Display formatted markdown table

## Output Format

### Status Overview

| Epic | Title | Status | Dependencies | Blocked By |
|------|-------|--------|--------------|------------|
| E-1 | Auth | **READY** | - | - |
| E-2 | API | BLOCKED | E-1 | E-1 |

### Execution Phases

| Phase | Epics | Can Start |
|-------|-------|-----------|
| **1** | E-1, E-3 | **NOW** |
| **2** | E-2 | After Phase 1 |

### Critical Path

E-1 -> E-2 -> E-4 (3 phases)

## Implementation

Uses `formatDependencyGraph()` from `src/team/epic-ops.ts` which calls:
- `buildEpicDependencyGraph()` — blocking chain analysis
- `computeExecutionPhases()` — topological sort for parallel phases
- `findCriticalPath()` — longest dependency chain
