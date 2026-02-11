---
name: morning-review
description: Start-of-day workflow to review overnight autonomous work and plan the day
---

# Morning Review Workflow

Review what happened during autonomous/ralph runs, assess state, and plan today's work.

## Trigger

`/oh-my-claudecode:morning-review`

## Steps

### 1. Gather Overnight Activity

```bash
# Recent git activity (last 12 hours)
git log --oneline --since="12 hours ago" --all

# Check for any sentinel files
ls -la .omc/PAUSE .omc/STOP 2>/dev/null

# Check ralph guard state
cat .omc/state/ralph-guard-*.json 2>/dev/null

# Check failure tracker
cat .omc/state/failure-tracker.json 2>/dev/null
```

### 2. Review Receipts

Check `.omc/receipts/` for review verdicts from overnight runs:
- Count SHIP vs NEEDS_WORK vs MAJOR_RETHINK verdicts
- Identify any failed reviews that need attention

### 3. Project Memory Update

Read `.omc/project-memory.json` and check:
- New pitfalls discovered
- Convention changes
- Any decisions logged during autonomous work

### 4. Task Status

If using team mode, check task progress:
```bash
# List task files
ls ~/.claude/tasks/*/
```

### 5. Generate Report

Output a formatted morning briefing:

```
Morning Review - {date}
========================

Overnight Activity:
  - {N} commits made
  - {M} review receipts generated
  - {K} new pitfalls captured

Attention Needed:
  - [list any NEEDS_WORK or MAJOR_RETHINK items]
  - [any PAUSE/STOP sentinels active]
  - [any failing tests]

Today's Priorities:
  - [based on pending tasks and review state]
```

### 6. Clear Stale State

Offer to clean up:
- Remove resolved sentinel files
- Clear old failure tracker state
- Archive completed receipts

## Rules

- This is a READ-ONLY review — do not modify code
- Present findings clearly before suggesting actions
- If a PAUSE sentinel exists, explain why and ask before removing
- Always run `git status` to check for uncommitted work
