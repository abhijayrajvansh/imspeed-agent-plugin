import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const script = fileURLToPath(
  new URL("../skills/subagent-driven-development/scripts/sdd-workspace", import.meta.url),
);

test("sdd-workspace preserves an existing scratch .gitignore on reruns", async () => {
  const repo = await mkdtemp(join(tmpdir(), "imspeed-sdd-workspace-"));

  try {
    await execFileAsync("git", ["init", "-q"], { cwd: repo });
    const first = await execFileAsync(script, [], { cwd: repo });
    const ignore = join(first.stdout.trim(), ".gitignore");
    assert.equal(await readFile(ignore, "utf8"), "*\n");

    const customIgnore = "# Preserve local scratch policy\n*.tmp\n";
    await writeFile(ignore, customIgnore);

    const second = await execFileAsync(script, [], { cwd: repo });
    assert.equal(second.stdout, first.stdout);
    assert.equal(await readFile(ignore, "utf8"), customIgnore);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
