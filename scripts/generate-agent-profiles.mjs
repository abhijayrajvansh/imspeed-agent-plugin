import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agentDefinitions } from "../src/agent-definitions.mjs";

const quote = (value) => JSON.stringify(value);

export const renderAgentToml = (definition) => [
  `name = ${quote(definition.name)}`,
  `description = ${quote(definition.description)}`,
  `model = ${quote(definition.model)}`,
  `model_reasoning_effort = ${quote(definition.effort)}`,
  `sandbox_mode = ${quote(definition.sandbox)}`,
  `developer_instructions = ${quote(definition.instructions)}`,
  "",
].join("\n");

export async function generateAgentProfiles(outputDirectory = path.resolve("agents")) {
  await mkdir(outputDirectory, { recursive: true });
  for (const definition of agentDefinitions) {
    await writeFile(path.join(outputDirectory, `${definition.name}.toml`), renderAgentToml(definition));
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) await generateAgentProfiles();
