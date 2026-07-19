import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const maintenance = await readFile(new URL("../docs/imspeed/maintenance.md", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const plan = await readFile(
  new URL("../docs/imspeed/plans/2026-07-18-imspeed-plugin.md", import.meta.url),
  "utf8",
);
const design = await readFile(
  new URL("../docs/imspeed/specs/2026-07-18-imspeed-multi-model-routing-design.md", import.meta.url),
  "utf8",
);

const marketplaceMirror = "/Users/abhijayrajvansh/plugins/imspeed";
const obsoleteMarketplaceMirror = "/Users/abhijayrajvansh/.agents/plugins/plugins/imspeed";

const tokenized = (text, token) => {
  return text.includes(`\`${token}\``) || text.includes(token);
};

test("task 9 maintenance guide captures immutable source and update workflow", async () => {
  assert.ok(
    maintenance.includes(marketplaceMirror),
    `maintenance should include exact resolved marketplace mirror ${marketplaceMirror}`,
  );
  assert.ok(maintenance.includes("/Users/abhijayrajvansh/Desktop/imspeed"));
  assert.ok(maintenance.includes("Run `npm test` on the source checkout"));
  for (const token of [".git", ".worktrees", ".superpowers"]) {
    assert.ok(
      tokenized(maintenance, token),
      `maintenance should include exclusion token ${token}`,
    );
  }
  assert.ok(
    /keep[\s\S]{0,120}relative/i.test(maintenance),
    "maintenance should keep marketplace source path relative as ./plugins/imspeed",
  );
  assert.ok(maintenance.includes("./plugins/imspeed"), "maintenance should include exact marketplace source token ./plugins/imspeed");
  assert.ok(maintenance.includes("npm run release:local"));
  assert.ok(maintenance.includes("cachebuster"));
  assert.ok(maintenance.includes("codex plugin add imspeed@personal"));
  assert.ok(maintenance.includes("new Codex thread"));

  assert.ok(
    /hand-edit.+runtime cache/i.test(maintenance),
    "maintenance should warn not to hand-edit runtime cache",
  );
  assert.ok(
    maintenance.includes("marketplace manifest") && maintenance.includes("marketplace config"),
    "maintenance should warn not to hand-edit marketplace manifest and config",
  );
  assert.ok(
    maintenance.includes("installed copies"),
    "maintenance should warn not to hand-edit installed copies",
  );
});

test("task 9 operational docs reject the manifest-relative mirror bug", () => {
  const operationalDocs = [maintenance, readme, plan, design].join("\n");
  assert.ok(
    !operationalDocs.includes(obsoleteMarketplaceMirror),
    `operational docs should reject obsolete mirror ${obsoleteMarketplaceMirror}`,
  );
});

test("task 9 maps are updated in explicit files", async () => {
  assert.ok(maintenance.includes("src/agent-definitions.mjs"));
  assert.ok(maintenance.includes("references/routing-policy.md"));
  assert.ok(maintenance.includes("skills/"));
  assert.ok(maintenance.includes("benchmarks/scenarios.json"));
  assert.ok(maintenance.includes("scripts/validate-plugin.mjs"));
});

test("task 9 README documents install and codex start flow", async () => {
  assert.ok(readme.includes("## Install role agents"));
  assert.ok(readme.includes("bash scripts/install-agents.sh"));
  assert.ok(readme.includes("codex --profile imspeed -C /path/to/project"));
  assert.ok(readme.includes("Future updates are documented in `docs/imspeed/maintenance.md`"));
});
