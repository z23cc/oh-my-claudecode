#!/usr/bin/env python3
"""
Ralph Watch Filter — Stream filter for Claude's --stream-json output.

Parses JSON lines from stdin and displays a real-time TUI of tool calls,
errors, and progress. Designed for ralph autonomous mode monitoring.

Usage:
  claude --stream-json ... 2>&1 | python3 scripts/ralph-watch-filter.py [-v]

Flags:
  -v, --verbose   Show thinking blocks and text responses (default: tools only)
"""

import json
import sys
import signal
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

# Tool type icons
TOOL_ICONS = {
    "Bash": "🖥️",
    "Read": "📖",
    "Write": "📝",
    "Edit": "✏️",
    "Grep": "🔍",
    "Glob": "📂",
    "Task": "🤖",
    "WebFetch": "🌐",
    "WebSearch": "🔎",
}

def format_tool(name: str) -> str:
    icon = TOOL_ICONS.get(name, "🔧")
    return f"{icon} {CYAN}{name}{RESET}"

def format_timestamp() -> str:
    return f"{DIM}{datetime.now().strftime('%H:%M:%S')}{RESET}"

def truncate(text: str, max_len: int = 120) -> str:
    text = text.replace("\n", " ").strip()
    if len(text) > max_len:
        return text[:max_len - 3] + "..."
    return text

def main():
    verbose = "-v" in sys.argv or "--verbose" in sys.argv
    tool_count = 0
    error_count = 0

    # Handle SIGPIPE gracefully (fail-open)
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)

    print(f"{BOLD}Ralph Watch Filter{RESET} {'(verbose)' if verbose else '(tools only)'}")
    print(f"{DIM}{'─' * 60}{RESET}")

    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type", "")

            # Tool use
            if msg_type == "tool_use":
                tool_count += 1
                name = data.get("name", "unknown")
                tool_input = data.get("input", {})
                summary = ""

                if name == "Bash":
                    summary = truncate(tool_input.get("command", ""))
                elif name == "Read":
                    summary = tool_input.get("file_path", "")
                elif name == "Write":
                    summary = tool_input.get("file_path", "")
                elif name == "Edit":
                    summary = tool_input.get("file_path", "")
                elif name == "Grep":
                    summary = f'/{tool_input.get("pattern", "")}/'
                elif name == "Glob":
                    summary = tool_input.get("pattern", "")
                elif name == "Task":
                    summary = tool_input.get("description", "")
                else:
                    summary = truncate(str(tool_input))

                print(f"{format_timestamp()} {format_tool(name)} {summary}")

            # Tool result with error
            elif msg_type == "tool_result":
                content = data.get("content", "")
                if isinstance(content, str) and ("error" in content.lower() or "Error" in content):
                    error_count += 1
                    print(f"{format_timestamp()} {RED}❌ Error in tool result:{RESET} {truncate(content)}")

            # Text responses (verbose only)
            elif msg_type == "text" and verbose:
                text = data.get("text", "")
                if text.strip():
                    print(f"{format_timestamp()} {BLUE}💬{RESET} {truncate(text, 200)}")

            # Thinking (verbose only)
            elif msg_type == "thinking" and verbose:
                text = data.get("text", "")
                if text.strip():
                    print(f"{format_timestamp()} {MAGENTA}🧠{RESET} {truncate(text, 100)}")

            # Result/completion
            elif msg_type == "result":
                cost = data.get("cost_usd", 0)
                duration = data.get("duration_ms", 0)
                print(f"\n{DIM}{'─' * 60}{RESET}")
                print(f"{GREEN}✅ Complete{RESET} | Tools: {tool_count} | Errors: {error_count}")
                if cost:
                    print(f"   Cost: ${cost:.4f} | Duration: {duration/1000:.1f}s")

    except BrokenPipeError:
        # Fail-open: drain stdin to avoid SIGPIPE cascade
        try:
            sys.stdin.read()
        except Exception:
            pass
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Interrupted{RESET} | Tools: {tool_count} | Errors: {error_count}")
        sys.exit(0)

if __name__ == "__main__":
    main()
