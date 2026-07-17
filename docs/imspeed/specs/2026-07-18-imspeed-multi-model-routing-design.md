# IMSpeed Multi-Model Routing Design

**Date:** 2026-07-18
**Status:** Approved design

## Summary

IMSpeed is a separate personal Codex plugin derived from the Superpowers workflow. It keeps the design, planning, worktree, TDD, review, verification, and branch-completion discipline while reducing latency and token use through named role agents, explicit model assignments, compact handoffs, and bounded adaptive escalation.

The original Superpowers plugin remains installed and unchanged. IMSpeed uses its own plugin ID, skill namespace, agent names, configuration, and release lifecycle.

## Goals

- Preserve the end-to-end disciplined feature-development workflow.
- Run the main coordinator on `gpt-5.6-sol` with `low` reasoning effort.
- Delegate substantive analysis, planning, implementation, and review to named subagents.
- Start every task on the least expensive suitable role and escalate only on defined evidence.
- Prevent silent inheritance of the coordinator model by every subagent dispatch.
- Reduce repeated repository exploration, context reconstruction, and test execution.
- Achieve at least 50% lower median wall-clock time and 40% fewer tokens than unmodified Superpowers on the benchmark suite.
- Preserve functional correctness and finish with no unresolved Critical or Important review findings.

## Non-Goals

- Replacing or modifying the installed Superpowers plugin.
- Guaranteeing the performance target for every individual repository or feature.
- Using the cheapest model for work that has meaningful architectural or operational risk.
- Allowing recursive agent fan-out or unbounded correction loops.
- Silently substituting a different model when a configured model is unavailable.
- Running implementation tasks concurrently when they share files, state, or sequential dependencies.

## Identity and Isolation

| Item | Value |
|---|---|
| Plugin ID | `imspeed` |
| Display name | `IMSpeed` |
| Skill namespace | `imspeed:*` |
| Agent prefix | `imspeed-*` |
| Initial version | `0.1.0` |

IMSpeed is installed alongside Superpowers. It preserves all applicable upstream license notices and attribution. No IMSpeed setup or update operation may edit Superpowers files or its cached installation.

## Architecture

IMSpeed has four cooperating layers.

### Coordinator

The user-facing parent thread remains responsible for requirements, design approvals, task classification, agent dispatch, escalation, and final decisions. It runs with:

```toml
model = "gpt-5.6-sol"
model_reasoning_effort = "low"
```

IMSpeed provides a coordinator profile at `$CODEX_HOME/imspeed.config.toml`. Where a Codex surface cannot activate that profile automatically, the user selects Sol with low effort before starting the IMSpeed workflow. A skill must not claim that it changed the parent model when the harness does not support that operation.

### Named role agents

Role profiles are installed under `$CODEX_HOME/agents/`. Each profile declares a unique name, a narrow role description, developer instructions, model, reasoning effort, and appropriate permissions. Model and effort are always explicit; role agents never inherit those values from the coordinator.

### Skill router

IMSpeed workflow skills share one routing policy. The coordinator classifies work from concrete task signals and dispatches the corresponding named profile. Routing decisions and escalation reasons are recorded in a compact progress ledger.

### Escalation controller

Escalation creates a fresh agent at the next tier with a concise failure package. A running agent does not mutate its own model. A difficult task may escalate twice; after that, IMSpeed stops and asks the user for direction.

## Role and Model Matrix

| Role profile | Model and effort | Intended work |
|---|---|---|
| Coordinator profile | `gpt-5.6-sol` + `low` | User interaction, routing, cross-task context, approvals |
| `imspeed-explorer` | `gpt-5.6-luna` + `low` | Read-heavy repository exploration and focused fact gathering |
| `imspeed-architect` | `gpt-5.6-terra` + `high` | Design alternatives, architecture, risk analysis |
| `imspeed-architect-deep` | `gpt-5.6-sol` + `medium` | High-risk or unresolved architecture decisions |
| `imspeed-planner` | `gpt-5.6-terra` + `medium` | Detailed implementation plans from approved designs |
| `imspeed-planner-deep` | `gpt-5.6-terra` + `high` | Plans spanning multiple systems or complex migrations |
| `imspeed-implementer-fast` | `gpt-5.6-luna` + `medium` | Mechanical, well-specified work in one or two files |
| `imspeed-implementer-standard` | `gpt-5.6-terra` + `medium` | Multi-file integration and ordinary debugging |
| `imspeed-implementer-deep` | `gpt-5.6-sol` + `medium` | Difficult implementation and debugging requiring broad judgment |
| `imspeed-task-reviewer` | `gpt-5.6-terra` + `medium` | Combined task-scoped specification and quality review |
| `imspeed-task-reviewer-deep` | `gpt-5.6-terra` + `high` | Subtle, risky, or cross-cutting task review |
| `imspeed-final-reviewer` | `gpt-5.6-sol` + `medium` | Broad final branch audit |
| `imspeed-final-reviewer-deep` | `gpt-5.6-sol` + `high` | Final audit for security, concurrency, migrations, payments, or major architecture |

Worktree setup, deterministic verification commands, and branch-finishing choices remain coordinator operations. TDD is an implementer contract, not a separate agent dispatch.

## Task Classification

Every implementation task starts at the lowest tier justified by the plan.

### Fast

Use `imspeed-implementer-fast` when all of these are true:

- The approved plan gives complete behavior and acceptance criteria.
- Work is confined to one or two files.
- No cross-system contract or migration is involved.
- Existing patterns are clear.
- Tests are local and deterministic.

### Standard

Use `imspeed-implementer-standard` when any of these are true:

- The task coordinates multiple files or layers.
- Existing patterns must be discovered and matched.
- The task includes ordinary debugging or integration work.
- Public interfaces, shared state, or build configuration change.

### Deep

Use `imspeed-implementer-deep` when any of these are true:

- The work affects authentication, authorization, security, payments, concurrency, destructive operations, or data migrations.
- Correctness depends on broad architectural understanding.
- A standard agent has already failed for a reasoning-related cause.

One difficult task does not raise the default tier of later tasks. Each new task is classified independently.

## Escalation Policy

Escalation occurs when:

- The task expands beyond its planned files or boundaries.
- Architecture or requirements remain ambiguous after reading the task brief.
- The same underlying test failure survives one focused correction.
- A task reviewer reports Critical or Important findings that require broader judgment.
- A supposedly mechanical task reveals integration, migration, security, concurrency, or destructive-operation risk.
- The assigned agent explicitly reports `needs-escalation` with evidence.

A transient tool or infrastructure failure may retry once at the same tier. A reasoning failure dispatches a fresh next-tier role. After two unsuccessful escalations, IMSpeed stops and presents the evidence to the user.

## Feature Workflow

1. **Brainstorming:** The coordinator owns conversation and approval gates. For non-trivial features, it dispatches `imspeed-architect` to evaluate alternatives and risks. High-risk unresolved decisions escalate to `imspeed-architect-deep`.
2. **Isolation:** The coordinator creates or verifies an isolated git worktree and establishes a clean baseline.
3. **Planning:** `imspeed-planner` writes the implementation plan from the approved design. Multi-system plans may use `imspeed-planner-deep`. The coordinator checks the plan against the design.
4. **Classification:** The coordinator labels each plan task `fast`, `standard`, or `deep` before implementation starts.
5. **Implementation:** A fresh named implementer executes each task with RED-GREEN-REFACTOR TDD, runs focused tests, and commits the completed task.
6. **Task review:** One combined reviewer checks specification compliance and code quality against the task brief, scoped diff, and implementer evidence. It does not repeat tests unless a specific unresolved doubt requires it.
7. **Fix wave:** All Critical and Important findings from a review are sent together to one suitably tiered implementer. The fix agent reruns covering tests and returns updated evidence before re-review.
8. **Final review:** One final reviewer audits a prepared whole-branch review package. The deep final reviewer is reserved for defined high-risk categories.
9. **Completion:** The coordinator runs final verification and presents merge, pull request, keep, or discard options.

Read-only exploration may run in parallel when investigations are independent. Code-writing tasks run sequentially unless the plan explicitly proves their files, state, and dependencies are disjoint.

## Context and Handoff Contracts

Every dispatched agent receives a compact task brief instead of the entire parent conversation:

```text
Goal
Relevant design constraints
Exact task scope
Expected files
Required tests
Previous failure evidence, if any
Required output format
```

Every role agent returns:

```text
Status: complete | blocked | needs-escalation
Files changed or inspected
Tests and RED/GREEN evidence
Assumptions
Risks or unresolved issues
```

The coordinator maintains a small progress ledger containing task classification, selected role, escalation events, commit, test evidence, and review verdict. Reviewers receive prepared diff or branch-review packages so they do not repeat broad repository scans. Test results are reused when the code under review has not changed.

## Packaging and Setup

The plugin contains:

- `.codex-plugin/plugin.json`
- IMSpeed workflow skills under `skills/`
- Shared routing and handoff references
- Role-agent TOML templates
- An idempotent setup script or setup skill
- Routing behavior tests and benchmark scenarios
- Upstream license and attribution files

Setup performs these operations:

- Install IMSpeed without changing Superpowers.
- Install the coordinator profile and named role profiles.
- Refuse to overwrite conflicting files unless the user explicitly chooses replacement.
- Validate the plugin manifest, TOML syntax, unique role names, explicit model assignments, and required skill references.
- Configure or recommend `agents.max_depth = 1` and `agents.max_threads = 4` without silently overwriting unrelated user configuration.

If the harness exposes a model catalog, setup checks configured model availability. Otherwise, availability is validated on first dispatch and failures follow the fail-closed behavior below.

## Failure Behavior

- **Unavailable model:** Stop and identify the affected role profile; do not inherit the coordinator model.
- **Missing role profile:** Stop and show the required IMSpeed setup action.
- **Transient tool failure:** Retry once at the same tier.
- **Reasoning or implementation failure:** Escalate to the next role tier with evidence.
- **Two unsuccessful escalations:** Return control to the user.
- **Critical or Important review finding:** Block task completion until fixed and re-reviewed.
- **Conflicting design or plan:** Ask the user which requirement governs before dispatching contradictory work.
- **Benchmark target missed:** Keep the plugin usable but mark the release performance-unqualified until routing is tuned.

## Validation Strategy

### Static validation

- Validate the plugin manifest and all agent TOML files.
- Assert every role has an explicit model and reasoning effort.
- Assert every skill reference resolves.
- Assert IMSpeed paths and identifiers do not overwrite or collide with Superpowers.

### Routing behavior tests

- Mechanical one-file task selects the fast implementer.
- Multi-file integration selects the standard implementer.
- Security, concurrency, migration, payment, or destructive work selects the deep implementer and deep final reviewer.
- A transient tool failure retries once without escalating.
- A repeated reasoning or test failure escalates exactly one tier.
- Two failed escalations stop and return evidence to the user.
- Every subagent dispatch names an IMSpeed role explicitly.

### Workflow tests

- Preserve brainstorming and design approval gates.
- Create and verify an isolated worktree.
- Produce a plan consistent with the approved design.
- Capture TDD RED and GREEN evidence.
- Combine task specification and quality review into one scoped reviewer.
- Reuse unchanged test evidence instead of rerunning suites.
- Run final branch verification before claiming completion.

### Performance benchmark

Compare IMSpeed `0.1.0` with unmodified Superpowers `6.1.1` using the same repository state, prompts, test environment, and permissions. The benchmark set contains representative small, medium, and integration-heavy web-development features. Run each scenario at least three times per plugin and compare medians.

Collect:

- End-to-end wall-clock time
- Total input and output tokens
- Agent dispatch count
- Tool-call count
- Test pass rate
- Review findings by severity
- Number and cause of escalations

The initial release is performance-qualified only when the complete benchmark set meets all of these criteria:

```text
Median wall-clock reduction: at least 50%
Total token reduction:       at least 40%
Functional test regression:  none
Unresolved Critical issues:  zero
Unresolved Important issues: zero
```

Performance targets are release goals, not promises for every individual feature.

## Compatibility and Evolution

IMSpeed initially targets Codex surfaces that support custom subagent profiles with explicit `model` and `model_reasoning_effort`. Harness-specific adapters may be added later, but the first release will not weaken routing guarantees for unsupported harnesses.

The shared routing policy is the single source of truth for role selection. Model assignments can evolve from benchmark evidence without rewriting every workflow skill. Any future model change must preserve explicit dispatch, bounded escalation, and the quality gates defined here.
