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
