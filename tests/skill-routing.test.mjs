import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skill = (name) => readFile(new URL(`../skills/${name}/SKILL.md`, import.meta.url), "utf8");
const repoFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

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

test("Task 6 dispatches use explicit IMSpeed roles and required handoff/routing contracts", async () => {
  const modifiedSkills = [
    "requesting-code-review",
    "dispatching-parallel-agents",
  ];

  for (const name of modifiedSkills) {
    const text = await skill(name);
    assert.doesNotMatch(text, /general-purpose/i);
    assert.match(text, /references\/routing-policy\.md/);
    assert.match(text, /references\/handoff-contracts\.md/);
  }

  assert.match(await skill("requesting-code-review"), /progress[- ]ledger/i);
  assert.match(await skill("dispatching-parallel-agents"), /progress[- ]ledger/i);
});

test("Task 6 workflow artifacts use one .superpowers/sdd runtime contract", async () => {
  const contractFiles = [
    "skills/subagent-driven-development/SKILL.md",
    "skills/subagent-driven-development/scripts/sdd-workspace",
    "skills/subagent-driven-development/scripts/task-brief",
    "skills/subagent-driven-development/scripts/review-package",
    "skills/requesting-code-review/SKILL.md",
    "references/handoff-contracts.md",
  ];

  for (const path of contractFiles) {
    const text = await repoFile(path);
    assert.doesNotMatch(text, /\.IMSpeed\//, `${path} retains an obsolete .IMSpeed scratch path`);
    assert.match(text, /\.superpowers\/sdd/, `${path} does not name the canonical SDD workspace`);
  }

  const contract = await repoFile("references/handoff-contracts.md");
  for (const artifact of [
    ".superpowers/sdd/progress.md",
    ".superpowers/sdd/task-<N>-brief.md",
    ".superpowers/sdd/task-<N>-report.md",
    ".superpowers/sdd/review-<base7>..<head7>.diff",
  ]) assert.match(contract, new RegExp(artifact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("implementation plan uses IMSpeed workflow skills for operational dispatch", async () => {
  const plan = await repoFile("docs/imspeed/plans/2026-07-18-imspeed-plugin.md");
  const executableLegacyDirections = plan
    .split("\n")
    .filter((line) => /superpowers:(?:subagent-driven-development|executing-plans)/.test(line))
    .filter((line) => !/(?:historical|attribution|upstream|vendored)/i.test(line));

  assert.deepEqual(executableLegacyDirections, []);
  assert.match(
    plan,
    /REQUIRED SUB-SKILL: Use imspeed:subagent-driven-development .* imspeed:executing-plans/,
  );
});
