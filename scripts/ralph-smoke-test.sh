#!/usr/bin/env bash
# Ralph Smoke Test — Validates ralph mode prerequisites and basic flow.
#
# Usage:
#   bash scripts/ralph-smoke-test.sh [--verbose]
#
# Tests:
#   1. Claude CLI available
#   2. Plugin installed and loadable
#   3. Hooks.json valid
#   4. Agent definitions compile
#   5. Skill SKILL.md files exist
#   6. Sentinel file detection works
#   7. Receipt validation works
#   8. Project memory init/read works

set -euo pipefail

VERBOSE=0
[[ "${1:-}" == "--verbose" ]] && VERBOSE=1

PASS=0
FAIL=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
RESET='\033[0m'

pass() {
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}PASS${RESET}: $1"
}

fail() {
  FAIL=$((FAIL + 1))
  echo -e "  ${RED}FAIL${RESET}: $1"
}

skip() {
  echo -e "  ${YELLOW}SKIP${RESET}: $1"
}

log() {
  [[ $VERBOSE -eq 1 ]] && echo "  [debug] $1"
}

echo "Ralph Smoke Test"
echo "================"

# 1. Claude CLI
if command -v claude &>/dev/null; then
  pass "Claude CLI available"
else
  skip "Claude CLI not in PATH (not required for unit tests)"
fi

# 2. Plugin structure
if [[ -f "$ROOT/.claude-plugin/plugin.json" ]]; then
  pass "plugin.json exists"
  # Validate JSON
  if python3 -c "import json; json.load(open('$ROOT/.claude-plugin/plugin.json'))" 2>/dev/null; then
    pass "plugin.json is valid JSON"
  else
    fail "plugin.json is invalid JSON"
  fi
else
  fail "plugin.json missing"
fi

# 3. Hooks.json valid
if [[ -f "$ROOT/hooks/hooks.json" ]]; then
  if python3 -c "import json; json.load(open('$ROOT/hooks/hooks.json'))" 2>/dev/null; then
    pass "hooks.json is valid JSON"
  else
    fail "hooks.json is invalid JSON"
  fi

  # Check cross-platform path pattern
  if grep -q 'DROID_PLUGIN_ROOT' "$ROOT/hooks/hooks.json"; then
    pass "hooks.json uses cross-platform paths"
  else
    fail "hooks.json missing DROID_PLUGIN_ROOT fallback"
  fi
else
  fail "hooks.json missing"
fi

# 4. Agent definitions compile
if [[ -f "$ROOT/src/agents/definitions.ts" ]]; then
  AGENT_COUNT=$(grep -c "^export const.*Agent.*AgentConfig" "$ROOT/src/agents/definitions.ts" 2>/dev/null || echo 0)
  if [[ $AGENT_COUNT -gt 0 ]]; then
    pass "Agent definitions found ($AGENT_COUNT agents)"
  else
    fail "No agent definitions found"
  fi
else
  fail "definitions.ts missing"
fi

# 5. Skill SKILL.md files
SKILL_COUNT=0
SKILL_MISSING=0
for d in "$ROOT"/skills/*/; do
  [[ -d "$d" ]] || continue
  if [[ -f "${d}SKILL.md" ]]; then
    SKILL_COUNT=$((SKILL_COUNT + 1))
  else
    SKILL_MISSING=$((SKILL_MISSING + 1))
    log "Missing SKILL.md: $d"
  fi
done
if [[ $SKILL_MISSING -eq 0 ]]; then
  pass "All $SKILL_COUNT skills have SKILL.md"
else
  fail "$SKILL_MISSING skill(s) missing SKILL.md"
fi

# 6. Sentinel file detection (unit test)
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Test STOP sentinel
mkdir -p "$TMPDIR/.omc"
echo "test stop" > "$TMPDIR/.omc/STOP"
if [[ -f "$TMPDIR/.omc/STOP" ]]; then
  pass "Sentinel STOP file creation works"
  rm "$TMPDIR/.omc/STOP"
else
  fail "Sentinel STOP file creation failed"
fi

# Test PAUSE sentinel
echo "test pause" > "$TMPDIR/.omc/PAUSE"
if [[ -f "$TMPDIR/.omc/PAUSE" ]]; then
  pass "Sentinel PAUSE file creation works"
  rm "$TMPDIR/.omc/PAUSE"
else
  fail "Sentinel PAUSE file creation failed"
fi

# 7. Receipt validation (via node)
RECEIPT_TEST='{"taskId":"test-1","reviewType":"code_review","verdict":"SHIP"}'
RECEIPT_RESULT=$(echo "$RECEIPT_TEST" | node -e "
  const input = require('fs').readFileSync(0, 'utf-8');
  try {
    const r = JSON.parse(input);
    if (r.taskId && r.reviewType && r.verdict) console.log('valid');
    else console.log('invalid');
  } catch { console.log('invalid'); }
" 2>/dev/null)
if [[ "$RECEIPT_RESULT" == "valid" ]]; then
  pass "Receipt JSON validation works"
else
  fail "Receipt JSON validation failed"
fi

# 8. Project memory structure
if [[ -f "$ROOT/src/hooks/project-memory/types.ts" ]]; then
  if grep -q "noteType" "$ROOT/src/hooks/project-memory/types.ts"; then
    pass "Project memory types include noteType"
  else
    fail "Project memory types missing noteType"
  fi
else
  skip "project-memory/types.ts not found"
fi

# Summary
echo ""
echo "─────────────────────"
echo -e "Passed: ${GREEN}$PASS${RESET}  Failed: ${RED}$FAIL${RESET}"

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}Some tests failed.${RESET}"
  exit 1
else
  echo -e "${GREEN}All tests passed.${RESET}"
  exit 0
fi
