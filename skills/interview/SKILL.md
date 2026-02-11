---
name: interview
description: In-depth specification interview to extract complete implementation details before building
---

# Interview Protocol

Conduct a deep specification interview to flesh out requirements, edge cases, and implementation details before any coding begins.

## Trigger

`/oh-my-claudecode:interview [target]`

Where `[target]` can be:
- A feature description ("user authentication with OAuth")
- A file path to an existing spec ("docs/auth-spec.md")
- Empty (will prompt for target)

## NOT in Scope (defer to other skills)

Interview focuses ONLY on extracting requirements through questioning. Do NOT:

- **Research code or read files** — save for planning phase
- **Create implementation tasks** — that's `/oh-my-claudecode:plan`'s job
- **Add file/line references** — planning does codebase analysis
- **Size tasks (S/M/L)** — planning determines sizing
- **Write implementation code** — execution phase only
- **Determine dependency ordering** — planning handles sequencing

## Protocol

### Phase 1: Understand Context

Before asking questions, gather context:
1. Read any provided spec file or description
2. Check `.omc/project-memory.json` for related conventions and pitfalls
3. Note what you already know — avoid asking questions the context already answers

### Phase 2: Systematic Interview

Use `AskUserQuestion` for ALL questions — never output questions as plain text.

**Anti-pattern (WRONG)**:
```
Question 1: What database should we use?
Options: a) PostgreSQL b) SQLite c) MongoDB
```

**Correct pattern**: Call `AskUserQuestion` tool with question and options.

Group 2-4 related questions per `AskUserQuestion` call. Target **40+ questions** for complex features, **15-20** for smaller ones.

Read [questions.md](questions.md) for all question categories and interview guidelines.

### Phase 3: Write Refined Spec

After completing the interview:

**Overwrite protection**: Before writing, check if the target spec already exists:

```
Check: .omc/specs/{feature-slug}.md
```

- **If spec exists with substantial content**: Do NOT overwrite. Only APPEND new sections:
  - New edge cases discovered in interview
  - Additional acceptance criteria
  - Updated requirements or decisions
  - Prefix appended sections with `## Interview Update ({date})`

- **If spec is empty/minimal or does not exist**: Write the full spec.

Spec location and format:

```
.omc/specs/{feature-slug}.md
```

```markdown
# {Feature Name} Specification

## Summary
One-paragraph overview with key decisions made during interview.

## Key Decisions
Decisions made during interview (e.g., "Use OAuth not SAML", "Support mobile + web")

## Requirements
- [ ] Requirement 1 (must-have)
- [ ] Requirement 2 (must-have)
- [ ] Requirement 3 (nice-to-have)

## User Flows
### Happy Path
Step-by-step flow...

### Error Cases
Error handling for each failure mode...

## Data Model
Entities, relationships, validation rules...

## Edge Cases
Documented edge cases with expected behavior...

## Test Plan
Critical test cases...

## Open Questions
Any unresolved items that need research during planning...
```

### Phase 4: Completion Summary

Report:
- Number of questions asked
- Key decisions captured
- Spec file location (written or updated)
- Suggest next step: `/oh-my-claudecode:plan` to create implementation tasks

## Rules

- ALWAYS use `AskUserQuestion` tool — never dump questions as text
- Group related questions (2-4 per call) for efficient conversation flow
- If the user says "skip" or "default", note reasonable defaults and move on
- Capture decisions as they're made — don't wait until the end
- Check for existing spec content before writing — never silently overwrite
- Quality over speed — user should feel they've thought through everything
