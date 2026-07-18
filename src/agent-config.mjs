import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const SUPPORTED_MODELS = Object.freeze(["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"]);
export const SUPPORTED_REASONING_EFFORTS = Object.freeze(["low", "medium", "high"]);

export const AGENT_ROLE_ORDER = Object.freeze([
  "imspeed-explorer",
  "imspeed-architect",
  "imspeed-architect-deep",
  "imspeed-planner",
  "imspeed-planner-deep",
  "imspeed-implementer-fast",
  "imspeed-implementer-standard",
  "imspeed-implementer-deep",
  "imspeed-task-reviewer",
  "imspeed-task-reviewer-deep",
  "imspeed-final-reviewer",
  "imspeed-final-reviewer-deep",
]);

const AGENT_FIELDS = new Set(["name", "model", "model_reasoning_effort"]);
const quotedField = /^(name|model|model_reasoning_effort) = "([^"\\]*)"$/;

function parseAgentDefaults(toml) {
  const agents = [];
  let current;

  for (const line of toml.split(/\r?\n/)) {
    if (line === "" || line.startsWith("#")) continue;
    if (line === "[[agent]]") {
      current = {};
      agents.push(current);
      continue;
    }
    if (!current) throw new Error(`Expected [[agent]] before ${line}`);
    const match = quotedField.exec(line);
    if (!match) throw new Error(`Expected a quoted agent field, received ${line}`);
    const [, field, value] = match;
    if (!AGENT_FIELDS.has(field)) throw new Error(`Unknown agent field ${field}`);
    if (Object.hasOwn(current, field)) throw new Error(`Duplicate agent field ${field}`);
    current[field] = value;
  }

  return agents;
}

export function validateAgentDefaults(value) {
  if (!Array.isArray(value)) throw new Error("Agent defaults must be an array");
  const names = new Set();
  for (const agent of value) {
    if (!agent || typeof agent !== "object") throw new Error("Agent default must be an object");
    for (const field of AGENT_FIELDS) {
      if (typeof agent[field] !== "string" || agent[field] === "") {
        throw new Error(`Agent default is missing ${field}`);
      }
    }
    for (const field of Object.keys(agent)) {
      if (!AGENT_FIELDS.has(field)) throw new Error(`Unknown agent field ${field}`);
    }
    if (names.has(agent.name)) throw new Error(`Duplicate agent name ${agent.name}`);
    if (!AGENT_ROLE_ORDER.includes(agent.name)) throw new Error(`Unknown agent name ${agent.name}`);
    if (!SUPPORTED_MODELS.includes(agent.model)) throw new Error(`Unsupported model ${agent.model}`);
    if (!SUPPORTED_REASONING_EFFORTS.includes(agent.model_reasoning_effort)) {
      throw new Error(`Unsupported reasoning effort ${agent.model_reasoning_effort}`);
    }
    names.add(agent.name);
  }
  if (value.length !== AGENT_ROLE_ORDER.length) {
    throw new Error(`Expected ${AGENT_ROLE_ORDER.length} agent defaults`);
  }
  for (const name of AGENT_ROLE_ORDER) {
    if (!names.has(name)) throw new Error(`Missing agent default ${name}`);
  }
  return value;
}

export async function loadAgentDefaults(filePath) {
  return validateAgentDefaults(parseAgentDefaults(await readFile(filePath, "utf8")));
}

export function serializeAgentDefaults(definitions) {
  validateAgentDefaults(definitions);
  const byName = new Map(definitions.map((definition) => [definition.name, definition]));
  return AGENT_ROLE_ORDER.map((name) => {
    const { model, model_reasoning_effort } = byName.get(name);
    return [
      "[[agent]]",
      `name = ${JSON.stringify(name)}`,
      `model = ${JSON.stringify(model)}`,
      `model_reasoning_effort = ${JSON.stringify(model_reasoning_effort)}`,
      "",
    ].join("\n");
  }).join("\n");
}

export async function writeAgentDefaultsAtomically(definitions, filePath) {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  await writeFile(temporaryPath, serializeAgentDefaults(definitions));
  await rename(temporaryPath, filePath);
}
