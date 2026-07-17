import assert from "node:assert/strict";
import { access } from "node:fs/promises";
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
