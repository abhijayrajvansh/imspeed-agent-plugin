import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { applyAgentProfiles } from "../src/agent-profile-install.mjs";

const profileNames = [
  "imspeed-architect-deep.toml",
  "imspeed-architect.toml",
  "imspeed-explorer.toml",
  "imspeed-final-reviewer-deep.toml",
  "imspeed-final-reviewer.toml",
  "imspeed-implementer-deep.toml",
  "imspeed-implementer-fast.toml",
  "imspeed-implementer-standard.toml",
  "imspeed-planner-deep.toml",
  "imspeed-planner.toml",
  "imspeed-task-reviewer-deep.toml",
  "imspeed-task-reviewer.toml",
];

async function temporaryDirectory() {
  return mkdtemp(path.join(os.tmpdir(), "imspeed-agent-profile-install-"));
}

async function createProfiles(directory) {
  await mkdir(directory, { recursive: true });
  await Promise.all(profileNames.map((name) => writeFile(path.join(directory, name), `name = ${JSON.stringify(name)}\n`)));
}

test("replaces all IMSpeed profiles without changing the coordinator or unrelated files", async (t) => {
  const root = await temporaryDirectory();
  t.after(() => rm(root, { recursive: true, force: true }));
  const profileDirectory = path.join(root, "profiles");
  const codexHome = path.join(root, "codex");
  await createProfiles(profileDirectory);
  await mkdir(path.join(codexHome, "agents"), { recursive: true });
  await writeFile(path.join(codexHome, "imspeed.config.toml"), "model = \"coordinator\"\n");
  await writeFile(path.join(codexHome, "agents", "other-agent.toml"), "preserve me\n");
  await writeFile(path.join(codexHome, "agents", profileNames[0]), "old profile\n");

  const result = await applyAgentProfiles({ profileDirectory, codexHome });

  assert.deepEqual(result, {
    destination: path.resolve(codexHome, "agents"),
    filenames: [...profileNames].sort(),
  });
  for (const name of profileNames) {
    assert.equal(await readFile(path.join(codexHome, "agents", name), "utf8"), `name = ${JSON.stringify(name)}\n`);
  }
  assert.equal(await readFile(path.join(codexHome, "imspeed.config.toml"), "utf8"), "model = \"coordinator\"\n");
  assert.equal(await readFile(path.join(codexHome, "agents", "other-agent.toml"), "utf8"), "preserve me\n");
});

test("rejects before replacing profiles when a required source profile is absent", async (t) => {
  const root = await temporaryDirectory();
  t.after(() => rm(root, { recursive: true, force: true }));
  const profileDirectory = path.join(root, "profiles");
  const codexHome = path.join(root, "codex");
  await createProfiles(profileDirectory);
  await rm(path.join(profileDirectory, profileNames[0]));
  await mkdir(path.join(codexHome, "agents"), { recursive: true });
  await writeFile(path.join(codexHome, "agents", profileNames[1]), "existing profile\n");

  await assert.rejects(
    applyAgentProfiles({ profileDirectory, codexHome }),
    new RegExp(profileNames[0]),
  );
  assert.equal(await readFile(path.join(codexHome, "agents", profileNames[1]), "utf8"), "existing profile\n");
});
