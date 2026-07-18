# IMSpeed Inline Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use imspeed:subagent-driven-development (recommended) or imspeed:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real IMSpeed `imspeed:executing-plans` skill for same-session/batched execution using explicit role dispatch, `.superpowers/sdd` handoffs, task-scoped TDD + review gates, human checkpoints, and blocking unresolved Critical/Important findings, without changing the approved model matrix.

**Architecture:** Add `executing-plans` as a local IMSpeed skill overlay, register it in the manifest/validator contracts, and add routing tests. Reuse existing subagent-driven-development scripts and handoff contracts rather than duplicating them.

**Tech Stack:** Markdown skills, Node.js, Node test runner, and deterministic filesystem fixtures.

## Global Constraints

- Keep `src/agent-definitions.mjs` and its model assignments unchanged.
- Keep `imspeed:subagent-driven-development` as the recommended execution path.
- Every substantive dispatch names an explicit `imspeed-*` role.
- Use `.superpowers/sdd` for all handoff artifacts.
- Unresolved Critical or Important findings block inline continuation.
- Vendoring must preserve the local `skills/executing-plans` overlay.

## Task 1: Add and validate inline execution

**Files:**
- Modify: `scripts/vendor-superpowers-skills.mjs`
- Modify: `skills/writing-plans/SKILL.md`
- Create: `skills/executing-plans/SKILL.md`
- Modify: `tests/vendor-skills.test.mjs`
- Modify: `tests/manifest.test.mjs`
- Modify: `tests/skill-routing.test.mjs`

**Interfaces:**
- Consumes: routing policy, handoff contracts, existing subagent-driven-development scripts, and the validator's required skill set.
- Produces: a discoverable `imspeed:executing-plans` skill with explicit roles, checkpoints, blocking review semantics, and regression coverage.

- [ ] Add `executing-plans` to the required skill set and preserve the local overlay during vendoring.
- [ ] Add a failing vendor fixture proving an existing local overlay is not overwritten or deleted.
- [ ] Add the inline execution skill with plan loading, batch execution, TDD, review gates, checkpoints, and Critical/Important blocking rules.
- [ ] Update `writing-plans` to describe same-session `imspeed:executing-plans` while retaining the recommended subagent path.
- [ ] Add manifest and routing assertions for the skill, contracts, explicit roles, and absence of legacy dispatch names.
- [ ] Run focused tests, then `npm test`; commit without changing the role matrix.

**Verification:**

```bash
node --test tests/vendor-skills.test.mjs
node --test tests/manifest.test.mjs
node --test tests/skill-routing.test.mjs
npm test
```
