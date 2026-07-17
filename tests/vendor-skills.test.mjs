import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { vendorSkills } from "../scripts/vendor-superpowers-skills.mjs";

test("vendorSkills renames the entry skill and namespace", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "imspeed-vendor-"));
  const source = path.join(root, "source");
  const destination = path.join(root, "destination");
  await mkdir(path.join(source, "skills", "using-superpowers"), { recursive: true });
  await mkdir(path.join(source, "skills", "using-superpowers", "references"), { recursive: true });
  await mkdir(path.join(source, "skills", "brainstorming"), { recursive: true });
  await writeFile(
    path.join(source, "skills", "using-superpowers", "SKILL.md"),
    "name: using-superpowers\nUse superpowers:brainstorming and docs/superpowers/specs.\n",
  );
  await writeFile(
    path.join(source, "skills", "brainstorming", "SKILL.md"),
    "name: brainstorming\nSuperpowers uses superpowers:writing-plans.\n",
  );
  await writeFile(
    path.join(source, "skills", "using-superpowers", "references", "codex-tools.md"),
    "Codex tools\n",
  );
  await writeFile(
    path.join(source, "skills", "using-superpowers", "references", "pi-tools.md"),
    "Pi tools\n",
  );
  await writeFile(
    path.join(source, "skills", "using-superpowers", "references", "antigravity-tools.md"),
    "Antigravity tools\n",
  );

  await vendorSkills(source, destination, ["using-superpowers", "brainstorming"]);

  const entry = await readFile(path.join(destination, "using-imspeed", "SKILL.md"), "utf8");
  const brainstorm = await readFile(path.join(destination, "brainstorming", "SKILL.md"), "utf8");
  const codex = await readFile(
    path.join(destination, "using-imspeed", "references", "codex-tools.md"),
    "utf8",
  );
  assert.match(entry, /name: using-imspeed/);
  assert.match(entry, /imspeed:brainstorming/);
  assert.match(entry, /docs\/imspeed\/specs/);
  assert.match(brainstorm, /IMSpeed uses imspeed:writing-plans/);
  assert.doesNotMatch(entry + brainstorm, /superpowers:/);
  assert.equal(codex, "Codex tools\n");
  await assert.rejects(
    readFile(path.join(destination, "using-imspeed", "references", "pi-tools.md"), "utf8"),
  );
  await assert.rejects(
    readFile(
      path.join(destination, "using-imspeed", "references", "antigravity-tools.md"),
      "utf8",
    ),
  );
});
