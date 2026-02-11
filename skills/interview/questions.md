# Interview Question Categories

Ask NON-OBVIOUS questions only. Skip questions where the answer is self-evident from context.

Target: 40+ questions for complex features, 15-20 for smaller ones.

## 1. Core Requirements (5-8 questions)

- What is the primary user problem this solves?
- Who are the target users? What are their skill levels?
- What does success look like? How will you measure it?
- What are the must-have vs nice-to-have requirements?
- Are there existing solutions? Why are they insufficient?

## 2. User Flows (5-8 questions)

- Walk through the happy path step by step
- What happens on each error case?
- What are the entry/exit points?
- Are there multiple user roles with different flows?
- What loading/transition states exist?

## 3. Data & State (4-6 questions)

- What data entities are involved?
- Where is data stored? What's the source of truth?
- What state transitions exist?
- What validation rules apply?
- Concurrency and race conditions?

## 4. Architecture & Integration (4-6 questions)

- Component boundaries and responsibilities
- What external services/APIs are involved?
- What existing code needs to be modified?
- API contracts and interfaces
- For parallel work: can tasks touch disjoint files? (reduces merge conflicts)

## 5. Edge Cases & Error Handling (5-8 questions)

- What happens with invalid input?
- Concurrent access scenarios?
- Network failures and partial failures?
- What are the boundary conditions?
- Recovery strategies and retry logic?
- Timeout handling?

## 6. Security (3-5 questions)

- Authentication/authorization requirements?
- Input validation and sanitization?
- Data sensitivity classification?
- Known attack vectors to defend against?

## 7. Performance & Scale (3-5 questions)

- Expected load and scale?
- Latency requirements?
- Memory constraints?
- Caching strategy?

## 8. Non-Functional Requirements (3-5 questions)

- Accessibility requirements?
- Browser/platform support?
- Offline behavior?
- Internationalization needs?

## 9. Testing Strategy (3-5 questions)

- What test cases are critical?
- What mocking is needed?
- Integration test scenarios?
- E2E critical paths?

## 10. Migration & Rollout (3-5 questions)

- Is there existing data to migrate?
- Breaking changes to existing behavior?
- Can this be feature-flagged?
- What's the rollback plan?

## 11. Unknowns & Risks (3-5 questions)

- What are you most uncertain about?
- What could derail this?
- What needs research first?
- External dependencies that could block?

## Interview Guidelines

1. **Ask follow-up questions** based on answers - dig deep into surprising responses
2. **Don't ask obvious questions** - assume technical competence
3. **Continue until complete** - multiple rounds expected, don't rush
4. **Group related questions** (2-4 per AskUserQuestion call)
5. **Probe contradictions** - if answers don't align, clarify immediately
6. **Surface hidden complexity** - ask about things the user might not have considered
7. **Use multiSelect** for non-exclusive option questions
