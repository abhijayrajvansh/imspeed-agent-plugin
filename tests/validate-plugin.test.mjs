import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validatePlugin } from "../scripts/validate-plugin.mjs";

const repoRoot = new URL("..", import.meta.url);

const withFixture = async (mutate) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "imspeed-validate-"));
  await cp(repoRoot, root, {
    recursive: true,
    filter: (pathName) => {
      return !/(?:\/|^)\.git(?:\/|$)/.test(pathName) &&
        !/(?:\/|^)\.superpowers(?:\/|$)/.test(pathName) &&
        !/(?:\/|^)node_modules(?:\/|$)/.test(pathName);
    },
  });

  try {
    await mutate(root);
    return await validatePlugin(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

test("validator rejects a wrong coordinator thread cap", async () => {
  const { valid, errors } = await withFixture(async (root) => {
    const config = [
      "model = \"gpt-5.6-sol\"",
      "model_reasoning_effort = \"low\"",
      "",
      "[agents]",
      "max_threads = 2",
      "max_depth = 1",
    ].join("\n");
    await writeFile(path.join(root, "config", "imspeed.config.toml"), `${config}\n`);
  });

  assert.equal(valid, false);
  assert.match(errors.join("\n"), /coordinator: agents\.max_threads must be 4/);
});

test("validator rejects a wrong coordinator worktree depth cap", async () => {
  const { valid, errors } = await withFixture(async (root) => {
    const config = [
      "model = \"gpt-5.6-sol\"",
      "model_reasoning_effort = \"low\"",
      "",
      "[agents]",
      "max_threads = 4",
      "max_depth = 3",
    ].join("\n");
    await writeFile(path.join(root, "config", "imspeed.config.toml"), `${config}\n`);
  });

  assert.equal(valid, false);
  assert.match(errors.join("\n"), /coordinator: agents\.max_depth must be 1/);
});

test("validator rejects unsupported and missing vendored skill directories", async () => {
  const missing = await withFixture(async (root) => {
    await rm(path.join(root, "skills", "dispatching-parallel-agents"), { recursive: true, force: true });
  });
  assert.equal(missing.valid, false);
  assert.match(missing.errors.join("\n"), /skill namespace: missing required skill directories:/);

  const unsupported = await withFixture(async (root) => {
    await mkdir(path.join(root, "skills", "unused-supporting-skill"), { recursive: true });
    await writeFile(path.join(root, "skills", "unused-supporting-skill", "SKILL.md"), "name: unused-supporting-skill\n");
  });
  assert.equal(unsupported.valid, false);
  assert.match(unsupported.errors.join("\n"), /skill namespace: unsupported skill directories:/);
});

test("validator scans all SKILL.md files for leftover superpowers namespace", async () => {
  const result = await withFixture(async (root) => {
    const writingPlanPath = path.join(root, "skills", "writing-plans", "SKILL.md");
    const source = await readFile(writingPlanPath, "utf8");
    await writeFile(writingPlanPath, `${source}\nsuperpowers:writing-plans legacy alias\n`);
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /skill namespace:/);
  assert.match(result.errors.join("\n"), /superpowers:/);
});
