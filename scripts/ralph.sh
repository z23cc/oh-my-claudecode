#!/usr/bin/env bash
# ralph.sh — Run ralph autonomous mode in a loop.
#
# Usage:
#   bash scripts/ralph.sh "task description" [--max N] [--watch] [--config path]
#
# Options:
#   --max N       Max iterations (default: 10)
#   --watch       Pipe output through ralph-watch-filter.py
#   --config path Path to .omc/config.json (default: auto-detect)
#   --verbose     Show full claude output (not just watch filter)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TASK=""
MAX_ITERATIONS="${OMC_RALPH_MAX_ITERATIONS:-10}"
WATCH=0
VERBOSE=0
CONFIG=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max) MAX_ITERATIONS="$2"; shift 2 ;;
    --watch) WATCH=1; shift ;;
    --verbose) VERBOSE=1; shift ;;
    --config) CONFIG="$2"; shift 2 ;;
    *) TASK="$1"; shift ;;
  esac
done

if [[ -z "$TASK" ]]; then
  echo "Usage: ralph.sh \"task description\" [--max N] [--watch]"
  exit 1
fi

# Load config if specified
if [[ -n "$CONFIG" && -f "$CONFIG" ]]; then
  MAX_ITERATIONS=$(python3 -c "
import json, sys
cfg = json.load(open(sys.argv[1]))
print(cfg.get('ralph', {}).get('maxIterations', int(sys.argv[2])))
" "$CONFIG" "$MAX_ITERATIONS" 2>/dev/null || echo "$MAX_ITERATIONS")
fi

# Permission mode: use --dangerously-skip-permissions only when explicitly enabled
SKIP_PERMS="${OMC_RALPH_SKIP_PERMISSIONS:-true}"
CLAUDE_FLAGS=""
if [[ "$SKIP_PERMS" == "true" ]]; then
  CLAUDE_FLAGS="--dangerously-skip-permissions"
  echo "WARNING: Running with --dangerously-skip-permissions (set OMC_RALPH_SKIP_PERMISSIONS=false to disable)"
fi

echo "Ralph Autonomous Mode"
echo "Task: $TASK"
echo "Max iterations: $MAX_ITERATIONS"
echo "─────────────────────────"

for i in $(seq 1 "$MAX_ITERATIONS"); do
  echo ""
  echo "═══ Iteration $i/$MAX_ITERATIONS ═══"

  # Check for sentinel files
  if [[ -f ".omc/STOP" || -f "STOP" ]]; then
    echo "STOP sentinel detected. Halting."
    exit 0
  fi

  if [[ -f ".omc/PAUSE" || -f "PAUSE" ]]; then
    echo "PAUSE sentinel detected. Waiting..."
    while [[ -f ".omc/PAUSE" || -f "PAUSE" ]]; do
      sleep 5
    done
    echo "PAUSE cleared. Resuming."
  fi

  PROMPT="[RALPH ITERATION $i/$MAX_ITERATIONS] Continue working on: $TASK. Run /oh-my-claudecode:ralph to engage ralph mode."

  if [[ $WATCH -eq 1 ]]; then
    claude $CLAUDE_FLAGS --stream-json -p "$PROMPT" 2>&1 \
      | python3 "$SCRIPT_DIR/ralph-watch-filter.py"
  elif [[ $VERBOSE -eq 1 ]]; then
    claude $CLAUDE_FLAGS -p "$PROMPT"
  else
    claude $CLAUDE_FLAGS -p "$PROMPT" > /dev/null 2>&1
  fi

  EXIT_CODE=$?

  # Check if task completed (exit code 0 + completion marker)
  if [[ $EXIT_CODE -eq 0 ]]; then
    if [[ -f ".omc/state/ralph-complete" ]]; then
      echo ""
      echo "Task completed after $i iteration(s)."
      rm -f ".omc/state/ralph-complete"
      exit 0
    fi
  fi

  echo "Iteration $i finished (exit=$EXIT_CODE). Continuing..."
  sleep 2
done

echo ""
echo "Max iterations ($MAX_ITERATIONS) reached without completion."
exit 1
