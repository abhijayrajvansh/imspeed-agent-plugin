# IMSpeed Routing Policy

This file is the single source of truth for IMSpeed role selection. Every
subagent dispatch names one `imspeed-*` profile explicitly. A dispatch must not silently inherit the coordinator model or reasoning effort.

## Role map

| Work | Start role | Escalated role |
|---|---|---|
| Focused repository exploration | `imspeed-explorer` | `imspeed-architect` when architectural judgment appears |
| Ordinary architecture | `imspeed-architect` | `imspeed-architect-deep` for high-risk unresolved decisions |
| Ordinary planning | `imspeed-planner` | `imspeed-planner-deep` for multi-system or migration-heavy plans |
| Complete one-to-two-file implementation | `imspeed-implementer-fast` | `imspeed-implementer-standard` |
| Multi-file integration or ordinary debugging | `imspeed-implementer-standard` | `imspeed-implementer-deep` |
| Task review | `imspeed-task-reviewer` | `imspeed-task-reviewer-deep` for subtle or high-risk diffs |
| Whole-branch review | `imspeed-final-reviewer` | `imspeed-final-reviewer-deep` for defined high-risk categories |

## Fast implementation criteria

Use `imspeed-implementer-fast` only when the approved plan is complete, work is
limited to one or two files, no cross-system contract or migration is involved,
existing patterns are clear, and focused tests are deterministic.

## Standard criteria

Use a standard role for multi-file work, pattern discovery, ordinary debugging,
shared state, public interfaces, or build configuration.

## Deep criteria

Use or escalate to a deep role for authentication, authorization, security,
payments, concurrency, destructive operations, data migration, broad
architecture, or a reasoning-related failure at the standard tier.

## Runtime escalation

A transient tool or infrastructure failure may retry once at the same tier. A
reasoning failure, repeated underlying test failure, expanded scope, explicit
`needs-escalation`, or Critical/Important finding requiring broader judgment
spawns a fresh next-tier agent. Allow a maximum of two tier escalations for one
task, then stop and present evidence to the user. Every new task is classified
independently at its lowest suitable tier.
