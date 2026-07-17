# IMSpeed

IMSpeed is a Codex-only, model-routed fork of the Superpowers development
workflow. It keeps brainstorming, planning, worktrees, TDD, scoped review,
verification, and branch completion while assigning each substantive task to
a named agent with an explicit model and reasoning effort.

## Install role agents

```bash
bash scripts/install-agents.sh
```

Start Codex with the Sol-low coordinator profile:

```bash
codex --profile imspeed -C /path/to/project
```

Then ask: `Use IMSpeed to build this feature.` IMSpeed keeps Superpowers
installed separately and routes substantive work through explicit named agents.

## Verify

```bash
npm test
```

Full performance qualification requires the controlled benchmark procedure in
`benchmarks/README.md` and explicit approval for the model-token spend.

Future updates are documented in `docs/imspeed/maintenance.md`.
