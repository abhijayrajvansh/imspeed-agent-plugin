# Local Agent Configuration UI Design

## Goal

Provide a localhost-only IMSpeed dashboard that lets the user change the model
and reasoning effort assigned to every named IMSpeed subagent role. Saving must
update the repository source of truth, regenerate the distributable agent
profiles, and apply those profiles to the user's installed Codex agent
directory.

## Scope

The dashboard manages the twelve existing `imspeed-*` agent profiles:

- exploration;
- ordinary and deep architecture;
- ordinary and deep planning;
- fast, standard, and deep implementation;
- ordinary and deep task review; and
- ordinary and deep final review.

The coordinator profile, agent descriptions, developer instructions, and
sandbox modes stay fixed. The user can edit only `model` and
`model_reasoning_effort`.

## Architecture

### Source of truth

`config/imspeed-agent-defaults.toml` will contain a named entry for every role,
including its fixed metadata and editable model and effort fields. The existing
agent definition module will load this configuration rather than hard-coding
the role matrix. `scripts/generate-agent-profiles.mjs` remains responsible for
rendering the individual `agents/imspeed-*.toml` files.

### Local application

`npm run config:ui` starts a dependency-free Node HTTP server bound to
`127.0.0.1`. It serves a compact HTML table with one row per agent role and two
select controls per row. The server exposes only local read and save endpoints;
it does not require authentication because it never listens on a network
interface.

### Save and apply flow

On save, the server:

1. validates every submitted role name, model, and reasoning effort against
   the supported allowlists;
2. writes the complete defaults TOML atomically;
3. regenerates the repository `agents/imspeed-*.toml` files;
4. replaces the matching installed files under `~/.codex/agents/` (or the
   configured Codex-home target); and
5. returns a success message naming the affected locations.

If validation, generation, or installation fails, the request returns an error
and does not report success. The UI explains that existing agent threads retain
their original model; fresh agent spawns in a new Codex thread load the applied
profiles.

## User experience

The page has a compact table, selected by the user during brainstorming. Each
row shows the work type, immutable agent profile name, model dropdown,
reasoning-effort dropdown, and fixed access mode. A single “Save & apply to
Codex” button submits all changes. Inline status messages distinguish saved,
applied, and failed states.

## Testing

Automated tests will cover parsing and validating the defaults file, rendering
profiles from it, rejecting unsupported or incomplete save payloads, persisting
valid updates, regenerating repository profiles, and applying them to a
temporary Codex-home directory. Existing plugin validation will verify the
generated files still match the configuration.

## Non-goals

- Changing a running agent's model or reasoning effort.
- Editing coordinator defaults from this dashboard.
- Editing developer instructions, permissions, or routing policy.
- Exposing the dashboard beyond localhost.
- Adding a frontend framework or external runtime dependencies.
