import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  loadAgentDefaults,
  serializeAgentDefaults,
  validateAgentDefaults,
  writeAgentDefaultsAtomically,
} from "../src/agent-config.mjs";

const defaultsPath = new URL("../config/imspeed-agent-defaults.toml", import.meta.url);

test("loads the twelve editable defaults with explorer pinned to Luna low", async () => {
  const defaults = await loadAgentDefaults(defaultsPath);

  assert.equal(defaults.length, 12);
  assert.deepEqual(defaults.find(({ name }) => name === "imspeed-explorer"), {
    name: "imspeed-explorer",
    model: "gpt-5.6-luna",
    model_reasoning_effort: "low",
  });
});

test("rejects duplicate roles and unsupported model or reasoning effort values", () => {
  const valid = {
    name: "imspeed-explorer",
    model: "gpt-5.6-luna",
    model_reasoning_effort: "low",
  };

  assert.throws(() => validateAgentDefaults([valid, valid]), /duplicate agent name/i);
  assert.throws(() => validateAgentDefaults([{ ...valid, model: "unsupported" }]), /unsupported model/i);
  assert.throws(
    () => validateAgentDefaults([{ ...valid, model_reasoning_effort: "maximum" }]),
    /unsupported reasoning effort/i,
  );
});

test("serializes in fixed role order and atomically writes validated defaults", async () => {
  const defaults = await loadAgentDefaults(defaultsPath);
  const directory = await mkdtemp(path.join(os.tmpdir(), "imspeed-agent-defaults-"));
  const outputPath = path.join(directory, "defaults.toml");

  try {
    const serialized = serializeAgentDefaults([...defaults].reverse());
    assert.match(serialized, /^\[\[agent\]\]\nname = "imspeed-explorer"/);

    await writeAgentDefaultsAtomically(defaults, outputPath);
    assert.equal(await readFile(outputPath, "utf8"), serializeAgentDefaults(defaults));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
