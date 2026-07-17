import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { summarize } from "../scripts/summarize-benchmark.mjs";

const summarizeScript = fileURLToPath(new URL("../scripts/summarize-benchmark.mjs", import.meta.url));
const runCli = (args) => {
  return execFileSync(process.execPath, [summarizeScript, ...args], { encoding: "utf8" });
};

const defaultRunIds = (count) => Array.from({ length: count }, (_, index) => `run-${index + 1}`);

const scenarioRows = (
  scenario,
  workflow,
  {
    durationMs,
    inputTokens,
    outputTokens,
    runIds = defaultRunIds(durationMs.length),
    testsPassed = true,
    criticalOpen = 0,
    importantOpen = 0,
  },
) => {
  const scenarioRuns = [];
  for (let i = 0; i < durationMs.length; i += 1) {
    scenarioRuns.push({
      scenario,
      workflow,
      durationMs: durationMs[i],
      inputTokens: inputTokens[i],
      outputTokens: outputTokens[i],
      runId: runIds[i],
      testsPassed,
      criticalOpen,
      importantOpen,
    });
  }
  return scenarioRuns;
};

const rowsForFixture = (definitions) => {
  const rows = [];
  for (const definition of definitions) {
    rows.push(...scenarioRows(
      definition.scenario,
      "superpowers",
      {
        durationMs: definition.superpowers.durationMs,
        inputTokens: definition.superpowers.tokens.input,
        outputTokens: definition.superpowers.tokens.output,
        testsPassed: definition.superpowers.testsPassed ?? true,
        criticalOpen: definition.superpowers.criticalOpen ?? 0,
        importantOpen: definition.superpowers.importantOpen ?? 0,
        runIds: definition.superpowers.runIds,
      },
    ));
    rows.push(...scenarioRows(
      definition.scenario,
      "imspeed",
      {
        durationMs: definition.imspeed.durationMs,
        inputTokens: definition.imspeed.tokens.input,
        outputTokens: definition.imspeed.tokens.output,
        testsPassed: definition.imspeed.testsPassed ?? true,
        criticalOpen: definition.imspeed.criticalOpen ?? 0,
        importantOpen: definition.imspeed.importantOpen ?? 0,
        runIds: definition.imspeed.runIds,
      },
    ));
  }
  return rows;
};

const writeTempFixture = (content) => {
  const dir = mkdirSync(path.join(os.tmpdir(), `imspeed-benchmark-${Date.now()}-`), { recursive: true });
  const file = path.join(dir, "results.jsonl");
  writeFileSync(file, content);
  return { dir, file };
};

const baseScenarioMatrix = [
  { id: "small", expectedRuns: 3, runIds: ["run-1", "run-2", "run-3"], shape: "one or two files" },
  { id: "medium", expectedRuns: 3, runIds: ["run-1", "run-2", "run-3"], shape: "multi-file" },
  { id: "integration", expectedRuns: 3, runIds: ["run-1", "run-2", "run-3"], shape: "cross-layer" },
];

test("summarize qualifies only when exact boundary thresholds and clean quality gates pass", () => {
  const rows = rowsForFixture([
    {
      scenario: "small",
      superpowers: { durationMs: [1000, 1000, 1000], tokens: { input: [600, 600, 600], output: [400, 400, 400] } },
      imspeed: { durationMs: [500, 500, 500], tokens: { input: [300, 300, 300], output: [300, 300, 300] } },
    },
    {
      scenario: "medium",
      superpowers: { durationMs: [1000, 1000, 1000], tokens: { input: [620, 620, 620], output: [380, 380, 380] } },
      imspeed: { durationMs: [500, 500, 500], tokens: { input: [350, 350, 350], output: [250, 250, 250] } },
    },
    {
      scenario: "integration",
      superpowers: { durationMs: [1000, 1000, 1000], tokens: { input: [580, 580, 580], output: [420, 420, 420] } },
      imspeed: { durationMs: [500, 500, 500], tokens: { input: [330, 330, 330], output: [270, 270, 270] } },
    },
  ]);
  const result = summarize(rows, { scenarioMatrix: baseScenarioMatrix });

  assert.equal(result.qualified, true);
  assert.equal(result.qualityPassed, true);
  assert.equal(result.failureReasons.length, 0);
  assert.equal(result.wallClockReductionPercent, 50);
  assert.equal(result.tokenReductionPercent, 40);
});

test("summarize fails when wall-clock improvement is below 50%", () => {
  const rows = rowsForFixture([
    {
      scenario: "small",
      superpowers: {
        durationMs: [1000, 1000, 1200],
        tokens: { input: [600, 600, 600], output: [400, 400, 400] },
      },
      imspeed: {
        durationMs: [510, 520, 500],
        tokens: { input: [300, 300, 300], output: [300, 300, 300] },
      },
    },
    {
      scenario: "medium",
      superpowers: { durationMs: [1000, 1100, 1200], tokens: { input: [620, 620, 620], output: [420, 420, 420] } },
      imspeed: { durationMs: [510, 520, 500], tokens: { input: [350, 350, 350], output: [210, 210, 210] } },
    },
    {
      scenario: "integration",
      superpowers: { durationMs: [1100, 1000, 900], tokens: { input: [580, 580, 580], output: [420, 420, 420] } },
      imspeed: { durationMs: [510, 520, 500], tokens: { input: [330, 330, 330], output: [210, 210, 210] } },
    },
  ]);
  const result = summarize(rows, { scenarioMatrix: baseScenarioMatrix });

  assert.equal(result.qualified, false);
  assert.equal(result.gates.wallClockReductionMet, false);
  assert.ok(result.failureReasons.some((reason) => reason.includes("Wall-clock reduction")));
});

test("summarize fails when token reduction is below 40%", () => {
  const rows = rowsForFixture([
    {
      scenario: "small",
      superpowers: {
        durationMs: [1000, 1200, 1100],
        tokens: { input: [600, 600, 600], output: [400, 400, 400] },
      },
      imspeed: {
        durationMs: [500, 600, 520],
        tokens: { input: [400, 400, 400], output: [300, 300, 300] },
      },
    },
    {
      scenario: "medium",
      superpowers: {
        durationMs: [1000, 1100, 1200],
        tokens: { input: [620, 620, 620], output: [420, 420, 420] },
      },
      imspeed: {
        durationMs: [500, 520, 560],
        tokens: { input: [400, 400, 400], output: [300, 300, 300] },
      },
    },
    {
      scenario: "integration",
      superpowers: { durationMs: [1100, 1000, 900], tokens: { input: [580, 580, 580], output: [420, 420, 420] } },
      imspeed: { durationMs: [500, 540, 560], tokens: { input: [400, 400, 400], output: [300, 300, 300] } },
    },
  ]);
  const result = summarize(rows, { scenarioMatrix: baseScenarioMatrix });

  assert.equal(result.qualified, false);
  assert.equal(result.gates.tokenReductionMet, false);
  assert.ok(result.failureReasons.some((reason) => reason.includes("Token reduction")));
});

test("summarize rejects unresolved Important findings", () => {
  const rows = rowsForFixture([
    {
      scenario: "small",
      superpowers: {
        durationMs: [1000, 1000, 1000],
        tokens: { input: [600, 600, 600], output: [400, 400, 400] },
      },
      imspeed: {
        durationMs: [500, 500, 500],
        tokens: { input: [300, 300, 300], output: [250, 250, 250] },
        importantOpen: 2,
      },
    },
    {
      scenario: "medium",
      superpowers: {
        durationMs: [1000, 1100, 1200],
        tokens: { input: [620, 620, 620], output: [420, 420, 420] },
      },
      imspeed: {
        durationMs: [500, 520, 540],
        tokens: { input: [350, 350, 350], output: [210, 210, 210] },
      },
    },
    {
      scenario: "integration",
      superpowers: { durationMs: [1100, 1000, 900], tokens: { input: [580, 580, 580], output: [420, 420, 420] } },
      imspeed: {
        durationMs: [520, 540, 560],
        tokens: { input: [330, 330, 330], output: [210, 210, 210] },
      },
    },
  ]);
  const result = summarize(rows, { scenarioMatrix: baseScenarioMatrix });

  assert.equal(result.qualified, false);
  assert.equal(result.gates.importantFindingsPassed, false);
  assert.ok(result.failureReasons.some((reason) => reason.includes("Unresolved Important")));
});

test("summarize rejects unresolved Critical findings", () => {
  const rows = rowsForFixture([
    {
      scenario: "small",
      superpowers: {
        durationMs: [1000, 1000, 1000],
        tokens: { input: [600, 600, 600], output: [400, 400, 400] },
      },
      imspeed: {
        durationMs: [500, 500, 500],
        tokens: { input: [300, 300, 300], output: [250, 250, 250] },
        criticalOpen: 1,
      },
    },
    {
      scenario: "medium",
      superpowers: {
        durationMs: [1000, 1100, 1200],
        tokens: { input: [620, 620, 620], output: [420, 420, 420] },
      },
      imspeed: {
        durationMs: [500, 520, 540],
        tokens: { input: [350, 350, 350], output: [210, 210, 210] },
      },
    },
    {
      scenario: "integration",
      superpowers: { durationMs: [1100, 1000, 900], tokens: { input: [580, 580, 580], output: [420, 420, 420] } },
      imspeed: { durationMs: [520, 540, 560], tokens: { input: [330, 330, 330], output: [210, 210, 210] } },
    },
  ]);
  const result = summarize(rows, { scenarioMatrix: baseScenarioMatrix });

  assert.equal(result.qualified, false);
  assert.equal(result.gates.criticalFindingsPassed, false);
  assert.ok(result.failureReasons.some((reason) => reason.includes("Unresolved Critical")));
});

test("summarize detects functional regression", () => {
  const rows = rowsForFixture([
    {
      scenario: "small",
      superpowers: { durationMs: [1000, 1000, 1000], tokens: { input: [600, 600, 600], output: [400, 400, 400] } },
      imspeed: {
        durationMs: [500, 500, 500],
        tokens: { input: [300, 300, 300], output: [250, 250, 250] },
        testsPassed: false,
      },
    },
    {
      scenario: "medium",
      superpowers: { durationMs: [1000, 1100, 1200], tokens: { input: [620, 620, 620], output: [420, 420, 420] } },
      imspeed: { durationMs: [520, 540, 560], tokens: { input: [350, 350, 350], output: [210, 210, 210] } },
    },
    {
      scenario: "integration",
      superpowers: { durationMs: [1100, 1000, 900], tokens: { input: [580, 580, 580], output: [420, 420, 420] } },
      imspeed: { durationMs: [520, 540, 560], tokens: { input: [330, 330, 330], output: [210, 210, 210] } },
    },
  ]);

  const result = summarize(rows, { scenarioMatrix: baseScenarioMatrix });

  assert.equal(result.qualified, false);
  assert.equal(result.gates.functionalRegressionPassed, false);
  assert.ok(result.failureReasons.some((reason) => reason.toLowerCase().includes("functional regression")));
});

test("summarize rejects incomplete scenario coverage", () => {
  const rows = rowsForFixture([
    {
      scenario: "small",
      superpowers: { durationMs: [1000, 1000, 1000], tokens: { input: [600, 600, 600], output: [400, 400, 400] } },
      imspeed: { durationMs: [500, 500, 500], tokens: { input: [300, 300, 300], output: [250, 250, 250] } },
    },
  ]);

  const result = summarize(rows, { scenarioMatrix: baseScenarioMatrix });

  assert.equal(result.qualified, false);
  assert.equal(result.measurements.ready, false);
  assert.ok(result.failureReasons.some((reason) => reason.includes("Missing required runs")));
  assert.ok(result.failureReasons.some((reason) => reason.includes('"medium"')));
});

test("summarize validates explicit run identities and rejects unexpected or duplicate run IDs", () => {
  const matrix = [
    { id: "small", expectedRuns: 3, runIds: ["run-a", "run-b", "run-c"], shape: "one or two files" },
  ];
  const rows = [
    ...scenarioRows("small", "superpowers", {
      durationMs: [1000, 1000, 1000],
      inputTokens: [600, 600, 600],
      outputTokens: [400, 400, 400],
      runIds: ["run-a", "run-b", "run-c"],
    }),
    ...scenarioRows("small", "imspeed", {
      durationMs: [500, 500, 500],
      inputTokens: [300, 300, 300],
      outputTokens: [250, 250, 250],
      runIds: ["run-a", "run-b", "run-b"],
    }),
    {
      scenario: "small",
      workflow: "imspeed",
      durationMs: 500,
      inputTokens: 300,
      outputTokens: 250,
      runId: "run-x",
      testsPassed: true,
      criticalOpen: 0,
      importantOpen: 0,
    },
  ];

  const result = summarize(rows, { scenarioMatrix: matrix });

  assert.equal(result.qualified, false);
  assert.equal(result.measurements.ready, false);
  assert.ok(result.failureReasons.some((reason) => reason.includes("duplicate")));
  assert.ok(result.failureReasons.some((reason) => reason.includes("Unexpected runId")));
});

test("summarize computes odd-sized and even-sized medians deterministically", () => {
  const oddRows = rowsForFixture([
    {
      scenario: "small",
      superpowers: { durationMs: [10, 30, 20], tokens: { input: [100, 100, 100], output: [100, 100, 100] } },
      imspeed: { durationMs: [6, 8, 5], tokens: { input: [60, 60, 60], output: [40, 40, 40] } },
    },
  ]);
  const oddResult = summarize(oddRows, {
    scenarioMatrix: [{ id: "small", expectedRuns: 3, runIds: ["run-1", "run-2", "run-3"], shape: "one or two files" }],
  });

  assert.equal(oddResult.baselineMedianDurationMs, 20);
  assert.equal(oddResult.imspeedMedianDurationMs, 6);

  const evenRows = [
    ...scenarioRows("small", "superpowers", {
      durationMs: [20, 40, 10, 30],
      inputTokens: [100, 100, 100, 100],
      outputTokens: [100, 100, 100, 100],
      runIds: ["run-a", "run-b", "run-c", "run-d"],
    }),
    ...scenarioRows("small", "imspeed", {
      durationMs: [6, 2, 4, 8],
      inputTokens: [60, 60, 60, 60],
      outputTokens: [40, 40, 40, 40],
      runIds: ["run-a", "run-b", "run-c", "run-d"],
    }),
  ];
  const evenResult = summarize(evenRows, {
    scenarioMatrix: [{ id: "small", expectedRuns: 4, runIds: ["run-a", "run-b", "run-c", "run-d"], shape: "one or two files" }],
  });

  assert.equal(evenResult.baselineMedianDurationMs, 25);
  assert.equal(evenResult.imspeedMedianDurationMs, 5);
});

test("summarize validates zero, negative, and non-finite numeric values", () => {
  const validRows = rowsForFixture([
    {
      scenario: "small",
      superpowers: { durationMs: [0, 0, 0], tokens: { input: [100, 100, 100], output: [100, 100, 100] } },
      imspeed: { durationMs: [0, 0, 0], tokens: { input: [50, 50, 50], output: [50, 50, 50] } },
    },
  ]);
  const zeroResult = summarize(validRows, {
    scenarioMatrix: [{ id: "small", expectedRuns: 3, runIds: ["run-1", "run-2", "run-3"], shape: "one or two files" }],
  });
  assert.equal(zeroResult.measurements.ready, true);

  const negativeRows = rowsForFixture([
    {
      scenario: "small",
      superpowers: { durationMs: [1000, 1000, 1000], tokens: { input: [600, 600, 600], output: [400, 400, 400] } },
      imspeed: { durationMs: [500, -1, 500], tokens: { input: [300, 300, 300], output: [250, 250, 250] } },
    },
  ]);
  const negativeResult = summarize(negativeRows, {
    scenarioMatrix: [{ id: "small", expectedRuns: 3, runIds: ["run-1", "run-2", "run-3"], shape: "one or two files" }],
  });
  assert.equal(negativeResult.qualified, false);
  assert.equal(negativeResult.measurements.ready, false);
  assert.ok(negativeResult.failureReasons.some((reason) => reason.includes("durationMs")));

  const nanRows = rowsForFixture([
    {
      scenario: "small",
      superpowers: { durationMs: [1000, 1000, 1000], tokens: { input: [600, 600, 600], output: [400, 400, 400] } },
      imspeed: {
        durationMs: [500, 500, 500],
        tokens: { input: [300, NaN, 300], output: [250, 250, 250] },
      },
    },
  ]);
  const nanResult = summarize(nanRows, {
    scenarioMatrix: [{ id: "small", expectedRuns: 3, runIds: ["run-1", "run-2", "run-3"], shape: "one or two files" }],
  });
  assert.equal(nanResult.measurements.ready, false);
  assert.ok(nanResult.failureReasons.some((reason) => reason.includes("inputTokens")));

  const infiniteRows = rowsForFixture([
    {
      scenario: "small",
      superpowers: { durationMs: [1000, 1000, 1000], tokens: { input: [600, 600, 600], output: [400, 400, 400] } },
      imspeed: {
        durationMs: [500, 500, 500],
        tokens: { input: [300, 300, 300], output: [250, Number.POSITIVE_INFINITY, 250] },
      },
    },
  ]);
  const infiniteResult = summarize(infiniteRows, {
    scenarioMatrix: [{ id: "small", expectedRuns: 3, runIds: ["run-1", "run-2", "run-3"], shape: "one or two files" }],
  });
  assert.equal(infiniteResult.measurements.ready, false);
  assert.ok(infiniteResult.failureReasons.some((reason) => reason.includes("outputTokens")));
});

test("summarize emits explicit reasons for malformed or missing data", () => {
  const result = summarize([
    {
      scenario: "small",
      workflow: "imspeed",
      durationMs: 500,
      inputTokens: 300,
      outputTokens: 250,
      runId: "run-1",
      testsPassed: true,
      criticalOpen: 0,
      importantOpen: 0,
    },
    {
      scenario: "small",
      workflow: "superpowers",
      inputTokens: 600,
      outputTokens: 400,
      testsPassed: true,
      criticalOpen: 0,
      importantOpen: 0,
      runId: "run-1",
    },
  ], { scenarioMatrix: [{ id: "small", expectedRuns: 1, runIds: ["run-1"], shape: "one or two files" }] });

  assert.equal(result.qualified, false);
  assert.ok(result.failureReasons.length >= 1);
  assert.ok(result.failureReasons.some((reason) => reason.includes("durationMs")));
  assert.equal(result.measurements.ready, false);
});

test("summarize CLI prints usage when no path provided", () => {
  let error;
  try {
    runCli([]);
    assert.fail("Expected CLI call to fail when no input path is provided");
  } catch (caught) {
    error = caught;
  }
  assert.ok(error.status === 2 || error.code === 2);
  assert.match(error.stderr, /Usage: node scripts\/summarize-benchmark.mjs/);
});

test("summarize CLI rejects invalid JSON lines", () => {
  const { dir, file } = writeTempFixture("{\"scenario\":\"small\",\"workflow\":\"superpowers\",\"durationMs\":1000,\"inputTokens\":100,\"outputTokens\":100,\"runId\":\"run-1\",\"testsPassed\":true,\"criticalOpen\":0,\"importantOpen\":0}\n{bad-json\n");
  try {
    try {
      runCli([file]);
      assert.fail("Expected CLI call to fail on invalid JSON lines");
    } catch (error) {
      assert.match(error.stderr, /Invalid JSON at line 2/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
