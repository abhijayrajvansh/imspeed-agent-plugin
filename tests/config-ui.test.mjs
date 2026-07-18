import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { AGENT_ROLE_ORDER, SUPPORTED_MODELS, SUPPORTED_REASONING_EFFORTS, loadAgentDefaults } from "../src/agent-config.mjs";
import { createConfigServer } from "../src/config-ui.mjs";

const repositoryRoot = path.resolve(".");

function request(server, method, pathname, body) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({
      host: "127.0.0.1", port: address.port, method, path: pathname,
      headers: payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {},
    }, (response) => {
      let data = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { data += chunk; });
      response.on("end", () => resolve({
        status: response.statusCode,
        headers: response.headers,
        text: data,
        json: response.headers["content-type"]?.startsWith("application/json") && data ? JSON.parse(data) : undefined,
      }));
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "imspeed-config-ui-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const configPath = path.join(root, "defaults.toml");
  const profileDirectory = path.join(root, "profiles");
  const codexHome = path.join(root, "codex");
  await writeFile(configPath, await readFile(path.join(repositoryRoot, "config/imspeed-agent-defaults.toml")));
  const server = createConfigServer({ repositoryRoot, configPath, profileDirectory, codexHome });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  return { configPath, profileDirectory, codexHome, server };
}

test("GET config exposes all roles and exact editable allowlists", async (t) => {
  const { server } = await fixture(t);
  const response = await request(server, "GET", "/api/config");
  assert.equal(response.status, 200);
  assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
  assert.deepEqual(Object.keys(response.json), ["agents", "models", "reasoningEfforts"]);
  assert.deepEqual(response.json.agents.map(({ name }) => name), AGENT_ROLE_ORDER);
  assert.deepEqual(response.json.models, SUPPORTED_MODELS);
  assert.deepEqual(response.json.reasoningEfforts, SUPPORTED_REASONING_EFFORTS);
  assert.equal(response.json.agents.length, 12);
  assert.deepEqual(Object.keys(response.json.agents[0]).sort(), ["accessMode", "description", "model", "model_reasoning_effort", "name", "profileName"].sort());
});

test("POST saves, regenerates, and applies profile configuration", async (t) => {
  const { configPath, profileDirectory, codexHome, server } = await fixture(t);
  const before = await request(server, "GET", "/api/config");
  const agents = before.json.agents.map(({ name, model, model_reasoning_effort }) => ({ name, model, model_reasoning_effort }));
  agents[0].model = "gpt-5.6-terra";
  agents[0].model_reasoning_effort = "high";
  const response = await request(server, "POST", "/api/config", { agents });
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.json), ["agents", "applied"]);
  assert.equal(response.json.applied.destination, path.join(codexHome, "agents"));
  assert.deepEqual(await loadAgentDefaults(configPath), agents);
  assert.match(await readFile(path.join(profileDirectory, "imspeed-explorer.toml"), "utf8"), /model = "gpt-5\.6-terra"\nmodel_reasoning_effort = "high"/);
  assert.match(await readFile(path.join(codexHome, "agents", "imspeed-explorer.toml"), "utf8"), /model = "gpt-5\.6-terra"/);
});

test("invalid POST payloads return 400 and do not change configuration", async (t) => {
  const { configPath, server } = await fixture(t);
  const original = await readFile(configPath, "utf8");
  const config = (await request(server, "GET", "/api/config")).json.agents.map(({ name, model, model_reasoning_effort }) => ({ name, model, model_reasoning_effort }));
  for (const invalid of [
    { agents: config.slice(1) },
    { agents: [...config, config[0]] },
    { agents: [{ ...config[0], name: "unknown" }, ...config.slice(1)] },
    { agents: [{ ...config[0], model: "unknown" }, ...config.slice(1)] },
  ]) {
    const response = await request(server, "POST", "/api/config", invalid);
    assert.equal(response.status, 400);
    assert.equal(await readFile(configPath, "utf8"), original);
  }
});

test("only documented routes are served and root contains every role and warning", async (t) => {
  const { server } = await fixture(t);
  const root = await request(server, "GET", "/");
  assert.equal(root.status, 200);
  assert.equal(root.headers["content-type"], "text/html; charset=utf-8");
  for (const name of AGENT_ROLE_ORDER) assert.match(root.text, new RegExp(name));
  assert.match(root.text, /Existing agent threads retain their initial model; fresh spawns in a new Codex thread use applied profiles\./);
  assert.equal((await request(server, "GET", "/nope")).status, 404);
  assert.equal((await request(server, "PUT", "/api/config")).status, 404);
});
