#!/usr/bin/env python3
"""
Task Dashboard — Real-time status overview for oh-my-claudecode team tasks.

Reads task/epic JSON files from ~/.claude/tasks/{team}/ and displays
a formatted terminal dashboard with progress, blocking chains, and receipts.

Usage:
  python3 scripts/task-dashboard.py [team-name] [--watch] [--json]

Flags:
  --watch    Refresh every 5 seconds (Ctrl+C to stop)
  --json     Output raw JSON instead of formatted display
"""

import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

# ANSI colors
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
CYAN = "\033[36m"

STATUS_ICONS = {
    "pending": f"{YELLOW}○{RESET}",
    "in_progress": f"{BLUE}◉{RESET}",
    "completed": f"{GREEN}✓{RESET}",
    "blocked": f"{RED}✗{RESET}",
}

def get_tasks_dir(team: str) -> Path:
    return Path.home() / ".claude" / "tasks" / team

def load_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, FileNotFoundError, PermissionError):
        return None

def load_tasks(team: str) -> list[dict]:
    tasks_dir = get_tasks_dir(team)
    if not tasks_dir.exists():
        return []
    tasks = []
    for f in sorted(tasks_dir.glob("*.json")):
        if f.name == "epics":
            continue
        data = load_json(f)
        if data and "id" in data:
            tasks.append(data)
    return tasks

def load_epics(team: str) -> list[dict]:
    epics_dir = get_tasks_dir(team) / "epics"
    if not epics_dir.exists():
        return []
    epics = []
    for f in sorted(epics_dir.glob("*.json")):
        data = load_json(f)
        if data and "id" in data:
            epics.append(data)
    return epics

def progress_bar(done: int, total: int, width: int = 20) -> str:
    if total == 0:
        return f"{DIM}{'─' * width}{RESET}"
    filled = int(width * done / total)
    bar = f"{GREEN}{'█' * filled}{RESET}{DIM}{'░' * (width - filled)}{RESET}"
    pct = round(100 * done / total)
    return f"{bar} {pct}%"

def render_dashboard(team: str) -> str:
    tasks = load_tasks(team)
    epics = load_epics(team)
    lines = []

    now = datetime.now().strftime("%H:%M:%S")
    lines.append(f"{BOLD}oh-my-claudecode Task Dashboard{RESET}  {DIM}team={team}  {now}{RESET}")
    lines.append(f"{DIM}{'─' * 60}{RESET}")

    if not tasks and not epics:
        lines.append(f"{DIM}No tasks found in ~/.claude/tasks/{team}/{RESET}")
        return "\n".join(lines)

    # Summary counts
    by_status = {"pending": 0, "in_progress": 0, "completed": 0}
    for t in tasks:
        s = t.get("status", "pending")
        by_status[s] = by_status.get(s, 0) + 1

    total = len(tasks)
    done = by_status.get("completed", 0)
    lines.append(
        f"  {STATUS_ICONS['completed']} {done} done  "
        f"{STATUS_ICONS['in_progress']} {by_status.get('in_progress', 0)} active  "
        f"{STATUS_ICONS['pending']} {by_status.get('pending', 0)} pending  "
        f"  {progress_bar(done, total)}"
    )
    lines.append("")

    # Epic overview
    if epics:
        lines.append(f"{BOLD}Epics{RESET}")
        for epic in epics:
            eid = epic.get("id", "?")
            name = epic.get("name", "Untitled")
            status = epic.get("status", "active")
            icon = STATUS_ICONS.get("completed" if status == "completed" else "in_progress", "○")
            epic_tasks = [t for t in tasks if t.get("epicId") == eid]
            epic_done = sum(1 for t in epic_tasks if t.get("status") == "completed")
            lines.append(
                f"  {icon} {CYAN}{eid}{RESET} {name}  "
                f"{progress_bar(epic_done, len(epic_tasks), 15)}"
            )
            deps = epic.get("dependsOn", [])
            if deps:
                lines.append(f"      {DIM}depends on: {', '.join(deps)}{RESET}")
        lines.append("")

    # Task list
    lines.append(f"{BOLD}Tasks{RESET}")
    for t in tasks:
        tid = t.get("id", "?")
        title = t.get("title", t.get("name", "Untitled"))
        status = t.get("status", "pending")
        icon = STATUS_ICONS.get(status, "?")
        assignee = t.get("assignee", "")
        epic_id = t.get("epicId", "")

        meta = []
        if assignee:
            meta.append(f"{MAGENTA}{assignee}{RESET}")
        if epic_id:
            meta.append(f"{DIM}epic:{epic_id}{RESET}")

        evidence = t.get("evidence")
        if evidence:
            commits = len(evidence.get("commits", []))
            if commits:
                meta.append(f"{DIM}{commits} commits{RESET}")

        meta_str = f"  {'  '.join(meta)}" if meta else ""
        # Truncate title for display
        max_title = 40
        display_title = title[:max_title] + "..." if len(title) > max_title else title
        lines.append(f"  {icon} {CYAN}{tid:12s}{RESET} {display_title}{meta_str}")

    return "\n".join(lines)

def main():
    args = sys.argv[1:]
    watch = "--watch" in args
    as_json = "--json" in args
    args = [a for a in args if not a.startswith("--")]
    team = args[0] if args else "default"

    if as_json:
        tasks = load_tasks(team)
        epics = load_epics(team)
        print(json.dumps({"team": team, "tasks": tasks, "epics": epics}, indent=2))
        return

    if watch:
        try:
            while True:
                os.system("clear" if os.name != "nt" else "cls")
                print(render_dashboard(team))
                time.sleep(5)
        except KeyboardInterrupt:
            print(f"\n{YELLOW}Dashboard stopped{RESET}")
    else:
        print(render_dashboard(team))

if __name__ == "__main__":
    main()
