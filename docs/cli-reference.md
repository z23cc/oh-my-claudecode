# oh-my-claudecode CLI Reference

## Scripts

### Task Management

| Script | Purpose | Usage |
|--------|---------|-------|
| `task-dashboard.py` | Real-time task status TUI | `python3 scripts/task-dashboard.py [team] [--watch] [--json]` |
| `memory-cli.mjs` | Project memory CRUD | `node scripts/memory-cli.mjs <init\|add\|list\|search\|read\|stats>` |

### Validation & Quality

| Script | Purpose | Usage |
|--------|---------|-------|
| `validate.mjs` | Full repo consistency check | `node scripts/validate.mjs [--all] [--json]` |
| `skill-drift-check.mjs` | Detect skill/agent drift | `node scripts/skill-drift-check.mjs` |
| `ralph-smoke-test.sh` | Ralph prerequisites test | `bash scripts/ralph-smoke-test.sh [--verbose]` |

### Monitoring

| Script | Purpose | Usage |
|--------|---------|-------|
| `ralph-watch-filter.py` | Stream-json TUI filter | `claude --stream-json ... \| python3 scripts/ralph-watch-filter.py [-v]` |

### Installation

| Script | Purpose | Usage |
|--------|---------|-------|
| `install-codex.sh` | Install into Codex CLI | `bash scripts/install-codex.sh` |

## Skills (Slash Commands)

| Skill | Description |
|-------|-------------|
| `/oh-my-claudecode:ralph` | Persistent loop until completion with architect verification |
| `/oh-my-claudecode:autopilot` | Full autonomous pipeline |
| `/oh-my-claudecode:ultrawork` | Parallel execution with background agents |
| `/oh-my-claudecode:team N:type "task"` | N coordinated agents on shared task list |
| `/oh-my-claudecode:plan` | Strategic planning with interview/consensus modes |
| `/oh-my-claudecode:interview` | Deep specification interview (40+ questions) |
| `/oh-my-claudecode:code-review` | Code review with SHIP/NEEDS_WORK/MAJOR_RETHINK verdict |
| `/oh-my-claudecode:security-review` | Security-focused review |
| `/oh-my-claudecode:prime` | Codebase readiness assessment (8 pillars, 48 criteria) |
| `/oh-my-claudecode:export-context` | Export context for external LLM review |
| `/oh-my-claudecode:morning-review` | Start-of-day review of overnight activity |
| `/oh-my-claudecode:browser` | Browser automation via agent-browser CLI |
| `/oh-my-claudecode:doctor` | Diagnose installation problems |

## Sentinel Files

| File | Effect |
|------|--------|
| `.omc/STOP` | Block ALL tool execution |
| `.omc/PAUSE` | Allow only read-only tools |
| `STOP` (root) | Same as `.omc/STOP` |
| `PAUSE` (root) | Same as `.omc/PAUSE` |

Create with: `echo "reason" > .omc/PAUSE`
Remove to resume: `rm .omc/PAUSE`

Auto-PAUSE is created after 5 consecutive tool failures.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLOW_REVIEW_BACKEND` | - | Review backend: rp, codex, none |
| `OMC_STATE_DIR` | - | Override state directory |
| `OMC_RALPH_MAX_ITERATIONS` | 10 | Max ralph retry iterations |
| `OMC_RALPH_MAX_TURNS` | 200 | Max tool turns per iteration |
| `OMC_RALPH_DEBUG` | false | Verbose debug logging |
| `DROID_PLUGIN_ROOT` | - | Factory Droid plugin root (cross-platform) |
| `CLAUDE_PLUGIN_ROOT` | auto | Claude Code plugin root |

## Config File

Project config at `.omc/config.json`:

```json
{
  "memory": { "enabled": true },
  "review": { "backend": null },
  "ralph": {
    "maxIterations": 10,
    "maxTurns": 200,
    "maxAttemptsPerTask": 3,
    "requirePlanReview": false,
    "branchMode": "new"
  }
}
```
