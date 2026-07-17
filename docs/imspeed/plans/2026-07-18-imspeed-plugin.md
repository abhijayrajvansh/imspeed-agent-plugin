# IMSpeed Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use imspeed:subagent-driven-development (recommended) or imspeed:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and install a Codex-only IMSpeed personal plugin that preserves the Superpowers development workflow while routing each substantive task to an explicitly model-pinned role agent with bounded adaptive escalation.

**Architecture:** IMSpeed vendors the relevant Superpowers 6.1.1 skills into its own `imspeed:*` namespace, adds one shared routing policy and compact handoff contract, and installs named Codex agent profiles under `$CODEX_HOME/agents`. The Sol-low parent coordinator chooses roles; agents never inherit the parent model because every role profile pins `model` and `model_reasoning_effort`. Static tests enforce the plugin identity and dispatch rules, while a benchmark harness compares IMSpeed with unmodified Superpowers.

**Tech Stack:** Codex plugin JSON, Markdown skills, TOML custom-agent profiles, Node.js 20+ validation/generation scripts, POSIX shell installer, Node built-in test runner, git.

## Global Constraints

- Plugin ID is exactly `imspeed`; display name is exactly `IMSpeed`; skill namespace is exactly `imspeed:*`; agent names start with `imspeed-`.
- IMSpeed is a separate plugin and must not modify the installed Superpowers plugin or its cache.
- Preserve the applicable MIT license and upstream attribution to Superpowers and Jesse Vincent.
- The coordinator profile pins `gpt-5.6-sol` with `low` reasoning effort.
- Every subagent profile explicitly pins both `model` and `model_reasoning_effort`; silent inheritance is forbidden.
- Task escalation is bounded to two tier increases; a transient tool failure may retry once at the same tier.
- `agents.max_depth = 1` and `agents.max_threads = 4` live in the IMSpeed coordinator profile, not the user's base config.
- Read-only exploration can run in parallel; code-writing tasks run sequentially unless the plan proves their files, state, and dependencies are disjoint.
- TDD, combined task-scoped review, final branch review, verification, and branch-completion choices remain mandatory.
- Performance qualification requires at least 50% lower median wall-clock time, at least 40% fewer tokens, no functional regression, and zero unresolved Critical or Important findings across the benchmark set.
- Exact Luna, Terra, and Sol model availability is account-dependent. An unavailable configured model must fail clearly instead of falling back silently.
- Initial release targets Codex custom-agent surfaces only; do not add Claude, Cursor, Pi, Kimi, Antigravity, or OpenCode packaging.

---

## File Structure

### Plugin identity and documentation

- `.codex-plugin/plugin.json`: Codex plugin identity and skill discovery.
- `package.json`: Node version and test/generation commands.
- `README.md`: installation, activation, model map, and limitations.
- `docs/imspeed/maintenance.md`: source-of-truth paths and the exact future edit, sync, cachebuster, reinstall, and new-thread workflow.
- `LICENSE`: upstream MIT license text copied unchanged.
- `NOTICE.md`: fork attribution and local modifications.

### Vendored workflow

- `skills/*`: Codex-relevant Superpowers workflow skills transformed to the `imspeed:*` namespace.
- `skills/using-imspeed/SKILL.md`: explicit IMSpeed entry point; no global session-start hook.
- `references/routing-policy.md`: single source of truth for role selection and escalation.
- `references/handoff-contracts.md`: task brief, agent result, progress ledger, and review package schemas.
- `scripts/vendor-superpowers-skills.mjs`: deterministic Superpowers 6.1.1 skill copier and namespace transformer.

### Agent configuration

- `src/agent-definitions.mjs`: canonical role, model, effort, sandbox, and instructions data.
- `scripts/generate-agent-profiles.mjs`: generates committed TOML files from agent definitions.
- `agents/*.toml`: generated custom-agent profiles installed into `$CODEX_HOME/agents`.
- `config/imspeed.config.toml`: Sol-low coordinator profile with bounded agent concurrency.
- `scripts/install-agents.sh`: idempotent installer with collision detection and explicit `--force` replacement.

### Validation and performance

- `scripts/validate-plugin.mjs`: validates manifest, skill namespace, role profiles, references, and generated-file freshness.
- `tests/manifest.test.mjs`: plugin identity and attribution tests.
- `tests/agents.test.mjs`: role/model/effort and generated-profile tests.
- `tests/routing.test.mjs`: required routing and escalation language tests.
- `tests/install-agents.test.sh`: clean install, idempotency, collision, and force tests.
- `tests/vendor-skills.test.mjs`: namespace transformation test.
- `tests/run-tests.sh`: one entry point for all automated tests.
- `benchmarks/scenarios.json`: small, medium, and integration-heavy benchmark definitions.
- `scripts/summarize-benchmark.mjs`: calculates median time/token deltas and qualification status from JSONL run records.
- `benchmarks/README.md`: reproducible benchmark procedure.

---

### Task 1: Create the Codex-only plugin identity

**Files:**
- Create: `.codex-plugin/plugin.json`
- Create: `package.json`
- Create: `README.md`
- Create: `LICENSE`
- Create: `NOTICE.md`
- Create: `tests/manifest.test.mjs`

**Interfaces:**
- Consumes: approved design at `docs/imspeed/specs/2026-07-18-imspeed-multi-model-routing-design.md`.
- Produces: plugin name `imspeed`, version `0.1.0`, skill root `./skills/`, and Node test command `npm test`.

- [ ] **Step 1: Write the failing manifest test**

Create `tests/manifest.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

test("manifest identifies the standalone IMSpeed plugin", async () => {
  const manifest = await readJson(new URL("../.codex-plugin/plugin.json", import.meta.url));
  assert.equal(manifest.name, "imspeed");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.interface.displayName, "IMSpeed");
  assert.match(manifest.description, /model-routed/i);
  assert.doesNotMatch(JSON.stringify(manifest), /superpowers-small|app-icon\.png/);
});

test("fork attribution is present", async () => {
  const notice = await readFile(new URL("../NOTICE.md", import.meta.url), "utf8");
  assert.match(notice, /Superpowers 6\.1\.1/);
  assert.match(notice, /Jesse Vincent/);
  assert.match(notice, /MIT/);
});
```

- [ ] **Step 2: Run the test and confirm the missing-manifest failure**

Run: `node --test tests/manifest.test.mjs`

Expected: FAIL with `ENOENT` for `.codex-plugin/plugin.json`.

- [ ] **Step 3: Create the plugin manifest and package metadata**

Create `.codex-plugin/plugin.json`:

```json
{
  "name": "imspeed",
  "version": "0.1.0",
  "description": "A model-routed software development workflow with planning, TDD, adaptive subagents, review, and delivery gates.",
  "author": {
    "name": "Abhijay Rajvansh"
  },
  "license": "MIT",
  "keywords": [
    "multi-agent",
    "model-routing",
    "planning",
    "tdd",
    "code-review",
    "workflow"
  ],
  "skills": "./skills/",
  "interface": {
    "displayName": "IMSpeed",
    "shortDescription": "Fast model-routed planning, coding, testing, and review",
    "longDescription": "Use IMSpeed to route architecture, planning, implementation, debugging, and review to named Codex agents with explicit models, reasoning efforts, and bounded escalation.",
    "developerName": "Abhijay Rajvansh",
    "category": "Developer Tools",
    "capabilities": ["Interactive", "Read", "Write"],
    "defaultPrompt": [
      "Use IMSpeed to build this feature.",
      "Run the IMSpeed workflow for this change."
    ],
    "brandColor": "#0B6E4F",
    "screenshots": []
  }
}
```

Create `package.json`:

```json
{
  "name": "imspeed",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "generate:agents": "node scripts/generate-agent-profiles.mjs",
    "validate": "node scripts/validate-plugin.mjs",
    "test": "bash tests/run-tests.sh"
  }
}
```

- [ ] **Step 4: Add attribution and initial README**

Copy the upstream license without editing it:

```bash
cp /Users/abhijayrajvansh/.codex/plugins/cache/personal/superpowers/6.1.1/LICENSE LICENSE
```

Create `NOTICE.md`:

```markdown
# Attribution

IMSpeed is derived from Superpowers 6.1.1 by Jesse Vincent and contributors.
Superpowers is distributed under the MIT License; the unchanged upstream
license is included in `LICENSE`.

IMSpeed's model routing, Codex role-agent profiles, bounded escalation,
installation tooling, validation, and benchmark harness are local additions.
IMSpeed is an independent fork and is not endorsed by the upstream project.
```

Create `README.md` with these exact initial sections:

```markdown
# IMSpeed

IMSpeed is a Codex-only, model-routed fork of the Superpowers development
workflow. It keeps brainstorming, planning, worktrees, TDD, scoped review,
verification, and branch completion while assigning each substantive task to
a named agent with an explicit model and reasoning effort.

## Status

Version 0.1.0 is under implementation. See the approved design in
`docs/imspeed/specs/2026-07-18-imspeed-multi-model-routing-design.md`.

## Compatibility

IMSpeed requires a Codex surface that supports custom agents with `model` and
`model_reasoning_effort`. Exact model availability depends on the user's
account. Superpowers remains a separate, unchanged plugin.
```

- [ ] **Step 5: Run the manifest test**

Run: `node --test tests/manifest.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 6: Commit the plugin identity**

```bash
git add .codex-plugin/plugin.json package.json README.md LICENSE NOTICE.md tests/manifest.test.mjs
git commit -m "feat: scaffold IMSpeed plugin identity"
```

---

### Task 2: Vendor and namespace the workflow skills

**Files:**
- Create: `scripts/vendor-superpowers-skills.mjs`
- Create: `tests/vendor-skills.test.mjs`
- Create: `skills/brainstorming/**`
- Create: `skills/dispatching-parallel-agents/**`
- Create: `skills/finishing-a-development-branch/**`
- Create: `skills/receiving-code-review/**`
- Create: `skills/requesting-code-review/**`
- Create: `skills/subagent-driven-development/**`
- Create: `skills/systematic-debugging/**`
- Create: `skills/test-driven-development/**`
- Create: `skills/using-git-worktrees/**`
- Create: `skills/using-imspeed/**`
- Create: `skills/verification-before-completion/**`
- Create: `skills/writing-plans/**`

**Interfaces:**
- Consumes: `vendorSkills(sourceRoot, destinationRoot)` with a Superpowers 6.1.1 root.
- Produces: a Codex-only `skills/` tree whose internal skill references use `imspeed:*` and whose entry skill is `using-imspeed`.

- [ ] **Step 1: Write the failing vendor transformation test**

Create `tests/vendor-skills.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { vendorSkills } from "../scripts/vendor-superpowers-skills.mjs";

test("vendorSkills renames the entry skill and namespace", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "imspeed-vendor-"));
  const source = path.join(root, "source");
  const destination = path.join(root, "destination");
  await mkdir(path.join(source, "skills", "using-superpowers"), { recursive: true });
  await mkdir(path.join(source, "skills", "brainstorming"), { recursive: true });
  await writeFile(
    path.join(source, "skills", "using-superpowers", "SKILL.md"),
    "name: using-superpowers\nUse superpowers:brainstorming and docs/superpowers/specs.\n",
  );
  await writeFile(
    path.join(source, "skills", "brainstorming", "SKILL.md"),
    "name: brainstorming\nSuperpowers uses superpowers:writing-plans.\n",
  );

  await vendorSkills(source, destination, ["using-superpowers", "brainstorming"]);

  const entry = await readFile(path.join(destination, "using-imspeed", "SKILL.md"), "utf8");
  const brainstorm = await readFile(path.join(destination, "brainstorming", "SKILL.md"), "utf8");
  assert.match(entry, /name: using-imspeed/);
  assert.match(entry, /imspeed:brainstorming/);
  assert.match(entry, /docs\/imspeed\/specs/);
  assert.match(brainstorm, /IMSpeed uses imspeed:writing-plans/);
  assert.doesNotMatch(entry + brainstorm, /superpowers:/);
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `node --test tests/vendor-skills.test.mjs`

Expected: FAIL because `scripts/vendor-superpowers-skills.mjs` does not exist.

- [ ] **Step 3: Implement the deterministic vendor script**

Create `scripts/vendor-superpowers-skills.mjs`:

```javascript
import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SKILLS = [
  "brainstorming",
  "dispatching-parallel-agents",
  "finishing-a-development-branch",
  "receiving-code-review",
  "requesting-code-review",
  "subagent-driven-development",
  "systematic-debugging",
  "test-driven-development",
  "using-git-worktrees",
  "using-superpowers",
  "verification-before-completion",
  "writing-plans",
];

const transform = (text) => text
  .replaceAll("superpowers:", "imspeed:")
  .replaceAll("docs/superpowers", "docs/imspeed")
  .replaceAll("using-superpowers", "using-imspeed")
  .replaceAll("Superpowers", "IMSpeed")
  .replaceAll("superpowers", "IMSpeed");

const transformTree = async (directory) => {
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await transformTree(target);
    } else if (/\.(md|txt|yaml|yml|json|js|mjs|ts|sh)$/.test(entry.name)) {
      const original = await readFile(target, "utf8");
      await writeFile(target, transform(original));
    }
  }
};

export async function vendorSkills(sourceRoot, destinationRoot, skills = DEFAULT_SKILLS) {
  await mkdir(destinationRoot, { recursive: true });
  for (const skill of skills) {
    const source = path.join(sourceRoot, "skills", skill);
    const destinationName = skill === "using-superpowers" ? "using-imspeed" : skill;
    const destination = path.join(destinationRoot, destinationName);
    await cp(source, destination, { recursive: true, force: true });
    await transformTree(destination);
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const sourceRoot = process.argv[2];
  if (!sourceRoot) {
    console.error("Usage: node scripts/vendor-superpowers-skills.mjs <superpowers-root>");
    process.exit(2);
  }
  await vendorSkills(sourceRoot, path.resolve("skills"));
}
```

- [ ] **Step 4: Run the vendor test**

Run: `node --test tests/vendor-skills.test.mjs`

Expected: 1 test PASS.

- [ ] **Step 5: Vendor Superpowers 6.1.1 skills**

Run:

```bash
node scripts/vendor-superpowers-skills.mjs /Users/abhijayrajvansh/.codex/plugins/cache/personal/superpowers/6.1.1
```

Expected: the twelve allowlisted directories exist under `skills/`, including `skills/using-imspeed/`, and no `skills/using-superpowers/` directory exists.

- [ ] **Step 6: Remove non-Codex platform routing from the IMSpeed entry skill**

In `skills/using-imspeed/SKILL.md`, replace the platform adaptation section with:

```markdown
## Platform

IMSpeed 0.1.0 supports Codex custom-agent surfaces only. Read
`references/codex-tools.md` for Codex tool mappings. If named custom agents or
explicit model and effort fields are unavailable, stop and explain that this
harness cannot preserve IMSpeed's routing guarantees.
```

Change the description to:

```yaml
description: Use when the user explicitly asks to use IMSpeed or starts an IMSpeed feature workflow; establishes mandatory IMSpeed skill routing before any implementation action
```

Do not add a session-start hook. Superpowers can remain globally installed without competing bootstrap instructions.

- [ ] **Step 7: Commit the vendored workflow**

```bash
git add scripts/vendor-superpowers-skills.mjs tests/vendor-skills.test.mjs skills
git commit -m "feat: vendor IMSpeed workflow skills"
```

---

### Task 3: Define and generate model-pinned role agents

**Files:**
- Create: `src/agent-definitions.mjs`
- Create: `scripts/generate-agent-profiles.mjs`
- Create: `agents/*.toml`
- Create: `config/imspeed.config.toml`
- Create: `tests/agents.test.mjs`

**Interfaces:**
- Consumes: exported `agentDefinitions` array.
- Produces: `renderAgentToml(definition) -> string`, twelve deterministic role TOML files, and coordinator profile `config/imspeed.config.toml`.

- [ ] **Step 1: Write failing tests for the exact role matrix**

Create `tests/agents.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { agentDefinitions } from "../src/agent-definitions.mjs";
import { renderAgentToml } from "../scripts/generate-agent-profiles.mjs";

const expected = new Map([
  ["imspeed-explorer", ["gpt-5.6-luna", "low"]],
  ["imspeed-architect", ["gpt-5.6-terra", "high"]],
  ["imspeed-architect-deep", ["gpt-5.6-sol", "medium"]],
  ["imspeed-planner", ["gpt-5.6-terra", "medium"]],
  ["imspeed-planner-deep", ["gpt-5.6-terra", "high"]],
  ["imspeed-implementer-fast", ["gpt-5.6-luna", "medium"]],
  ["imspeed-implementer-standard", ["gpt-5.6-terra", "medium"]],
  ["imspeed-implementer-deep", ["gpt-5.6-sol", "medium"]],
  ["imspeed-task-reviewer", ["gpt-5.6-terra", "medium"]],
  ["imspeed-task-reviewer-deep", ["gpt-5.6-terra", "high"]],
  ["imspeed-final-reviewer", ["gpt-5.6-sol", "medium"]],
  ["imspeed-final-reviewer-deep", ["gpt-5.6-sol", "high"]],
]);

test("definitions implement the approved role matrix", () => {
  assert.equal(agentDefinitions.length, expected.size);
  for (const definition of agentDefinitions) {
    assert.deepEqual([definition.model, definition.effort], expected.get(definition.name));
    assert.match(definition.name, /^imspeed-/);
    assert.ok(definition.instructions.length >= 80);
  }
});

test("rendered profiles pin model, effort, and sandbox", () => {
  for (const definition of agentDefinitions) {
    const toml = renderAgentToml(definition);
    assert.match(toml, new RegExp(`name = "${definition.name}"`));
    assert.match(toml, new RegExp(`model = "${definition.model.replaceAll(".", "\\.")}"`));
    assert.match(toml, new RegExp(`model_reasoning_effort = "${definition.effort}"`));
    assert.match(toml, /sandbox_mode = "(?:read-only|workspace-write)"/);
  }
});

test("coordinator profile pins Sol low and bounded fan-out", async () => {
  const profile = await readFile(new URL("../config/imspeed.config.toml", import.meta.url), "utf8");
  assert.match(profile, /model = "gpt-5\.6-sol"/);
  assert.match(profile, /model_reasoning_effort = "low"/);
  assert.match(profile, /max_threads = 4/);
  assert.match(profile, /max_depth = 1/);
});
```

- [ ] **Step 2: Run the tests and confirm missing-module failures**

Run: `node --test tests/agents.test.mjs`

Expected: FAIL because the definitions and generator do not exist.

- [ ] **Step 3: Implement canonical agent definitions**

Create `src/agent-definitions.mjs` with the exact matrix below. Use the shared instruction fragments to keep behavior consistent:

```javascript
const resultContract = `Return Status: complete | blocked | needs-escalation; files changed or inspected; tests and RED/GREEN evidence when applicable; assumptions; risks and unresolved issues. Do not spawn child agents.`;
const readOnly = "Do not modify the worktree, index, HEAD, branch, or user configuration.";
const tdd = "Follow imspeed:test-driven-development. Write and observe a failing test before implementation, make the smallest passing change, refactor only while green, and report exact commands and results.";

const define = (name, description, model, effort, sandbox, instructions) => ({
  name, description, model, effort, sandbox, instructions: `${instructions} ${resultContract}`,
});

export const agentDefinitions = [
  define("imspeed-explorer", "Fast read-heavy repository exploration", "gpt-5.6-luna", "low", "read-only", `Inspect only the requested scope, cite exact files and symbols, and return distilled facts instead of raw logs. ${readOnly}`),
  define("imspeed-architect", "Architecture alternatives and risk analysis", "gpt-5.6-terra", "high", "read-only", `Evaluate requirements, boundaries, alternatives, data flow, failure modes, and test strategy. Do not implement. ${readOnly}`),
  define("imspeed-architect-deep", "High-risk architecture analysis", "gpt-5.6-sol", "medium", "read-only", `Resolve architecture decisions involving security, concurrency, migrations, destructive operations, payments, or broad system coupling. Do not implement. ${readOnly}`),
  define("imspeed-planner", "Detailed implementation planning", "gpt-5.6-terra", "medium", "read-only", `Convert an approved design into exact bite-sized TDD tasks with paths, interfaces, commands, expected results, and commits. Do not implement. ${readOnly}`),
  define("imspeed-planner-deep", "Complex cross-system implementation planning", "gpt-5.6-terra", "high", "read-only", `Plan multi-system or migration-heavy work, preserving all global constraints and explicit dependency order. Do not implement. ${readOnly}`),
  define("imspeed-implementer-fast", "Mechanical implementation from a complete plan", "gpt-5.6-luna", "medium", "workspace-write", `Implement only a complete one-to-two-file task with clear existing patterns. Stop with needs-escalation if integration or architecture judgment appears. ${tdd}`),
  define("imspeed-implementer-standard", "Multi-file integration and ordinary debugging", "gpt-5.6-terra", "medium", "workspace-write", `Implement the assigned multi-file task and preserve repository conventions. Use systematic debugging for unexpected behavior. ${tdd}`),
  define("imspeed-implementer-deep", "Difficult or high-risk implementation", "gpt-5.6-sol", "medium", "workspace-write", `Implement high-risk or repeatedly blocked work with explicit reasoning about security, migrations, concurrency, destructive behavior, and compatibility. ${tdd}`),
  define("imspeed-task-reviewer", "Combined task specification and quality review", "gpt-5.6-terra", "medium", "read-only", `Review only the task brief, scoped diff, and supplied test evidence. Report separate specification and quality verdicts with Critical, Important, and Minor findings. ${readOnly}`),
  define("imspeed-task-reviewer-deep", "Subtle or high-risk task review", "gpt-5.6-terra", "high", "read-only", `Perform a task-scoped review for subtle contracts, security, concurrency, migrations, or cross-cutting behavior. Do not broaden into final branch review. ${readOnly}`),
  define("imspeed-final-reviewer", "Broad whole-branch audit", "gpt-5.6-sol", "medium", "read-only", `Review the prepared whole-branch package against the approved design and plan. Report findings by severity and state whether the branch is ready to finish. ${readOnly}`),
  define("imspeed-final-reviewer-deep", "High-risk whole-branch audit", "gpt-5.6-sol", "high", "read-only", `Audit security, concurrency, migrations, payments, destructive behavior, and major architecture using the prepared branch package. ${readOnly}`),
];
```

- [ ] **Step 4: Implement deterministic TOML generation**

Create `scripts/generate-agent-profiles.mjs`:

```javascript
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agentDefinitions } from "../src/agent-definitions.mjs";

const quote = (value) => JSON.stringify(value);

export const renderAgentToml = (definition) => [
  `name = ${quote(definition.name)}`,
  `description = ${quote(definition.description)}`,
  `model = ${quote(definition.model)}`,
  `model_reasoning_effort = ${quote(definition.effort)}`,
  `sandbox_mode = ${quote(definition.sandbox)}`,
  `developer_instructions = ${quote(definition.instructions)}`,
  "",
].join("\n");

export async function generateAgentProfiles(outputDirectory = path.resolve("agents")) {
  await mkdir(outputDirectory, { recursive: true });
  for (const definition of agentDefinitions) {
    await writeFile(path.join(outputDirectory, `${definition.name}.toml`), renderAgentToml(definition));
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) await generateAgentProfiles();
```

Create `config/imspeed.config.toml`:

```toml
model = "gpt-5.6-sol"
model_reasoning_effort = "low"

[agents]
max_threads = 4
max_depth = 1
```

- [ ] **Step 5: Generate profiles and run tests**

Run:

```bash
npm run generate:agents
node --test tests/agents.test.mjs
```

Expected: twelve TOML files are created and 3 tests PASS.

- [ ] **Step 6: Commit agent definitions and profiles**

```bash
git add src/agent-definitions.mjs scripts/generate-agent-profiles.mjs agents config/imspeed.config.toml tests/agents.test.mjs
git commit -m "feat: add model-pinned IMSpeed role agents"
```

---

### Task 4: Add the shared router and handoff contracts

**Files:**
- Create: `references/routing-policy.md`
- Create: `references/handoff-contracts.md`
- Create: `tests/routing.test.mjs`

**Interfaces:**
- Consumes: exact role names from `src/agent-definitions.mjs`.
- Produces: one routing table used by all IMSpeed workflow skills and exact textual contracts for task briefs, results, progress entries, and escalation packages.

- [ ] **Step 1: Write failing routing-policy tests**

Create `tests/routing.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { agentDefinitions } from "../src/agent-definitions.mjs";

test("routing policy names every configured role", async () => {
  const policy = await readFile(new URL("../references/routing-policy.md", import.meta.url), "utf8");
  for (const definition of agentDefinitions) assert.match(policy, new RegExp(`\\b${definition.name}\\b`));
});

test("routing policy defines bounded adaptive escalation", async () => {
  const policy = await readFile(new URL("../references/routing-policy.md", import.meta.url), "utf8");
  assert.match(policy, /retry once at the same tier/i);
  assert.match(policy, /maximum of two tier escalations/i);
  assert.match(policy, /must not silently inherit/i);
  assert.match(policy, /authentication|authorization/);
  assert.match(policy, /concurrency/);
  assert.match(policy, /migration/);
});

test("handoff contracts include required evidence", async () => {
  const contracts = await readFile(new URL("../references/handoff-contracts.md", import.meta.url), "utf8");
  for (const field of ["Goal", "Exact task scope", "Required tests", "Status", "Files changed or inspected", "RED/GREEN evidence", "Risks or unresolved issues"]) {
    assert.match(contracts, new RegExp(field.replace("/", "\\/"), "i"));
  }
});
```

- [ ] **Step 2: Run the tests and confirm missing-file failures**

Run: `node --test tests/routing.test.mjs`

Expected: FAIL with `ENOENT` for `references/routing-policy.md`.

- [ ] **Step 3: Write the routing policy**

Create `references/routing-policy.md` with these required sections and exact decisions:

```markdown
# IMSpeed Routing Policy

This file is the single source of truth for IMSpeed role selection. Every
subagent dispatch names one `imspeed-*` profile explicitly. A dispatch must not
silently inherit the coordinator model or reasoning effort.

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
```

- [ ] **Step 4: Write the handoff contracts**

Create `references/handoff-contracts.md`:

```markdown
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
```

- [ ] **Step 5: Run routing tests**

Run: `node --test tests/routing.test.mjs`

Expected: 3 tests PASS.

- [ ] **Step 6: Commit routing contracts**

```bash
git add references tests/routing.test.mjs
git commit -m "feat: define adaptive IMSpeed routing policy"
```

---

### Task 5: Install profiles safely and idempotently

**Files:**
- Create: `scripts/install-agents.sh`
- Create: `tests/install-agents.test.sh`

**Interfaces:**
- Consumes: `--codex-home PATH` and optional `--force`.
- Produces: copied `agents/imspeed-*.toml` files and `imspeed.config.toml` under the selected Codex home; exit 0 on clean/idempotent install and exit 3 on a conflicting destination.

- [ ] **Step 1: Write the failing installer behavior test**

Create `tests/install-agents.test.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
test_root="$(mktemp -d)"
trap 'rm -rf "$test_root"' EXIT

bash "$repo_root/scripts/install-agents.sh" --codex-home "$test_root"
test -f "$test_root/agents/imspeed-explorer.toml"
test -f "$test_root/agents/imspeed-final-reviewer-deep.toml"
test -f "$test_root/imspeed.config.toml"

bash "$repo_root/scripts/install-agents.sh" --codex-home "$test_root"

printf '%s\n' 'conflicting content' > "$test_root/agents/imspeed-explorer.toml"
if bash "$repo_root/scripts/install-agents.sh" --codex-home "$test_root"; then
  echo "expected conflicting install to fail" >&2
  exit 1
else
  test "$?" -eq 3
fi

bash "$repo_root/scripts/install-agents.sh" --codex-home "$test_root" --force
cmp "$repo_root/agents/imspeed-explorer.toml" "$test_root/agents/imspeed-explorer.toml"
```

- [ ] **Step 2: Run the test and confirm the missing-script failure**

Run: `bash tests/install-agents.test.sh`

Expected: FAIL because `scripts/install-agents.sh` does not exist.

- [ ] **Step 3: Implement the installer**

Create `scripts/install-agents.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
codex_root="${CODEX_HOME:-$HOME/.codex}"
force=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --codex-home)
      codex_root="$2"
      shift 2
      ;;
    --force)
      force=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

install_file() {
  source_file="$1"
  destination_file="$2"
  mkdir -p "$(dirname "$destination_file")"
  if [ -e "$destination_file" ] && ! cmp -s "$source_file" "$destination_file"; then
    if [ "$force" -ne 1 ]; then
      echo "Conflict: $destination_file differs; rerun with --force to replace it" >&2
      exit 3
    fi
  fi
  cp "$source_file" "$destination_file"
}

for source_file in "$repo_root"/agents/imspeed-*.toml; do
  install_file "$source_file" "$codex_root/agents/$(basename "$source_file")"
done
install_file "$repo_root/config/imspeed.config.toml" "$codex_root/imspeed.config.toml"

echo "Installed IMSpeed agents and coordinator profile in $codex_root"
```

- [ ] **Step 4: Run the installer test**

Run: `bash tests/install-agents.test.sh`

Expected: PASS and the deliberate conflict exits with status 3 before `--force` succeeds.

- [ ] **Step 5: Commit installer behavior**

```bash
git add scripts/install-agents.sh tests/install-agents.test.sh
git commit -m "feat: install IMSpeed agents safely"
```

---

### Task 6: Wire role routing into the IMSpeed workflow skills

**Files:**
- Modify: `skills/using-imspeed/SKILL.md`
- Modify: `skills/brainstorming/SKILL.md`
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/dispatching-parallel-agents/SKILL.md`
- Modify: `skills/systematic-debugging/SKILL.md`
- Modify: `skills/requesting-code-review/SKILL.md`
- Modify: `skills/verification-before-completion/SKILL.md`
- Modify: `skills/finishing-a-development-branch/SKILL.md`
- Create: `tests/skill-routing.test.mjs`

**Interfaces:**
- Consumes: `references/routing-policy.md` and `references/handoff-contracts.md`.
- Produces: workflow instructions that explicitly dispatch named roles, preserve coordinator-only operations, and enforce bounded escalation.

- [ ] **Step 1: Write failing static workflow tests**

Create `tests/skill-routing.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skill = (name) => readFile(new URL(`../skills/${name}/SKILL.md`, import.meta.url), "utf8");

test("entry skill requires explicit IMSpeed role routing", async () => {
  const text = await skill("using-imspeed");
  assert.match(text, /references\/routing-policy\.md/);
  assert.match(text, /references\/handoff-contracts\.md/);
  assert.match(text, /must name an `imspeed-\*` role/i);
  assert.doesNotMatch(text, /starting any conversation/i);
});

test("brainstorming and planning use strong named agents", async () => {
  assert.match(await skill("brainstorming"), /imspeed-architect/);
  assert.match(await skill("writing-plans"), /imspeed-planner/);
});

test("implementation names all implementation and review tiers", async () => {
  const text = await skill("subagent-driven-development");
  for (const role of [
    "imspeed-implementer-fast",
    "imspeed-implementer-standard",
    "imspeed-implementer-deep",
    "imspeed-task-reviewer",
    "imspeed-task-reviewer-deep",
    "imspeed-final-reviewer",
    "imspeed-final-reviewer-deep",
  ]) assert.match(text, new RegExp(role));
  assert.match(text, /maximum of two tier escalations/i);
});

test("deterministic finish and verification stay with the coordinator", async () => {
  assert.match(await skill("verification-before-completion"), /coordinator operation/i);
  assert.match(await skill("finishing-a-development-branch"), /coordinator operation/i);
});
```

- [ ] **Step 2: Run the tests and confirm missing-routing failures**

Run: `node --test tests/skill-routing.test.mjs`

Expected: FAIL because the vendored skills do not yet contain IMSpeed role instructions.

- [ ] **Step 3: Add the shared routing preamble to the entry skill**

Add this section near the top of `skills/using-imspeed/SKILL.md`:

```markdown
## Required model routing

Before dispatching a subagent, read `../../references/routing-policy.md` and
`../../references/handoff-contracts.md`. Every dispatch must name an
`imspeed-*` role explicitly. Missing or unavailable profiles are configuration
errors: stop and report them rather than inheriting the coordinator model.

The user-facing coordinator should run on the `imspeed` Codex profile
(`gpt-5.6-sol`, low effort). A skill cannot claim to switch the current parent
model on a surface that does not support profile switching.
```

- [ ] **Step 4: Add architecture and planning dispatch rules**

Add to `skills/brainstorming/SKILL.md`:

```markdown
## IMSpeed architect dispatch

The coordinator owns questions and approval gates. For every non-trivial
feature, dispatch `imspeed-architect` with the current requirements and project
facts before presenting approaches. Use `imspeed-architect-deep` only when the
routing policy's high-risk criteria apply or ordinary architecture remains
unresolved. The coordinator, not the subagent, presents and validates the
design with the user.
```

Add to `skills/writing-plans/SKILL.md`:

```markdown
## IMSpeed planner dispatch

Dispatch `imspeed-planner` with the approved design and global constraints to
draft the implementation plan. Use `imspeed-planner-deep` only for multi-system
or migration-heavy plans. The coordinator self-reviews the returned plan and
writes the final plan document. Execution handoff defaults to
`imspeed:subagent-driven-development`; do not offer inline implementation as
the normal IMSpeed path.
```

- [ ] **Step 5: Replace generic SDD model guidance with exact role routing**

In `skills/subagent-driven-development/SKILL.md`, replace its model-selection section with:

```markdown
## IMSpeed role selection

Read `../../references/routing-policy.md` and classify every plan task before
implementation. Dispatch a fresh `imspeed-implementer-fast`,
`imspeed-implementer-standard`, or `imspeed-implementer-deep` agent according
to the policy. The dispatch includes the compact task brief from
`../../references/handoff-contracts.md`.

After implementation, dispatch `imspeed-task-reviewer`; use
`imspeed-task-reviewer-deep` only for subtle or high-risk diffs. After all
tasks, dispatch `imspeed-final-reviewer`; use `imspeed-final-reviewer-deep` for
security, authentication, authorization, payments, concurrency, destructive
operations, data migrations, or major architecture.

A transient tool failure may retry once at the same tier. Reasoning failure,
repeated underlying test failure, expanded scope, or explicit
`needs-escalation` spawns a fresh next-tier agent with evidence. Allow a
maximum of two tier escalations for one task, then stop and ask the user.
```

Keep the existing combined task review, single final-fix wave, progress ledger, diff package, TDD evidence, and final review package behavior.

- [ ] **Step 6: Add role rules to exploration, debugging, and review skills**

Add these exact rules:

```markdown
<!-- dispatching-parallel-agents -->
Use `imspeed-explorer` for independent read-heavy investigations. Parallel
code-writing requires a plan proving disjoint files, state, and dependencies.

<!-- systematic-debugging -->
Ordinary multi-file debugging uses `imspeed-implementer-standard`. Escalate to
`imspeed-implementer-deep` only after evidence meets the shared routing policy.

<!-- requesting-code-review -->
Task-scoped review uses `imspeed-task-reviewer` or its deep variant. Broad final
review uses `imspeed-final-reviewer` or its deep variant. Review agents are
read-only and consume prepared packages.
```

Place each paragraph in the matching skill without the HTML label comment.

- [ ] **Step 7: Mark verification and finishing as coordinator operations**

Add to both `skills/verification-before-completion/SKILL.md` and `skills/finishing-a-development-branch/SKILL.md`:

```markdown
## IMSpeed execution owner

This is a coordinator operation. Do not spawn a separate agent merely to run
deterministic verification commands or present branch-completion choices.
Subagents supply evidence; the coordinator evaluates the final result.
```

- [ ] **Step 8: Run static workflow tests**

Run: `node --test tests/skill-routing.test.mjs`

Expected: 4 tests PASS.

- [ ] **Step 9: Commit routed workflow skills**

```bash
git add skills tests/skill-routing.test.mjs
git commit -m "feat: route IMSpeed workflow through named agents"
```

---

### Task 7: Validate the complete plugin and generated artifacts

**Files:**
- Create: `scripts/validate-plugin.mjs`
- Create: `tests/run-tests.sh`
- Modify: `tests/manifest.test.mjs`

**Interfaces:**
- Consumes: manifest, definitions, generated TOML, skills, references, config.
- Produces: exit 0 with `IMSpeed validation passed` or a non-zero exit with all discovered validation errors.

- [ ] **Step 1: Extend the manifest test to require all skill directories**

Append to `tests/manifest.test.mjs`:

```javascript
import { access } from "node:fs/promises";

test("all required IMSpeed skills are present", async () => {
  const names = [
    "brainstorming",
    "dispatching-parallel-agents",
    "finishing-a-development-branch",
    "receiving-code-review",
    "requesting-code-review",
    "subagent-driven-development",
    "systematic-debugging",
    "test-driven-development",
    "using-git-worktrees",
    "using-imspeed",
    "verification-before-completion",
    "writing-plans",
  ];
  await Promise.all(names.map((name) => access(new URL(`../skills/${name}/SKILL.md`, import.meta.url))));
});
```

- [ ] **Step 2: Write the failing validation entry-point test command**

Run: `node scripts/validate-plugin.mjs`

Expected: FAIL because the validator does not exist.

- [ ] **Step 3: Implement complete static validation**

Create `scripts/validate-plugin.mjs`:

```javascript
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { agentDefinitions } from "../src/agent-definitions.mjs";
import { renderAgentToml } from "./generate-agent-profiles.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
const check = async (label, operation) => {
  try { await operation(); } catch (error) { errors.push(`${label}: ${error.message}`); }
};

await check("manifest", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, ".codex-plugin/plugin.json"), "utf8"));
  assert.equal(manifest.name, "imspeed");
  assert.equal(manifest.skills, "./skills/");
});

await check("generated agents", async () => {
  for (const definition of agentDefinitions) {
    const file = path.join(root, "agents", `${definition.name}.toml`);
    assert.equal(await readFile(file, "utf8"), renderAgentToml(definition));
  }
});

await check("skill namespace", async () => {
  const required = ["brainstorming", "writing-plans", "subagent-driven-development", "using-imspeed"];
  for (const name of required) await access(path.join(root, "skills", name, "SKILL.md"));
  const entry = await readFile(path.join(root, "skills", "using-imspeed", "SKILL.md"), "utf8");
  assert.doesNotMatch(entry, /superpowers:/);
  assert.match(entry, /imspeed:/);
});

await check("coordinator", async () => {
  const config = await readFile(path.join(root, "config", "imspeed.config.toml"), "utf8");
  assert.match(config, /gpt-5\.6-sol/);
  assert.match(config, /model_reasoning_effort = "low"/);
});

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log("IMSpeed validation passed");
```

- [ ] **Step 4: Create the complete test runner**

Create `tests/run-tests.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

node --test tests/*.test.mjs
bash tests/install-agents.test.sh
node scripts/validate-plugin.mjs
```

- [ ] **Step 5: Run the complete static suite**

Run: `npm test`

Expected: all Node tests PASS, installer behavior PASS, and output ends with `IMSpeed validation passed`.

- [ ] **Step 6: Commit validation tooling**

```bash
git add scripts/validate-plugin.mjs tests package.json
git commit -m "test: validate IMSpeed routing and packaging"
```

---

### Task 8: Add benchmark summarization and qualification rules

**Files:**
- Create: `benchmarks/scenarios.json`
- Create: `benchmarks/README.md`
- Create: `scripts/summarize-benchmark.mjs`
- Create: `tests/benchmark.test.mjs`

**Interfaces:**
- Consumes: JSONL records with `scenario`, `workflow`, `durationMs`, `inputTokens`, `outputTokens`, `testsPassed`, `criticalOpen`, and `importantOpen`.
- Produces: summary JSON with baseline/IMSpeed medians, percentage reductions, quality gates, and `qualified` boolean.

- [ ] **Step 1: Write the failing benchmark summarizer test**

Create `tests/benchmark.test.mjs`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { summarize } from "../scripts/summarize-benchmark.mjs";

test("summarize qualifies only aggressive improvements with clean quality gates", () => {
  const rows = [];
  for (const scenario of ["small", "medium", "integration"]) {
    for (const durationMs of [1000, 1100, 1200]) rows.push({ scenario, workflow: "superpowers", durationMs, inputTokens: 600, outputTokens: 400, testsPassed: true, criticalOpen: 0, importantOpen: 0 });
    for (const durationMs of [450, 500, 550]) rows.push({ scenario, workflow: "imspeed", durationMs, inputTokens: 300, outputTokens: 250, testsPassed: true, criticalOpen: 0, importantOpen: 0 });
  }
  const result = summarize(rows);
  assert.equal(result.qualified, true);
  assert.ok(result.wallClockReductionPercent >= 50);
  assert.ok(result.tokenReductionPercent >= 40);
});

test("summarize rejects unresolved Important findings", () => {
  const rows = [
    { scenario: "small", workflow: "superpowers", durationMs: 1000, inputTokens: 600, outputTokens: 400, testsPassed: true, criticalOpen: 0, importantOpen: 0 },
    { scenario: "small", workflow: "imspeed", durationMs: 400, inputTokens: 300, outputTokens: 200, testsPassed: true, criticalOpen: 0, importantOpen: 1 },
  ];
  assert.equal(summarize(rows).qualified, false);
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `node --test tests/benchmark.test.mjs`

Expected: FAIL because `scripts/summarize-benchmark.mjs` does not exist.

- [ ] **Step 3: Implement benchmark summarization**

Create `scripts/summarize-benchmark.mjs`:

```javascript
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function summarize(rows) {
  const baseline = rows.filter((row) => row.workflow === "superpowers");
  const imspeed = rows.filter((row) => row.workflow === "imspeed");
  if (!baseline.length || !imspeed.length) throw new Error("Both superpowers and imspeed records are required");
  const baselineTime = median(baseline.map((row) => row.durationMs));
  const imspeedTime = median(imspeed.map((row) => row.durationMs));
  const baselineTokens = median(baseline.map((row) => row.inputTokens + row.outputTokens));
  const imspeedTokens = median(imspeed.map((row) => row.inputTokens + row.outputTokens));
  const wallClockReductionPercent = ((baselineTime - imspeedTime) / baselineTime) * 100;
  const tokenReductionPercent = ((baselineTokens - imspeedTokens) / baselineTokens) * 100;
  const qualityPassed = imspeed.every((row) => row.testsPassed && row.criticalOpen === 0 && row.importantOpen === 0);
  return {
    baselineMedianDurationMs: baselineTime,
    imspeedMedianDurationMs: imspeedTime,
    baselineMedianTokens: baselineTokens,
    imspeedMedianTokens: imspeedTokens,
    wallClockReductionPercent,
    tokenReductionPercent,
    qualityPassed,
    qualified: qualityPassed && wallClockReductionPercent >= 50 && tokenReductionPercent >= 40,
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node scripts/summarize-benchmark.mjs <results.jsonl>");
    process.exit(2);
  }
  const rows = (await readFile(input, "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse);
  console.log(JSON.stringify(summarize(rows), null, 2));
}
```

- [ ] **Step 4: Define benchmark scenarios and procedure**

Create `benchmarks/scenarios.json`:

```json
[
  { "id": "small", "shape": "one or two files, complete behavior, focused tests" },
  { "id": "medium", "shape": "multi-file UI and API integration with existing patterns" },
  { "id": "integration", "shape": "cross-layer feature with persistence, failure handling, and regression tests" }
]
```

Create `benchmarks/README.md`:

```markdown
# IMSpeed Performance Qualification

Run the same feature prompt from the same clean repository commit with
Superpowers 6.1.1 and IMSpeed 0.1.0. Keep permissions, dependencies, network
state, and test commands identical. Run every scenario three times per
workflow. Record one JSON object per run with:

`scenario`, `workflow`, `durationMs`, `inputTokens`, `outputTokens`,
`testsPassed`, `criticalOpen`, and `importantOpen`.

Summarize results with:

```bash
node scripts/summarize-benchmark.mjs benchmarks/results.jsonl
```

IMSpeed is performance-qualified only when `qualified` is true. Full benchmark
runs consume substantial model tokens and require explicit user approval before
execution. Do not claim the target from static tests or a single run.
```

- [ ] **Step 5: Run benchmark unit tests**

Run: `node --test tests/benchmark.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 6: Run the complete static suite**

Run: `npm test`

Expected: all tests PASS and validation ends with `IMSpeed validation passed`.

- [ ] **Step 7: Commit benchmark tooling**

```bash
git add benchmarks scripts/summarize-benchmark.mjs tests/benchmark.test.mjs
git commit -m "feat: add IMSpeed performance qualification"
```

---

### Task 9: Register, install, and smoke-test the personal plugin

**Files:**
- Modify outside repository: `/Users/abhijayrajvansh/.agents/plugins/marketplace.json`
- Sync outside repository: `/Users/abhijayrajvansh/.agents/plugins/plugins/imspeed/`
- Install outside repository: `/Users/abhijayrajvansh/.codex/plugins/cache/personal/imspeed/<version>/`
- Install outside repository: `$CODEX_HOME/agents/imspeed-*.toml`
- Install outside repository: `$CODEX_HOME/imspeed.config.toml`
- Create: `docs/imspeed/maintenance.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: valid repository, current `plugin-creator` workflow, and `scripts/install-agents.sh`.
- Produces: enabled `imspeed@personal`, installed role profiles, documented `codex --profile imspeed` startup, and an explicit smoke-test result.

- [ ] **Step 1: Run pre-install verification**

Run:

```bash
npm test
git status --short
```

Expected: tests PASS and the worktree is clean.

- [ ] **Step 2: Use the plugin-creator cachebuster and personal-marketplace workflow**

Invoke the `plugin-creator` skill for the current Codex version. Sync the tested Desktop repository into `/Users/abhijayrajvansh/.agents/plugins/plugins/imspeed/`, then register IMSpeed in the existing `personal` marketplace with the required relative source:

```json
{
  "name": "imspeed",
  "source": {
    "source": "local",
    "path": "./plugins/imspeed"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Developer Tools"
}
```

The plugin-creator skill owns marketplace creation and the exact cachebuster/reinstall command required by the installed Codex build. Do not edit cache files directly. The Desktop repository remains the editable source of truth; the personal marketplace directory is an installable release mirror.

- [ ] **Step 3: Install the custom agents and coordinator profile**

Run:

```bash
bash scripts/install-agents.sh
```

Expected: output reports the selected Codex home and installed profiles without conflicts.

- [ ] **Step 4: Confirm plugin and marketplace state**

Run:

```bash
codex plugin marketplace list --json
codex plugin list
```

Expected: marketplace `personal` is present and `imspeed@personal` is installed/enabled alongside `superpowers@personal`.

- [ ] **Step 5: Run a routed smoke test**

Start a new Codex session with:

```bash
codex --profile imspeed -C /Users/abhijayrajvansh/Desktop/imspeed
```

Prompt:

```text
Use IMSpeed. Classify a hypothetical one-file, fully specified UI copy change.
Do not edit files. State the exact named role, model, and reasoning effort that
would implement it, then state the next role if implementation discovers
multi-file integration.
```

Expected response: starts with `imspeed-implementer-fast` using `gpt-5.6-luna` + `medium`, and escalates to `imspeed-implementer-standard` using `gpt-5.6-terra` + `medium`.

- [ ] **Step 6: Write the future maintenance guide**

Create `docs/imspeed/maintenance.md`:

```markdown
# Maintaining IMSpeed

## Locations

- Editable source of truth: `/Users/abhijayrajvansh/Desktop/imspeed`
- Personal marketplace release mirror: `/Users/abhijayrajvansh/.agents/plugins/plugins/imspeed`
- Personal marketplace manifest: `/Users/abhijayrajvansh/.agents/plugins/marketplace.json`
- Codex runtime cache: `/Users/abhijayrajvansh/.codex/plugins/cache/personal/imspeed`

Never edit the runtime cache. Make every improvement in the Desktop repository
on a feature branch or worktree, run the test suite, and commit it first.

## Update loop

1. Edit `/Users/abhijayrajvansh/Desktop/imspeed`.
2. Run `npm test` and commit the verified change.
3. Sync the release into the personal marketplace mirror while excluding
   `.git`, `.worktrees`, and `.superpowers` scratch data.
4. From the `plugin-creator` skill directory, run:

   ```bash
   python3 scripts/update_plugin_cachebuster.py /Users/abhijayrajvansh/.agents/plugins/plugins/imspeed
   ```

5. Read the default personal marketplace name:

   ```bash
   python3 scripts/read_marketplace_name.py
   ```

6. Reinstall from the reported marketplace name, normally `personal`:

   ```bash
   codex plugin add imspeed@personal
   ```

7. Start a new Codex thread so the updated skills and agent configuration are
   loaded.

The cachebuster helper preserves the base version and replaces only the
`+codex.<token>` suffix. Do not manually edit `marketplace.json`, Codex plugin
cache files, or the base user `config.toml` during routine updates.

## Improving routing

Change the role matrix in `src/agent-definitions.mjs`, regenerate profiles with
`npm run generate:agents`, and update `references/routing-policy.md` in the same
commit. Add or update routing tests before changing behavior. Use benchmark
evidence, not intuition alone, before making a slower model the default.
```

- [ ] **Step 7: Complete the README**

Replace the implementation status section with installation and usage commands:

```markdown
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
```

- [ ] **Step 8: Run final verification**

Run:

```bash
npm test
git status --short
```

Expected: all tests PASS; only the intended README change is uncommitted.

- [ ] **Step 9: Commit installation documentation**

```bash
git add README.md docs/imspeed/maintenance.md
git commit -m "docs: document IMSpeed installation and usage"
```

- [ ] **Step 10: Stop before paid benchmark qualification**

Present the static-test and smoke-test evidence to the user and ask for explicit approval before running the three-by-three Superpowers and IMSpeed benchmark matrix. If approved, create `benchmarks/results.jsonl`, run `node scripts/summarize-benchmark.mjs benchmarks/results.jsonl`, and report qualification without changing the acceptance thresholds.
