import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agentDefinitions } from "../src/agent-definitions.mjs";
import { renderAgentToml } from "./generate-agent-profiles.mjs";
import { DEFAULT_SKILLS } from "./vendor-superpowers-skills.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(root, "..");
const REQUIRED_SKILL_DIRECTORIES = DEFAULT_SKILLS.map((name) =>
  name === "using-superpowers" ? "using-imspeed" : name,
).sort();

const check = async (label, operation, errors) => {
  try {
    await operation();
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
  }
};

export async function validatePlugin(targetRoot = repositoryRoot) {
  const errors = [];

  await check("manifest", async () => {
    const manifestPath = path.join(targetRoot, ".codex-plugin", "plugin.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(manifest.name, "imspeed");
    assert.equal(manifest.skills, "./skills/");
  }, errors);

  await check("generated agents", async () => {
    const expectedFiles = new Set(agentDefinitions.map((definition) => `${definition.name}.toml`));
    const agentsDir = path.join(targetRoot, "agents");
    const installed = new Set((await readdir(agentsDir)).filter((entry) => entry.endsWith(".toml")));

    for (const file of expectedFiles) {
      assert.ok(installed.has(file), `missing generated profile: ${file}`);
    }

    for (const file of installed) {
      if (!expectedFiles.has(file)) {
        throw new Error(`unexpected generated profile: ${file}`);
      }
    }

    for (const definition of agentDefinitions) {
      const file = path.join(agentsDir, `${definition.name}.toml`);
      const text = await readFile(file, "utf8");
      assert.equal(text, renderAgentToml(definition));
    }
  }, errors);

  await check("skill namespace", async () => {
    const skillsRoot = path.join(targetRoot, "skills");
    const skillDirectories = (await readdir(skillsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();

    const skillSet = new Set(skillDirectories);
    const requiredMissing = REQUIRED_SKILL_DIRECTORIES.filter((name) => !skillSet.has(name));
    const skillSetExpected = new Set(REQUIRED_SKILL_DIRECTORIES);
    const unexpected = skillDirectories.filter((name) => !skillSetExpected.has(name));

    if (requiredMissing.length) {
      throw new Error(`missing required skill directories: ${requiredMissing.join(", ")}`);
    }
    if (unexpected.length) {
      throw new Error(`unsupported skill directories: ${unexpected.join(", ")}`);
    }

    for (const name of REQUIRED_SKILL_DIRECTORIES) {
      const skillPath = path.join(skillsRoot, name, "SKILL.md");
      await access(skillPath);
      const text = await readFile(skillPath, "utf8");
      assert.doesNotMatch(text, /\bsuperpowers:/);
      if (name === "using-imspeed") {
        assert.match(text, /imspeed:/);
      }
    }
  }, errors);

  await check("coordinator", async () => {
    const config = await readFile(path.join(targetRoot, "config", "imspeed.config.toml"), "utf8");
    assert.match(config, /model = "gpt-5\.6-sol"/);
    assert.match(config, /model_reasoning_effort = "low"/);
    if (!/^\s*max_threads = 4\s*$/m.test(config)) {
      throw new Error("agents.max_threads must be 4");
    }
    if (!/^\s*max_depth = 1\s*$/m.test(config)) {
      throw new Error("agents.max_depth must be 1");
    }
  }, errors);

  return { valid: errors.length === 0, errors };
}

const isMain = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");
if (isMain) {
  const result = await validatePlugin();
  if (result.valid) {
    console.log("IMSpeed validation passed");
  } else {
    for (const error of result.errors) {
      console.error(error);
    }
    process.exit(1);
  }
}
