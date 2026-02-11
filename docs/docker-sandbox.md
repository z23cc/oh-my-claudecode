# Docker Sandbox for Autonomous Execution

Run ralph/autopilot modes in an isolated Docker container to prevent unintended filesystem or network changes.

## Quick Start

```bash
# Build the sandbox image
docker build -t omc-sandbox -f docs/Dockerfile.sandbox .

# Run ralph in sandbox
docker run --rm -it \
  -v "$(pwd):/workspace" \
  -v "$HOME/.claude:/root/.claude:ro" \
  -e ANTHROPIC_API_KEY \
  omc-sandbox \
  claude --dangerously-skip-permissions -p "Run /oh-my-claudecode:ralph on task X"
```

## Dockerfile.sandbox

Create `docs/Dockerfile.sandbox`:

```dockerfile
FROM node:20-slim

# Install git and common tools
RUN apt-get update && apt-get install -y git curl jq python3 && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /workspace

# Copy plugin (if not mounted)
# COPY . /root/.claude/plugins/oh-my-claudecode/

# Default: interactive shell
CMD ["bash"]
```

## Safety Features

1. **Filesystem isolation**: Only `/workspace` is writable (bind-mounted from host)
2. **Network control**: Use `--network=none` for full network isolation
3. **Read-only credentials**: `~/.claude` mounted as `:ro` (read-only)
4. **Resource limits**: Use `--memory=4g --cpus=2` to cap resource usage
5. **Sentinel files**: PAUSE/STOP sentinels work inside the container

## Advanced: Network-Isolated Run

```bash
docker run --rm -it \
  --network=none \
  --memory=4g --cpus=2 \
  -v "$(pwd):/workspace" \
  -v "$HOME/.claude:/root/.claude:ro" \
  omc-sandbox \
  claude --dangerously-skip-permissions -p "..."
```

## With Worktrees

For worktree-based isolation:

```bash
# Create a worktree for the task
git worktree add ../task-sandbox feature/task-123

# Run sandbox on the worktree
docker run --rm -it \
  -v "$(pwd)/../task-sandbox:/workspace" \
  -v "$HOME/.claude:/root/.claude:ro" \
  -e ANTHROPIC_API_KEY \
  omc-sandbox \
  claude --dangerously-skip-permissions -p "..."

# Review changes, then merge or discard
cd ../task-sandbox && git diff
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API key for Claude |
| `CLAUDE_PLUGIN_ROOT` | Auto-detected inside container |
| `OMC_SANDBOX` | Set to `1` inside container for detection |

## Monitoring

Use the ralph-watch-filter from outside the container:

```bash
docker run --rm -it \
  -v "$(pwd):/workspace" \
  omc-sandbox \
  claude --stream-json -p "..." 2>&1 | python3 scripts/ralph-watch-filter.py
```
