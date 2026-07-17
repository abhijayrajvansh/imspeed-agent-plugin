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
