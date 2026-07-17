# Maintaining IMSpeed

## Locations

- Editable source of truth: `/Users/abhijayrajvansh/Desktop/imspeed`
- Personal marketplace release mirror: `/Users/abhijayrajvansh/plugins/imspeed`
- Personal marketplace manifest: `/Users/abhijayrajvansh/.agents/plugins/marketplace.json`
- Codex runtime cache: `/Users/abhijayrajvansh/.codex/plugins/cache/personal/imspeed`

Codex resolves the manifest's relative `source.path` from the personal
marketplace root `/Users/abhijayrajvansh`, not from the manifest's
`.agents/plugins` directory. Keep that path relative as `./plugins/imspeed`.

Do not hand-edit the marketplace manifest, runtime cache, marketplace config, or
installed copies in this repository.

## Update loop

1. Edit files in `/Users/abhijayrajvansh/Desktop/imspeed`.
2. Run `npm test` on the source checkout, then commit only when the change is
   verified.
3. Sync changes into the personal marketplace mirror while excluding:
   `.git`, `.worktrees`, and `.superpowers`.
4. In `plugin-creator` tooling, run:
   - `python3 scripts/update_plugin_cachebuster.py /Users/abhijayrajvansh/plugins/imspeed`
   - `python3 scripts/read_marketplace_name.py`
   - keep the marketplace source path relative as `./plugins/imspeed`.
5. Reinstall the plugin from the reported marketplace name:
   `codex plugin add imspeed@personal`
6. Open a new Codex thread so IMSpeed's updated skills and agent configuration are
   loaded.

The cachebuster helper updates only the `+codex.<token>` suffix. Do not edit
`marketplace.json`, installed plugin cache trees, or installed runtime config files
directly during routine updates.

## What to change for core behavior

- Role and model-effort mappings: `src/agent-definitions.mjs`
- Routing policy and escalation rules: `references/routing-policy.md`
- Workflow skill copy and role-specific behavior: `skills/` (including
  `skills/using-imspeed/` and references it uses)
- Benchmark definitions and instructions: `benchmarks/scenarios.json` and
  `benchmarks/README.md`
- Validation logic and static checks: `scripts/validate-plugin.mjs`,
  `tests/validate-plugin.test.mjs`, and other focused tests that reference these flows

## Installation notes

Do not mutate the main Desktop checkout, marketplace mirror, marketplace JSON file,
Codex cache, or installed config from this worker branch. Use this repository-side
workflow first, then apply those operations in the coordinator run.
