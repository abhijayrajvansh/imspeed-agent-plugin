# Local Agent Configuration UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use imspeed:executing-plans (recommended, default) or imspeed:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a localhost-only dashboard that changes IMSpeed role model/effort defaults and immediately applies regenerated profiles to installed Codex agents.

**Architecture:** A canonical TOML config supplies values to the agent-definition and profile-generation pipeline. A dependency-free Node HTTP server renders a compact table and, after validation, atomically saves the source config, regenerates repository profiles, and replaces only installed `imspeed-*.toml` files.

**Tech Stack:** Node.js 20 built-ins, native `node:test`, HTML/CSS/browser JavaScript.

## Global Constraints

- Bind only to `127.0.0.1`; do not offer a host override.
- Add no dependencies or frontend framework.
- Preserve all twelve role names, descriptions, sandbox modes, and developer instructions.
- Only `model` and `model_reasoning_effort` are user-editable.
- Allow models `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`; allow efforts `low`, `medium`, `high`.
- Apply only `imspeed-*.toml` to `$CODEX_HOME/agents` or `~/.codex/agents`; never alter the coordinator on UI save.

## File Structure

- Create `config/imspeed-agent-defaults.toml`: the editable 12-role matrix.
- Create `src/agent-config.mjs`: narrow TOML parse/validate/serialize/atomic-write functions.
- Modify `src/agent-definitions.mjs`: fixed metadata joined with config-derived model/effort.
- Modify `scripts/generate-agent-profiles.mjs`: accepts explicit definitions while retaining its CLI.
- Create `src/agent-profile-install.mjs`: targeted installed-profile replacement.
- Create `src/config-ui-page.mjs`, `src/config-ui.mjs`, and `scripts/config-ui.mjs`: local dashboard and launcher.
- Create focused `node:test` suites for config, installation, and HTTP behavior.
- Modify validation, README, maintenance documentation, and package scripts.

### Task 1: Config source of truth and generated profiles

**Files:** Create `config/imspeed-agent-defaults.toml`, `src/agent-config.mjs`, `tests/agent-config.test.mjs`; modify `src/agent-definitions.mjs`, `scripts/generate-agent-profiles.mjs`, `tests/agents.test.mjs`.

**Interfaces:**

```js
export const SUPPORTED_MODELS = Object.freeze(["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"]);
export const SUPPORTED_REASONING_EFFORTS = Object.freeze(["low", "medium", "high"]);
export async function loadAgentDefaults(filePath);
export function validateAgentDefaults(value);
export function serializeAgentDefaults(definitions);
export async function writeAgentDefaultsAtomically(definitions, filePath);
export async function loadAgentDefinitions(configPath);
```

- [ ] Write a failing test that loads twelve defaults, checks the current explorer Luna/low matrix, and rejects duplicate roles and unsupported model/effort values.
- [ ] Run `node --test tests/agent-config.test.mjs`; expect module-not-found failure.
- [ ] Implement exactly twelve `[[agent]]` TOML entries with `name`, `model`, and `model_reasoning_effort`; keep immutable metadata in code. Parse only quoted scalar fields, reject unknown/missing/duplicate entries, serialize roles in fixed order, and atomically write using a same-directory temporary file plus `rename`.
- [ ] Make definitions load the config, retain `agentDefinitions` compatibility, and preserve result-contract text. Extend `generateAgentProfiles(outputDirectory = path.resolve("agents"), definitions = agentDefinitions)`.
- [ ] Run `node --test tests/agent-config.test.mjs tests/agents.test.mjs && npm run generate:agents`; expect PASS and no `agents/` diff.
- [ ] Commit with `git commit -m "feat: add editable agent defaults source"`.

### Task 2: Immediate targeted application to Codex

**Files:** Create `src/agent-profile-install.mjs`, `tests/agent-profile-install.test.mjs`.

**Interface:**

```js
export async function applyAgentProfiles({
  profileDirectory,
  codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"),
});
```

- [ ] Write failing temp-directory tests that verify all twelve profiles are replaced, `imspeed.config.toml` is untouched, non-IMSpeed files survive, and a missing source profile rejects before success.
- [ ] Run `node --test tests/agent-profile-install.test.mjs`; expect module-not-found failure.
- [ ] Implement creation of `<codexHome>/agents`, source completeness validation, copy-to-temp plus rename for each explicit `imspeed-*.toml` destination, and return of absolute destination plus sorted filenames.
- [ ] Run `node --test tests/agent-profile-install.test.mjs && bash tests/install-agents.test.sh`; expect PASS and unchanged legacy installer behavior.
- [ ] Commit with `git commit -m "feat: apply generated profiles to Codex home"`.

### Task 3: Localhost UI and save API

**Files:** Create `src/config-ui-page.mjs`, `src/config-ui.mjs`, `scripts/config-ui.mjs`, `tests/config-ui.test.mjs`; modify `package.json`.

**Interface and routes:**

```js
export function createConfigServer({ repositoryRoot, configPath, profileDirectory, codexHome });
// GET /api/config -> { agents, models, reasoningEfforts }
// POST /api/config -> { agents: [{ name, model, model_reasoning_effort }] }
```

- [ ] Write failing HTTP tests that assert all twelve roles and exact allowlists from `GET /api/config`; valid `POST` saves, regenerates, and applies; missing/duplicate/unknown values return 400 without changing config; invalid routes return 404; root HTML has every role and the fresh-thread warning.
- [ ] Run `node --test tests/config-ui.test.mjs`; expect module-not-found failure.
- [ ] Implement three routes only (`GET /`, `GET /api/config`, `POST /api/config`), 64 KiB JSON body cap, content types, exact payload keys, and server-side reconstruction of immutable metadata. After save: write config, load definitions, generate profiles, call `applyAgentProfiles`; never report applied on an error.
- [ ] Render one compact table row per role with description, profile name, model dropdown, effort dropdown, and fixed access mode. Disable save while posting and show status. Include: `Existing agent threads retain their initial model; fresh spawns in a new Codex thread use applied profiles.`
- [ ] Add `"config:ui": "node scripts/config-ui.mjs"`; bind with `server.listen(port, "127.0.0.1")`, default port `62266`, numeric port override only.
- [ ] Run `node --test tests/config-ui.test.mjs && npm run config:ui`; expect PASS and `http://127.0.0.1:62266` in startup output.
- [ ] Commit with `git commit -m "feat: add localhost agent configuration dashboard"`.

### Task 4: Plugin validation and documentation

**Files:** Modify `scripts/validate-plugin.mjs`, `tests/validate-plugin.test.mjs`, `README.md`, `docs/imspeed/maintenance.md`.

- [ ] Write a failing copied-fixture validator test: mutate the fixture defaults config and assert `validatePlugin(fixtureRoot)` rejects stale generated profiles from that fixture, rather than using checkout defaults.
- [ ] Run `node --test tests/validate-plugin.test.mjs`; expect failure under current hard-coded/default behavior.
- [ ] Load definitions from `targetRoot/config/imspeed-agent-defaults.toml` before rendering expected TOMLs. Document `npm run config:ui`, localhost scope, editable fields, source→generate→apply flow, `$CODEX_HOME`, and the fresh-thread limitation. Update maintenance to name config/UI as the model-effort source and retain its ban on manual cache/marketplace edits.
- [ ] Run `npm test && npm run generate:agents && npm run validate && git diff --check`; expect all checks PASS and exact profile/config agreement.
- [ ] Commit with `git commit -m "docs: document local agent config dashboard"`.

## Plan Self-Review

- Config source, generation, installed application, UI/API, validation, and operational documentation each have a dedicated testable task.
- Every accepted model, effort, route, payload shape, host, port, and installation target is explicit.
- The interfaces chain consistently: config → definitions → generated profiles → targeted installation → UI orchestration.
