import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const maintenance = await readFile(new URL("../docs/imspeed/maintenance.md", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

test("task 9 maintenance guide captures immutable source and update workflow", async () => {
  assert.ok(maintenance.includes("Editable source of truth: `/Users/abhijayrajvansh/Desktop/imspeed`"));
  assert.ok(maintenance.includes("Run `npm test` on the source checkout"));
  assert.ok(maintenance.includes("excluding:\n   `.git`, `.worktrees`, and `.superpowers`."));
  assert.ok(maintenance.includes("scripts/update_plugin_cachebuster.py"));
  assert.ok(maintenance.includes("scripts/read_marketplace_name.py"));
  assert.ok(maintenance.includes("codex plugin add imspeed@personal"));
  assert.ok(maintenance.includes("new Codex thread"));
});

test("task 9 maps are updated in explicit files", async () => {
  assert.ok(maintenance.includes("src/agent-definitions.mjs"));
  assert.ok(maintenance.includes("references/routing-policy.md"));
  assert.ok(maintenance.includes("skills/"));
  assert.ok(maintenance.includes("benchmarks/scenarios.json"));
  assert.ok(maintenance.includes("scripts/validate-plugin.mjs"));
});

test("task 9 README documents install and codex start flow", async () => {
  assert.ok(readme.includes("## Install role agents"));
  assert.ok(readme.includes("bash scripts/install-agents.sh"));
  assert.ok(readme.includes("codex --profile imspeed -C /path/to/project"));
  assert.ok(readme.includes("Future updates are documented in `docs/imspeed/maintenance.md`"));
});
