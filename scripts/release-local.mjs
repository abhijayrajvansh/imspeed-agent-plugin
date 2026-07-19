import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePlugin } from "./validate-plugin.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "..");

export function createCachebustedVersion(version, cachebuster) {
  const baseVersion = version.split("+")[0];
  assert.ok(baseVersion, "plugin manifest must contain a version");
  assert.match(cachebuster, /^\d{8}-\d{6}$/, "cachebuster must be YYYYMMDD-HHMMSS");
  return `${baseVersion}+codex.local-${cachebuster}`;
}

export function releaseConfiguration({
  environment = process.env,
  homeDirectory = os.homedir(),
  repositoryRoot = defaultRepositoryRoot,
} = {}) {
  return {
    repositoryRoot,
    mirrorDirectory: environment.IMSPEED_PLUGIN_MIRROR
      ? path.resolve(environment.IMSPEED_PLUGIN_MIRROR)
      : path.join(homeDirectory, "plugins", "imspeed"),
    marketplace: environment.IMSPEED_MARKETPLACE || "personal",
  };
}

function utcCachebuster(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
}

async function updateMirrorManifest(mirrorDirectory) {
  const manifestPath = path.join(mirrorDirectory, ".codex-plugin", "plugin.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.version = createCachebustedVersion(manifest.version, utcCachebuster());
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest.version;
}

export async function releaseLocalPlugin(configuration = releaseConfiguration()) {
  if (path.resolve(configuration.repositoryRoot) === path.resolve(configuration.mirrorDirectory)) {
    throw new Error("release source and marketplace mirror must be different directories");
  }

  const validation = await validatePlugin(configuration.repositoryRoot);
  if (!validation.valid) throw new Error(`source validation failed:\n${validation.errors.join("\n")}`);

  run("rsync", [
    "-a",
    "--delete",
    "--exclude=.git",
    "--exclude=.worktrees",
    "--exclude=.superpowers",
    "--exclude=.IMSpeed",
    "--exclude=node_modules",
    "--exclude=temp",
    `${configuration.repositoryRoot}/`,
    `${configuration.mirrorDirectory}/`,
  ]);

  const version = await updateMirrorManifest(configuration.mirrorDirectory);
  run("codex", ["plugin", "add", `imspeed@${configuration.marketplace}`]);
  return { ...configuration, version };
}

const isMain = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");
if (isMain) {
  const result = await releaseLocalPlugin();
  console.log(`Released IMSpeed ${result.version} from ${result.repositoryRoot} to ${result.mirrorDirectory}.`);
  console.log("Start a new Codex task to load the updated plugin.");
}
