import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agentDefinitions } from "../src/agent-definitions.mjs";
import { renderAgentToml } from "./generate-agent-profiles.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..");
const errors = [];

const check = async (label, operation) => {
  try {
    await operation();
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
  }
};

await check("manifest", async () => {
  const manifestPath = path.join(repoRoot, ".codex-plugin", "plugin.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.name, "imspeed");
  assert.equal(manifest.skills, "./skills/");
});

await check("generated agents", async () => {
  const expectedFiles = new Set(agentDefinitions.map((definition) => `${definition.name}.toml`));
  const agentsDir = path.join(repoRoot, "agents");
  const installed = new Set((await readdir(agentsDir)).filter((entry) => entry.endsWith(".toml")));

  for (const file of expectedFiles) {
    assert.ok(
      installed.has(file),
      `missing generated profile: ${file}`,
    );
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
});

await check("skill namespace", async () => {
  const required = [
    "brainstorming",
    "writing-plans",
    "subagent-driven-development",
    "using-imspeed",
  ];
  for (const name of required) {
    await access(path.join(repoRoot, "skills", name, "SKILL.md"));
  }
  const entry = await readFile(path.join(repoRoot, "skills", "using-imspeed", "SKILL.md"), "utf8");
  assert.doesNotMatch(entry, /superpowers:/);
  assert.match(entry, /imspeed:/);
});

await check("coordinator", async () => {
  const config = await readFile(path.join(repoRoot, "config", "imspeed.config.toml"), "utf8");
  assert.match(config, /gpt-5\.6-sol/);
  assert.match(config, /model_reasoning_effort = "low"/);
});

if (errors.length) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log("IMSpeed validation passed");
