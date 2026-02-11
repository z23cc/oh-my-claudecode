#!/usr/bin/env bash
# bump.sh — Semver version bump for oh-my-claudecode
#
# Usage:
#   bash scripts/bump.sh <patch|minor|major> [--dry-run]
#
# Updates:
#   - .claude-plugin/plugin.json (version field)
#   - .claude-plugin/marketplace.json (version field, if exists)
#   - package.json (version field)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
BUMP_TYPE="${1:-patch}"
DRY_RUN=0
[[ "${2:-}" == "--dry-run" ]] && DRY_RUN=1

# Read current version from plugin.json
PLUGIN_JSON="$ROOT/.claude-plugin/plugin.json"
if [[ ! -f "$PLUGIN_JSON" ]]; then
  echo "ERROR: $PLUGIN_JSON not found"
  exit 1
fi

CURRENT=$(python3 -c "import json, sys; print(json.load(open(sys.argv[1]))['version'])" "$PLUGIN_JSON")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP_TYPE" in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  *) echo "Usage: bump.sh <patch|minor|major> [--dry-run]"; exit 1 ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "Bumping: $CURRENT → $NEW_VERSION ($BUMP_TYPE)"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "[dry-run] Would update:"
  echo "  .claude-plugin/plugin.json"
  [[ -f "$ROOT/.claude-plugin/marketplace.json" ]] && echo "  .claude-plugin/marketplace.json"
  [[ -f "$ROOT/package.json" ]] && echo "  package.json"
  exit 0
fi

# Update plugin.json (using sys.argv to prevent injection)
python3 -c "
import json, sys
path, ver = sys.argv[1], sys.argv[2]
data = json.load(open(path))
data['version'] = ver
with open(path, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
" "$PLUGIN_JSON" "$NEW_VERSION"
echo "  Updated: .claude-plugin/plugin.json"

# Update marketplace.json if exists
MARKETPLACE="$ROOT/.claude-plugin/marketplace.json"
if [[ -f "$MARKETPLACE" ]]; then
  python3 -c "
import json, sys
path, ver = sys.argv[1], sys.argv[2]
data = json.load(open(path))
data['version'] = ver
with open(path, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
" "$MARKETPLACE" "$NEW_VERSION"
  echo "  Updated: .claude-plugin/marketplace.json"
fi

# Update package.json if exists
PKG="$ROOT/package.json"
if [[ -f "$PKG" ]]; then
  python3 -c "
import json, sys
path, ver = sys.argv[1], sys.argv[2]
data = json.load(open(path))
data['version'] = ver
with open(path, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
" "$PKG" "$NEW_VERSION"
  echo "  Updated: package.json"
fi

echo ""
echo "Version bumped to $NEW_VERSION"
echo "Next: git add -A && git commit -m 'chore: bump version to $NEW_VERSION'"
