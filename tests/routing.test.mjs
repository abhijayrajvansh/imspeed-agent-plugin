import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { agentDefinitions } from "../src/agent-definitions.mjs";

test("routing policy names every configured role", async () => {
  const policy = await readFile(new URL("../references/routing-policy.md", import.meta.url), "utf8");
  for (const definition of agentDefinitions) {
    assert.match(policy, new RegExp(`\\b${definition.name}\\b`));
  }
});

test("routing policy defines bounded adaptive escalation", async () => {
  const policy = await readFile(new URL("../references/routing-policy.md", import.meta.url), "utf8");
  assert.match(policy, /retry once at the same tier/i);
  assert.match(policy, /maximum of two tier escalations/i);
  assert.match(policy, /must not silently inherit/i);
  assert.match(policy, /authentication|authorization/i);
  assert.match(policy, /concurrency/i);
  assert.match(policy, /migration/i);
});

test("handoff contracts include required evidence", async () => {
  const contracts = await readFile(new URL("../references/handoff-contracts.md", import.meta.url), "utf8");
  for (const field of [
    "Goal",
    "Exact task scope",
    "Required tests",
    "Status",
    "Files changed or inspected",
    "RED/GREEN evidence",
    "Risks or unresolved issues",
  ]) {
    assert.match(contracts, new RegExp(field.replace("/", "\\/"), "i"));
  }
});
