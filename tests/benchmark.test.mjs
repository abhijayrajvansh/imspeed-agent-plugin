import assert from "node:assert/strict";
import test from "node:test";
import { summarize } from "../scripts/summarize-benchmark.mjs";

const scenarioRows = (scenario, workflow, { durationMs, inputTokens, outputTokens, testsPassed = true, criticalOpen = 0, importantOpen = 0 }) => {
  const scenarioRuns = [];
  for (let i = 0; i < durationMs.length; i += 1) {
    scenarioRuns.push({
      scenario,
      workflow,
      durationMs: durationMs[i],
      inputTokens: inputTokens[i],
      outputTokens: outputTokens[i],
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
      },
    ));
  }
  return rows;
};

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
  const result = summarize(rows);

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
  const result = summarize(rows);

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
  const result = summarize(rows);

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
  const result = summarize(rows);

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
  const result = summarize(rows);

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

  const result = summarize(rows);

  assert.equal(result.qualified, false);
  assert.equal(result.gates.functionalRegressionPassed, false);
  assert.ok(result.failureReasons.some((reason) => reason.toLowerCase().includes("functional regression")));
});

test("summarize emits explicit reasons for malformed or missing data", () => {
  const result = summarize([
    {
      scenario: "small",
      workflow: "imspeed",
      durationMs: 500,
      inputTokens: 300,
      outputTokens: 250,
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
    },
  ]);

  assert.equal(result.qualified, false);
  assert.ok(result.failureReasons.length >= 1);
  assert.ok(result.failureReasons.some((reason) => reason.includes("durationMs")));
  assert.equal(result.measurements.ready, false);
});
