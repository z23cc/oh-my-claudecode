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

## Protocol

### Phase 1: Understand Context

Before asking questions, gather context:
1. Read any provided spec file or description
2. Check `.omc/project-memory.json` for related conventions and pitfalls
3. Scan the codebase for existing related code patterns

### Phase 2: Systematic Interview

Use `AskUserQuestion` for ALL questions — never output questions as plain text.

Group 2-4 related questions per `AskUserQuestion` call. Target **40+ questions** for complex features, **15-20** for smaller ones.

**Question Categories:**

**1. Core Requirements (5-8 questions)**
- What is the primary user problem this solves?
- Who are the target users? What are their skill levels?
- What does success look like? How will you measure it?
- What are the must-have vs nice-to-have requirements?

**2. User Flows (5-8 questions)**
- Walk through the happy path step by step
- What happens on each error case?
- What are the entry/exit points?
- Are there multiple user roles with different flows?

**3. Data & State (4-6 questions)**
- What data entities are involved?
- Where is data stored? What's the source of truth?
- What state transitions exist?
- What validation rules apply?

**4. Integration Points (4-6 questions)**
- What external services/APIs are involved?
- What existing code needs to be modified?
- Are there authentication/authorization requirements?
- What about rate limiting, caching, retries?

**5. Edge Cases & Error Handling (5-8 questions)**
- What happens with invalid input?
- Concurrent access scenarios?
- Network failures?
- What are the boundary conditions?

**6. Non-Functional Requirements (4-6 questions)**
- Performance expectations?
- Security requirements?
- Accessibility requirements?
- Browser/platform support?

**7. Testing Strategy (3-5 questions)**
- What test cases are critical?
- What mocking is needed?
- What integration tests?

**8. Migration & Rollout (3-5 questions)**
- Is there existing data to migrate?
- Can this be feature-flagged?
- What's the rollback plan?

### Phase 3: Write Refined Spec

After completing the interview:

1. Write a comprehensive spec document:
   ```
   .omc/specs/{feature-slug}.md
   ```

2. Spec format:
   ```markdown
   # {Feature Name} Specification

   ## Summary
   One-paragraph overview with key decisions made during interview.

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

   ## Technical Design
   Architecture decisions, integration points...

   ## Edge Cases
   Documented edge cases with expected behavior...

   ## Test Plan
   Critical test cases...

   ## Open Questions
   Any unresolved items...
   ```

### Phase 4: Completion Summary

Report:
- Number of questions asked
- Key decisions captured
- Spec file location
- Suggest next step: `/oh-my-claudecode:plan` to create implementation tasks

## Rules

- ALWAYS use `AskUserQuestion` tool — never dump questions as text
- Group related questions (2-4 per call) for efficient conversation flow
- If the user says "skip" or "default", note reasonable defaults and move on
- Do NOT research code or read files during the interview (save for planning phase)
- Do NOT create implementation tasks (that's the plan skill's job)
- Capture decisions as they're made — don't wait until the end
