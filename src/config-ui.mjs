import http from "node:http";
import path from "node:path";
import { loadAgentDefaults, SUPPORTED_MODELS, SUPPORTED_REASONING_EFFORTS, validateAgentDefaults, writeAgentDefaultsAtomically } from "./agent-config.mjs";
import { loadAgentDefinitions } from "./agent-definitions.mjs";
import { applyAgentProfiles } from "./agent-profile-install.mjs";
import { renderConfigPage } from "./config-ui-page.mjs";
import { generateAgentProfiles } from "../scripts/generate-agent-profiles.mjs";

const MAX_BODY_BYTES = 64 * 1024;

function send(response, status, body, contentType = "application/json; charset=utf-8") {
  response.writeHead(status, { "content-type": contentType });
  response.end(typeof body === "string" ? body : JSON.stringify(body));
}

function publicAgents(definitions) {
  return definitions.map(({ name, description, model, effort, sandbox }) => ({
    name, description, profileName: `${name}.toml`, model, model_reasoning_effort: effort, accessMode: sandbox,
  }));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body exceeds 64 KiB"));
        request.destroy();
      } else body += chunk;
    });
    request.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON")); }
    });
    request.on("error", reject);
  });
}

export function createConfigServer({ repositoryRoot, configPath, profileDirectory, codexHome }) {
  const resolvedProfileDirectory = profileDirectory ?? path.join(repositoryRoot, "agents");
  return http.createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    try {
      if (request.method === "GET" && pathname === "/api/config") {
        const definitions = await loadAgentDefinitions(configPath);
        return send(response, 200, { agents: publicAgents(definitions), models: SUPPORTED_MODELS, reasoningEfforts: SUPPORTED_REASONING_EFFORTS });
      }
      if (request.method === "GET" && pathname === "/") {
        const definitions = await loadAgentDefinitions(configPath);
        return send(response, 200, renderConfigPage({ agents: publicAgents(definitions), models: SUPPORTED_MODELS, reasoningEfforts: SUPPORTED_REASONING_EFFORTS }), "text/html; charset=utf-8");
      }
      if (request.method === "POST" && pathname === "/api/config") {
        const value = await readJson(request);
        if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, "agents")) throw new Error("Expected only an agents payload");
        validateAgentDefaults(value.agents);
        await writeAgentDefaultsAtomically(value.agents, configPath);
        const definitions = await loadAgentDefinitions(configPath);
        await generateAgentProfiles(resolvedProfileDirectory, definitions);
        const applied = await applyAgentProfiles({ profileDirectory: resolvedProfileDirectory, codexHome });
        return send(response, 200, { agents: publicAgents(definitions), applied });
      }
      return send(response, 404, { error: "Not found" });
    } catch (error) {
      return send(response, 400, { error: error.message || "Invalid request" });
    }
  });
}
