import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
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

export async function vendorSkills(sourceRoot, destinationRoot, skills = DEFAULT_SKILLS) {
  await mkdir(destinationRoot, { recursive: true });
  for (const skill of skills) {
    const source = path.join(sourceRoot, "skills", skill);
    const destinationName = skill === "using-superpowers" ? "using-imspeed" : skill;
    const destination = path.join(destinationRoot, destinationName);
    await cp(source, destination, { recursive: true, force: true });
    await transformTree(destination);
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
