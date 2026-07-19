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

## Configure agent defaults

Launch the local configuration dashboard with:

```bash
npm run config:ui
```

Or, after loading the supplied shell alias, run `imspeed-config` from any
terminal. Open `http://127.0.0.1:62266`, select each role's model and reasoning
effort, then choose **Save & apply to Codex**. This updates the plugin defaults,
regenerates the profiles, and applies them to `$CODEX_HOME/agents` (or
`~/.codex/agents`). Start a new Codex thread before spawning agents to use the
new selections.

## Verify

```bash
npm test
```

## Release the local plugin

After changing IMSpeed, run one command from this source checkout:

```bash
npm run release:local
```

It validates the source, synchronizes it to the personal marketplace mirror at
`~/plugins/imspeed`, generates a new Codex cache-busted plugin version, and
reinstalls `imspeed@personal`. Start a new Codex task afterwards so it loads the
released version.

Use `IMSPEED_PLUGIN_MIRROR` and `IMSPEED_MARKETPLACE` only when releasing to a
different already-configured local marketplace.

Full performance qualification requires the controlled benchmark procedure in
`benchmarks/README.md` and explicit approval for the model-token spend.

Future updates are documented in `docs/imspeed/maintenance.md`.
