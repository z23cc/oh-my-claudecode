#!/usr/bin/env bash
# install-codex.sh — Install oh-my-claudecode into Codex CLI (~/.codex)
#
# Usage:
#   bash scripts/install-codex.sh
#
# What it does:
#   1. Creates ~/.codex directory structure
#   2. Copies agents/ with frontmatter conversion (Claude → Codex format)
#   3. Copies skills/ with path patching
#   4. Copies scripts/ for hook support
#   5. Patches CLAUDE_PLUGIN_ROOT → ~/.codex in all files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
CODEX_DIR="${HOME}/.codex"

# Codex agent defaults (override with env vars)
CODEX_AGENT_MODEL="${CODEX_AGENT_MODEL:-gpt-5.2-codex-medium}"
CODEX_AGENT_PROFILE="${CODEX_AGENT_PROFILE:-default}"
CODEX_AGENT_APPROVAL="${CODEX_AGENT_APPROVAL:-on-request}"
CODEX_AGENT_SANDBOX="${CODEX_AGENT_SANDBOX:-workspace-write}"

echo "Installing oh-my-claudecode to Codex CLI at $CODEX_DIR"

# Create structure
mkdir -p "$CODEX_DIR"/{agents,skills,scripts,hooks}

# Copy agents with frontmatter conversion
echo "Converting agents..."
for f in "$ROOT"/agents/*.md; do
  [ -f "$f" ] || continue
  name=$(basename "$f")

  # Convert frontmatter: remove Claude-specific fields, add Codex fields
  python3 -c "
import sys, re

content = open('$f').read()
# Extract frontmatter
if content.startswith('---'):
    parts = content.split('---', 2)
    fm = parts[1]
    body = parts[2] if len(parts) > 2 else ''

    # Keep name, description; transform model; remove Claude-specific
    lines = []
    for line in fm.strip().split('\n'):
        if line.startswith('model:'):
            lines.append(f'model: $CODEX_AGENT_MODEL')
        elif line.startswith('disallowedTools:') or line.startswith('color:'):
            continue  # Remove Claude-specific fields
        else:
            lines.append(line)

    # Add Codex-specific fields
    lines.append(f'profile: $CODEX_AGENT_PROFILE')
    lines.append(f'approval_policy: $CODEX_AGENT_APPROVAL')
    lines.append(f'sandbox_mode: $CODEX_AGENT_SANDBOX')

    output = '---\n' + '\n'.join(lines) + '\n---' + body
else:
    output = content

# Patch plugin root paths
output = output.replace('\${CLAUDE_PLUGIN_ROOT}', '$CODEX_DIR')
output = output.replace('\${DROID_PLUGIN_ROOT:-\${CLAUDE_PLUGIN_ROOT}}', '$CODEX_DIR')

sys.stdout.write(output)
" > "$CODEX_DIR/agents/$name"
done
AGENT_COUNT=$(ls -1 "$CODEX_DIR"/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
echo "  $AGENT_COUNT agents converted"

# Copy skills with path patching
echo "Copying skills..."
for d in "$ROOT"/skills/*/; do
  [ -d "$d" ] || continue
  skill=$(basename "$d")
  mkdir -p "$CODEX_DIR/skills/$skill"
  for f in "$d"*; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    sed \
      -e 's|\${CLAUDE_PLUGIN_ROOT}|'"$CODEX_DIR"'|g' \
      -e 's|\${DROID_PLUGIN_ROOT:-\${CLAUDE_PLUGIN_ROOT}}|'"$CODEX_DIR"'|g' \
      "$f" > "$CODEX_DIR/skills/$skill/$name"
  done
done
SKILL_COUNT=$(ls -d "$CODEX_DIR"/skills/*/ 2>/dev/null | wc -l | tr -d ' ')
echo "  $SKILL_COUNT skills copied"

# Copy scripts
echo "Copying scripts..."
cp "$ROOT"/scripts/*.mjs "$CODEX_DIR/scripts/" 2>/dev/null || true
cp "$ROOT"/scripts/*.py "$CODEX_DIR/scripts/" 2>/dev/null || true
cp "$ROOT"/scripts/*.sh "$CODEX_DIR/scripts/" 2>/dev/null || true
# Patch paths in scripts
for f in "$CODEX_DIR"/scripts/*; do
  [ -f "$f" ] || continue
  if sed -i.bak \
    -e 's|\${CLAUDE_PLUGIN_ROOT}|'"$CODEX_DIR"'|g' \
    -e 's|\${DROID_PLUGIN_ROOT:-\${CLAUDE_PLUGIN_ROOT}}|'"$CODEX_DIR"'|g' \
    "$f" 2>/dev/null; then
    rm -f "$f.bak"
  else
    # Restore from backup if sed failed
    [ -f "$f.bak" ] && mv "$f.bak" "$f"
    echo "  WARN: Could not patch $f"
  fi
done

# Copy hooks
echo "Copying hooks..."
if [ -f "$ROOT/hooks/hooks.json" ]; then
  sed \
    -e 's|\${CLAUDE_PLUGIN_ROOT}|'"$CODEX_DIR"'|g' \
    -e 's|\${DROID_PLUGIN_ROOT:-\${CLAUDE_PLUGIN_ROOT}}|'"$CODEX_DIR"'|g' \
    "$ROOT/hooks/hooks.json" > "$CODEX_DIR/hooks/hooks.json"
fi

echo ""
echo "Installation complete!"
echo "  Location: $CODEX_DIR"
echo "  Agents:   $AGENT_COUNT"
echo "  Skills:   $SKILL_COUNT"
echo ""
echo "To use with Codex CLI, set CODEX_PLUGIN_ROOT=$CODEX_DIR"
