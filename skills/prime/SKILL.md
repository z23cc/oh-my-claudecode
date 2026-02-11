---
name: prime
description: Assess project readiness for agent-driven development across 8 pillars
---

# Prime - Project Readiness Assessment

Assess the current project's readiness for agent-driven development across 8 pillars (48 criteria). Identify gaps, assign maturity levels, and auto-fix agent readiness issues.

<Purpose>
Prime evaluates how well a project is set up for reliable agent work. It checks 8 pillars spanning agent readiness (fixable) and production quality (report-only), assigns a maturity level (L1-L5), and produces an actionable report.
</Purpose>

<Use_When>
- Starting work on a new project for the first time
- User asks "is this project ready for agents?" or "run prime" or "assess readiness"
- Before setting up a complex autonomous workflow (ralph, autopilot, team)
- After significant infrastructure changes (CI, build system, test framework)
</Use_When>

<Pillars>

## Agent Readiness Pillars (Auto-Fix)

### Pillar 1: Style & Validation
- Linter configured (ESLint, Ruff, Clippy, etc.)
- Formatter configured (Prettier, Black, rustfmt, etc.)
- Type checking configured (TypeScript strict, mypy, etc.)
- Pre-commit hooks (husky, pre-commit, lefthook)
- Editor config (.editorconfig)
- Import ordering rules

### Pillar 2: Build System
- Build command documented and working
- Lock file present (package-lock.json, Cargo.lock, etc.)
- Build output directory configured (.gitignore'd)
- Monorepo workspace config (if applicable)
- Build scripts in package.json/Makefile/etc.
- Clean build from scratch succeeds

### Pillar 3: Testing
- Test framework configured (vitest, pytest, cargo test, etc.)
- Test command documented and working
- At least 1 test file exists
- Coverage configuration present
- Test file naming convention documented
- CI runs tests on PR

### Pillar 4: Documentation
- README.md exists with setup instructions
- CLAUDE.md or AGENTS.md exists (agent-specific instructions)
- Architecture documentation (or inline comments on key modules)
- API documentation (if applicable)
- Contributing guide
- Setup instructions tested (clone → build → test works)

### Pillar 5: Dev Environment
- .env.example or .env.template exists (if env vars used)
- Docker/devcontainer config (if applicable)
- Runtime version specified (.node-version, rust-toolchain.toml, etc.)
- Dependencies installable in clean environment
- Dev server command documented

## Production Quality Pillars (Report Only)

### Pillar 6: Observability
- Structured logging (not just console.log)
- Error tracking (Sentry, Bugsnag, etc.)
- Health endpoint (if applicable)
- Metrics collection (if applicable)
- Tracing setup (if applicable)

### Pillar 7: Security
- Branch protection on main/master
- Secrets not in source (no hardcoded keys)
- CODEOWNERS file (if team project)
- Dependency update automation (Dependabot, Renovate)
- Security policy (SECURITY.md)

### Pillar 8: Workflow & Process
- CI/CD pipeline configured
- PR template exists
- Issue template exists
- Release automation (tags, changelog)
- Branch naming convention documented

</Pillars>

<Maturity_Levels>
- **Level 1 (Minimal)**: <30% criteria met - Agent work will be unreliable
- **Level 2 (Functional)**: 30-49% - Agents can work but will hit friction
- **Level 3 (Standardized)**: 50-69% - Target level for agent readiness
- **Level 4 (Optimized)**: 70-84% - Smooth agent experience
- **Level 5 (Autonomous)**: 85%+ - Fully agent-ready, ralph/autopilot safe
</Maturity_Levels>

<Steps>
1. **Detect project type**: Read package.json, Cargo.toml, pyproject.toml, go.mod, etc. to determine language/framework.
2. **Parallel assessment**: For each pillar, check all criteria. Use file existence checks (Glob), content checks (Grep/Read), and command verification (Bash) as appropriate.
3. **Score each pillar**: Count criteria met vs total applicable criteria. Skip non-applicable criteria (e.g., Docker for a CLI tool).
4. **Calculate overall maturity**: Average across all 8 pillars.
5. **Auto-fix agent readiness gaps** (Pillars 1-5 only):
   - Missing .editorconfig → create one matching project style
   - Missing CLAUDE.md → generate from detected project structure
   - Missing .env.example → generate from .env if present
   - Missing test → note as recommendation (don't auto-create)
6. **Report production quality gaps** (Pillars 6-8): List findings without attempting fixes.
7. **Output final report** with pillar scores, maturity level, and action items.
</Steps>

<Output_Format>
# Prime Assessment Report

**Project:** {name}
**Language:** {language}
**Framework:** {framework}
**Overall Maturity:** Level {N} ({percentage}%)

## Pillar Scores

| # | Pillar | Score | Status |
|---|--------|-------|--------|
| 1 | Style & Validation | X/Y | {met/gap} |
| 2 | Build System | X/Y | {met/gap} |
| 3 | Testing | X/Y | {met/gap} |
| 4 | Documentation | X/Y | {met/gap} |
| 5 | Dev Environment | X/Y | {met/gap} |
| 6 | Observability | X/Y | {met/gap} |
| 7 | Security | X/Y | {met/gap} |
| 8 | Workflow & Process | X/Y | {met/gap} |

## Auto-Fixed (Agent Readiness)
- [x] Created .editorconfig
- [x] Generated CLAUDE.md

## Recommendations (Production Quality)
- [ ] Add structured logging (Pillar 6)
- [ ] Enable branch protection on main (Pillar 7)
- [ ] Add PR template (Pillar 8)

## Agent Readiness Verdict
{Level N}: {description}. {recommendation for next steps}.
</Output_Format>

<Constraints>
- Only auto-fix Pillars 1-5 (Agent Readiness). Pillars 6-8 are report-only.
- Never modify existing configuration files. Only create missing ones.
- Skip non-applicable criteria (don't penalize a CLI tool for lacking Docker).
- Run real commands to verify (don't just check file existence — run `npm test` to confirm it works).
- Limit total execution to reasonable scope. Don't run full test suites — just verify the command exists and starts.
</Constraints>
