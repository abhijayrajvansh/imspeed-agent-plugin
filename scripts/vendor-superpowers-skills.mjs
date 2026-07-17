import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SKILLS = [
  "brainstorming",
  "dispatching-parallel-agents",
  "finishing-a-development-branch",
  "receiving-code-review",
  "requesting-code-review",
  "subagent-driven-development",
  "systematic-debugging",
  "test-driven-development",
  "using-git-worktrees",
  "using-superpowers",
  "verification-before-completion",
  "writing-plans",
];

const transform = (text) => text
  .replaceAll("superpowers:", "imspeed:")
  .replaceAll("docs/superpowers", "docs/imspeed")
  .replaceAll("using-superpowers", "using-imspeed")
  .replaceAll("Superpowers", "IMSpeed")
  .replaceAll("superpowers", "IMSpeed");

const ENTRY_DESCRIPTION = "description: Use when the user explicitly asks to use IMSpeed or starts an IMSpeed feature workflow; establishes mandatory IMSpeed skill routing before any implementation action";
const ENTRY_PLATFORM = [
  "## Platform",
  "",
  "IMSpeed 0.1.0 supports Codex custom-agent surfaces only. Read",
  "`references/codex-tools.md` for Codex tool mappings. If named custom agents or",
  "explicit model and effort fields are unavailable, stop and explain that this",
  "harness cannot preserve IMSpeed's routing guarantees.",
].join("\n");

const transformTree = async (directory) => {
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await transformTree(target);
    } else if (/\.(md|txt|yaml|yml|json|js|mjs|ts|sh)$/.test(entry.name)) {
      const original = await readFile(target, "utf8");
      await writeFile(target, transform(original));
    }
  }
};

const transformEntrySkill = async (directory) => {
  const target = path.join(directory, "SKILL.md");
  let text = await readFile(target, "utf8");
  text = text.replace(/^description:.*$/m, ENTRY_DESCRIPTION);
  text = text.replace(/## Platform Adaptation[\s\S]*?(?=\n## User Instructions)/, ENTRY_PLATFORM);
  text = text.replace(/IMSpeed'(?!s)/g, "IMSpeed's");
  await writeFile(target, text);
};

export async function vendorSkills(sourceRoot, destinationRoot, skills = DEFAULT_SKILLS) {
  await mkdir(destinationRoot, { recursive: true });
  for (const skill of skills) {
    const source = path.join(sourceRoot, "skills", skill);
    const destinationName = skill === "using-superpowers" ? "using-imspeed" : skill;
    const destination = path.join(destinationRoot, destinationName);
    await cp(source, destination, { recursive: true, force: true });
    await transformTree(destination);
    if (destinationName === "using-imspeed") {
      await transformEntrySkill(destination);
      await rm(path.join(destination, "references", "pi-tools.md"), { force: true });
      await rm(path.join(destination, "references", "antigravity-tools.md"), { force: true });
    }
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const sourceRoot = process.argv[2];
  if (!sourceRoot) {
    console.error("Usage: node scripts/vendor-superpowers-skills.mjs <superpowers-root>");
    process.exit(2);
  }
  await vendorSkills(sourceRoot, path.resolve("skills"));
}
