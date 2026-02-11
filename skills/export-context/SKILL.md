---
name: export-context
description: Export codebase context for external LLM review (ChatGPT, Claude web, etc.)
---

# Export Context for External LLM Review

Build and export codebase context as a markdown file for pasting into external LLMs (ChatGPT Pro, Claude web, Gemini, etc.).

**Use case**: When you want a second opinion from an external model on your code or plan.

## Input

Arguments: $ARGUMENTS
Format: `<type> [focus areas]`

Types:
- `plan` - Export plan review context (epic/task specs + related code)
- `impl` - Export implementation review context (current branch diff + affected files)
- `code <path>` - Export specific file/directory context

Examples:
- `/export-context impl focus on security`
- `/export-context plan focus on auth architecture`
- `/export-context code src/hooks/`

## Workflow

### Step 1: Gather Context

**For impl export:**
```bash
BRANCH=$(git branch --show-current)
BASE=$(git merge-base main HEAD 2>/dev/null || git merge-base master HEAD 2>/dev/null || echo "HEAD~5")
echo "## Branch: $BRANCH"
echo "## Commits:"
git log "$BASE"..HEAD --oneline
echo "## Changed files:"
git diff "$BASE"..HEAD --name-only
echo "## Diff stats:"
git diff "$BASE"..HEAD --stat
```

**For plan export:**
- Read task/epic files from `~/.claude/tasks/`
- Read project memory from `.omc/project-memory.json`
- Scan related code files mentioned in specs

**For code export:**
- Read specified files/directories
- Include code signatures for surrounding context

### Step 2: Build Code Signatures

For each changed/relevant file, extract signatures:
```bash
# Get function/class/interface signatures (TypeScript)
grep -n "^export\|^function\|^class\|^interface\|^type\|^const\|^enum" <file>
```

### Step 3: Compose Export Document

Build a markdown file with structure:
```markdown
# Code Review Context

## Project Overview
[From CLAUDE.md if available]

## Focus Areas
[From user input]

## Changed Files
[List with descriptions]

## Code Signatures (Affected Files)
[Function/class/interface signatures]

## Full Diff
[git diff output]

## Review Prompt
You are an expert code reviewer. Review the changes above with focus on:
1. Correctness - logic errors, edge cases, off-by-one
2. Security - injection, auth bypass, data exposure
3. Simplicity - unnecessary complexity, over-engineering
4. Performance - N+1 queries, O(n²) loops, unbounded data
5. Test coverage - untested paths, missing edge case tests

Provide verdict: SHIP / FIX FIRST / MAJOR REWORK
```

### Step 4: Write Output File

```bash
OUTPUT_FILE=~/Desktop/review-export-$(date +%Y%m%d-%H%M%S).md
```

Write the composed document to the output file.

### Step 5: Inform User

Tell the user:
- Where the file was saved
- What it contains
- How to use it (paste into external LLM)
- Remind them to return here to implement any fixes

## Rules

- Include code signatures, not full file dumps (token efficiency)
- Include full diff for impl reviews
- Include the review prompt so the external LLM knows what to focus on
- Respect `.gitignore` - don't export ignored files
- Don't include secrets, .env files, or credentials
- If CLAUDE.md exists, include project overview section from it
- Keep total output under 50K tokens for model context limits
