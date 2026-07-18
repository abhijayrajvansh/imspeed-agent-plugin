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
    "name: using-superpowers\n" +
      "description: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions\n" +
      "Use superpowers:brainstorming and docs/superpowers/specs.\n\n" +
      "## Platform Adaptation\n\n" +
      "- Codex: `references/codex-tools.md`\n" +
      "- Pi: `references/pi-tools.md`\n" +
      "- Antigravity: `references/antigravity-tools.md`\n\n" +
      "## User Instructions\n\nIMSpeed' routing applies.\n",
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
  assert.match(
    entry,
    /description: Use when the user explicitly asks to use IMSpeed or starts an IMSpeed feature workflow; establishes mandatory IMSpeed skill routing before any implementation action/,
  );
  assert.match(entry, /imspeed:brainstorming/);
  assert.match(entry, /docs\/imspeed\/specs/);
  assert.match(
    entry,
    /## Platform\n\nIMSpeed 0\.1\.0 supports Codex custom-agent surfaces only\. Read\n`references\/codex-tools\.md` for Codex tool mappings\. If named custom agents or\nexplicit model and effort fields are unavailable, stop and explain that this\nharness cannot preserve IMSpeed's routing guarantees\./,
  );
  assert.doesNotMatch(entry, /## Platform Adaptation|references\/pi-tools\.md|references\/antigravity-tools\.md/);
  assert.match(entry, /IMSpeed's routing applies/);
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

test("vendorSkills preserves the local executing-plans overlay", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "imspeed-vendor-overlay-"));
  const source = path.join(root, "source");
  const destination = path.join(root, "destination");
  await mkdir(path.join(source, "skills", "using-superpowers"), { recursive: true });
  await mkdir(path.join(source, "skills", "using-superpowers", "references"), { recursive: true });
  await mkdir(path.join(source, "skills", "brainstorming"), { recursive: true });
  await mkdir(path.join(destination, "executing-plans"), { recursive: true });
  await writeFile(path.join(source, "skills", "using-superpowers", "SKILL.md"), "name: using-superpowers\n");
  await writeFile(
    path.join(source, "skills", "using-superpowers", "references", "codex-tools.md"),
    "Codex tools\n",
  );
  await writeFile(
    path.join(source, "skills", "brainstorming", "SKILL.md"),
    "name: brainstorming\nIMSpeed routing uses imspeed-architect.\n",
  );
  await writeFile(
    path.join(destination, "executing-plans", "SKILL.md"),
    "name: executing-plans\nLocal overlay marker.\n",
  );
  await vendorSkills(source, destination, ["executing-plans", "using-superpowers", "brainstorming"]);
  const overlay = await readFile(path.join(destination, "executing-plans", "SKILL.md"), "utf8");
  assert.equal(overlay, "name: executing-plans\nLocal overlay marker.\n");
});
