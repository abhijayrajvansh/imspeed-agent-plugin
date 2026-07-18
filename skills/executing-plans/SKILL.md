---
name: executing-plans
description: Use when executing an approved IMSpeed plan in the current session using same-session batched role dispatch
---

# Executing Plans

Run approved implementation plans in this session, one small batch at a time, using
explicit `imspeed-*` role dispatch, `.superpowers/sdd` handoff artifacts, and task/final review gates.

## When to Use

Use this skill when the user or coordinator wants same-session execution after a
written plan exists, with explicit checkpointing.

Do not use for discovery-only work; use planning/discovery first.

## Routing and Handoff Prerequisites

Before dispatching any implementation or review, read and follow:

- `../../references/routing-policy.md`
- `../../references/handoff-contracts.md`

Use `.superpowers/sdd/task-<N>-brief.md`, `.superpowers/sdd/task-<N>-report.md`, and `.superpowers/sdd/progress.md`.

## Preconditions

1. Ensure a plan file exists and scope is approved.
2. Confirm there is a deterministic batch target (default: one task per batch).
3. Verify all previous findings in the ledger are either resolved or explicitly
   deferred by user instruction.

## Process

### 1. Read and split the plan

- Read the approved plan file.
- Confirm task ordering and dependencies.
- Choose a batch size (default 1 task).
- For each batch, create/refresh progress ledger entries for start state.

### 2. Load task briefs

For each task in the batch, run:

```text
./skills/subagent-driven-development/scripts/task-brief PLAN_FILE TASK_NUMBER /path/to/.superpowers/sdd/task-<N>-brief.md
```

Include the brief path in every dispatch.

### 3. Dispatch implementation agents

For each task, dispatch exactly one implementation agent role from one of:

- `imspeed-implementer-fast`
- `imspeed-implementer-standard`
- `imspeed-implementer-deep`

Use the role selected by the current scope and the routing policy table.
Every dispatch must be explicitly qualified, for example:

```text
Implementer (imspeed-implementer-standard): "Implement Task N from brief and return status, files changed, and RED/GREEN evidence."
```

### 4. Require TDD evidence per task

Each task must include RED/GREEN evidence in the report:

- Failing focused test command and output before the implementation change.
- Passing focused test command and output after the implementation change.
- A brief self-review and assumptions.

### 5. Review gate and continuation

After each task implementation, generate a review package and dispatch:

- `imspeed-task-reviewer` (default)
- `imspeed-task-reviewer-deep` if the batch or diff is subtle or risky

Do not continue to next task until the task review verdict is clean for that task.

### 6. Human checkpoint

After each task or configured batch:

1. Append a ledger entry with status, commit, and review result.
2. Pause and ask the user: "Continue with next batch?"
3. Proceed only after explicit confirmation.

### 7. Final branch review

After all planned batches:

- Dispatch `imspeed-final-reviewer` or `imspeed-final-reviewer-deep`.
- Include the final review package.
- Require clean final review before completion.

## Blocking Rules

- If any Critical or Important finding is unresolved, block continuation.
- In case of unresolved Critical/Important findings, return status `needs-escalation` and wait for human decision.
- The coordinator must never force continuation while those findings are open.

## Escalation and Failure Handling

A transient tool failure may retry at the same tier once.
Reasoning failure, repeated test failure, expanded scope, explicit `needs-escalation`,
or unresolved Critical/Important findings require escalation to a stronger role or a
human decision according to the routing policy.

## Completion

When all tasks have clean task/final reviews and no blocking unresolved findings,
announce completion with the final commit range and a concise ledger summary.
