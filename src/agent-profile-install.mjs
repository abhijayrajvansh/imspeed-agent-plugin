import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const profileFilenames = [
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

export async function applyAgentProfiles({
  profileDirectory,
  codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"),
}) {
  const sourceProfiles = await Promise.all(profileFilenames.map(async (filename) => {
    const source = path.join(profileDirectory, filename);
    try {
      return { filename, contents: await readFile(source) };
    } catch (error) {
      throw new Error(`Required IMSpeed agent profile is missing or unreadable: ${source}`, { cause: error });
    }
  }));
  const destination = path.resolve(codexHome, "agents");
  await mkdir(destination, { recursive: true });

  for (const { filename, contents } of sourceProfiles) {
    const target = path.join(destination, filename);
    const temporary = path.join(destination, `.${filename}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`);
    try {
      await writeFile(temporary, contents);
      await rename(temporary, target);
    } finally {
      await unlink(temporary).catch(() => {});
    }
  }

  return { destination, filenames: [...profileFilenames].sort() };
}
