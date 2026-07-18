# IMSpeed Inline Execution Design

## Goal

Make IMSpeed's advertised inline execution mode functional while preserving
subagent-driven development as the recommended path.

## Behavior

`imspeed:executing-plans` executes an approved plan in the current session in
small batches. Each task still uses explicit `imspeed-*` roles, TDD evidence,
the existing `.superpowers/sdd` handoff artifacts, and task/final review gates.
After each task or configured batch, execution pauses for human confirmation.
Unresolved Critical or Important findings block continuation and require a
fresh review or user decision.

## Compatibility

The existing Luna/Terra/Sol role matrix and
`imspeed:subagent-driven-development` workflow remain unchanged. The new skill
is a local overlay because the upstream vendoring allowlist did not package
`executing-plans`; future vendoring must preserve this overlay.

## Validation

Manifest, validator, vendor-overlay, and routing tests require the skill to be
present, namespaced, connected to the routing and handoff contracts, and
advertised by `writing-plans` without legacy `superpowers:executing-plans`
references.
