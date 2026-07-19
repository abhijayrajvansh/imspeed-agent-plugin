import assert from "node:assert/strict";
import test from "node:test";
import { createCachebustedVersion, releaseConfiguration } from "../scripts/release-local.mjs";

test("createCachebustedVersion preserves the base version and replaces a prior cachebuster", () => {
  assert.equal(
    createCachebustedVersion("0.1.0", "20260719-123456"),
    "0.1.0+codex.local-20260719-123456",
  );
  assert.equal(
    createCachebustedVersion("1.2.3-beta.1+codex.old-token", "20260719-123456"),
    "1.2.3-beta.1+codex.local-20260719-123456",
  );
});

test("releaseConfiguration defaults to the personal marketplace mirror", () => {
  const configuration = releaseConfiguration({
    homeDirectory: "/Users/example",
    repositoryRoot: "/Users/example/Desktop/imspeed",
    environment: {},
  });

  assert.deepEqual(configuration, {
    marketplace: "personal",
    mirrorDirectory: "/Users/example/plugins/imspeed",
    repositoryRoot: "/Users/example/Desktop/imspeed",
  });
});

test("releaseConfiguration supports explicit local release destinations", () => {
  const configuration = releaseConfiguration({
    homeDirectory: "/Users/example",
    repositoryRoot: "/Users/example/Desktop/imspeed",
    environment: {
      IMSPEED_MARKETPLACE: "team-local",
      IMSPEED_PLUGIN_MIRROR: "/Users/example/plugins/imspeed-preview",
    },
  });

  assert.equal(configuration.marketplace, "team-local");
  assert.equal(configuration.mirrorDirectory, "/Users/example/plugins/imspeed-preview");
});
