import assert from "node:assert/strict";
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
