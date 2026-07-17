# IMSpeed Handoff Contracts

## Task brief

Every dispatch contains:

1. Goal
2. Relevant design and global constraints
3. Exact task scope
4. Expected files
5. Required tests
6. Previous failure evidence, when present
7. Required output format

## Agent result

Every agent returns:

- Status: `complete`, `blocked`, or `needs-escalation`
- Files changed or inspected
- Exact test commands and RED/GREEN evidence when applicable
- Assumptions
- Risks or unresolved issues

## Progress ledger entry

Record task number, classification, selected role, escalation reason, commit,
test evidence, review verdict, and unresolved user decisions. Do not paste full
agent transcripts into the ledger.

## Review package

Task reviewers receive the task brief, scoped diff, implementer result, and
covering test evidence. Final reviewers receive the approved design, plan,
whole-branch diff package, and final verification evidence.
