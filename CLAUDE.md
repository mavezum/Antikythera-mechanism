# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Keep Docs and Tests in Sync

**A code change isn't done until the docs and tests match.**

When behavior, data shapes, formulas, validation rules, or user-facing copy change:
- Update every test that encodes the old behavior. If a test still passes unchanged, ask whether it was actually covering what changed.
- Update README, in-repo docs, inline docstrings, schemas, and any plan/spec files that describe the old behavior.
- Update user-facing copy (UI strings, tooltips, privacy/methodology pages) that references the old behavior.
- Grep for the old value/term across the repo before declaring done — stale references in one file poison the rest.

The test: after your change, a new reader starting from the docs and tests alone should get a consistent picture. No file should still describe the pre-change world.

## 6. Fix the Root Cause, Not the Symptom

**Understand the architecture before touching code.**

When something doesn't work in its deployment environment, pause and ask: *why* does it not work there, but works locally? Trace the failure to its structural cause before writing a single line.

- Read the relevant config files first (Dockerfile, docker-compose.yml, nginx.conf, etc.).
- A static asset missing in Docker means the Dockerfile doesn't copy it — fix the Dockerfile, not the asset reference.
- Never work around a deployment gap by changing application code (e.g. inlining a file that should be served statically). That conflates concerns, bloats the bundle, and makes the real problem invisible.
- The right fix is almost always one line in the right config file.

Ask yourself: "Am I fixing the real problem, or papering over it in a way that will confuse the next person?" If the latter, stop and find the root cause.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
