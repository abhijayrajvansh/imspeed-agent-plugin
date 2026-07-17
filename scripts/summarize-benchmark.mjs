import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WALL_CLOCK_THRESHOLD_PERCENT = 50;
const TOKEN_THRESHOLD_PERCENT = 40;
const REQUIRED_WORKFLOWS = ["superpowers", "imspeed"];
const SCENARIO_MATRIX_PATH = fileURLToPath(new URL("../benchmarks/scenarios.json", import.meta.url));

const isFiniteNonNegativeNumber = (value) => Number.isFinite(value) && value >= 0;

const toValidationError = (message) => `${message}`;

const median = (values) => {
  if (!values.length) {
    throw new Error("Cannot calculate median from empty value list.");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const parseRow = (row, index) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return toValidationError(`Row #${index + 1} is not an object.`);
  }

  const fieldErrors = [];
  const requiredStringFields = ["scenario", "workflow"];
  for (const field of requiredStringFields) {
    if (typeof row[field] !== "string" || row[field].trim() === "") {
      fieldErrors.push(`Row #${index + 1}: missing or empty "${field}".`);
    }
  }

  if (!REQUIRED_WORKFLOWS.includes(row.workflow)) {
    fieldErrors.push(`Row #${index + 1}: unknown workflow "${row.workflow}".`);
  }

  for (const field of ["durationMs", "inputTokens", "outputTokens"]) {
    if (!isFiniteNonNegativeNumber(row[field])) {
      fieldErrors.push(`Row #${index + 1}: "${field}" must be a non-negative number.`);
    }
  }

  if (typeof row.testsPassed !== "boolean") {
    fieldErrors.push(`Row #${index + 1}: "testsPassed" must be a boolean.`);
  }
  if (!Number.isInteger(row.criticalOpen) || row.criticalOpen < 0) {
    fieldErrors.push(`Row #${index + 1}: "criticalOpen" must be a non-negative integer.`);
  }
  if (!Number.isInteger(row.importantOpen) || row.importantOpen < 0) {
    fieldErrors.push(`Row #${index + 1}: "importantOpen" must be a non-negative integer.`);
  }

  if (!fieldErrors.length) {
    return null;
  }
  return fieldErrors.join(" ");
};

const summarizeWorkflow = (rows) => {
  const durations = rows.map((row) => row.durationMs);
  const totals = rows.map((row) => row.inputTokens + row.outputTokens);
  return {
    medianDurationMs: median(durations),
    medianTotalTokens: median(totals),
    testPassRate: rows.filter((row) => row.testsPassed).length / rows.length,
    maxCriticalOpen: Math.max(...rows.map((row) => row.criticalOpen)),
    maxImportantOpen: Math.max(...rows.map((row) => row.importantOpen)),
  };
};

const buildFailureSummary = (rows, reasons) => ({
  measurements: {
    ready: false,
    recordCount: Array.isArray(rows) ? rows.length : 0,
  },
  baseline: {
    medianDurationMs: null,
    medianTotalTokens: null,
    testPassRate: null,
    maxCriticalOpen: null,
    maxImportantOpen: null,
  },
  imspeed: {
    medianDurationMs: null,
    medianTotalTokens: null,
    testPassRate: null,
    maxCriticalOpen: null,
    maxImportantOpen: null,
  },
  baselineMedianDurationMs: null,
  imspeedMedianDurationMs: null,
  baselineMedianTokens: null,
  imspeedMedianTokens: null,
  wallClockReductionPercent: null,
  tokenReductionPercent: null,
  qualityPassed: false,
  qualified: false,
  gates: {
    wallClockReductionMet: false,
    tokenReductionMet: false,
    functionalRegressionPassed: false,
    criticalFindingsPassed: false,
    importantFindingsPassed: false,
  },
  failureReasons: reasons,
});

const normalizeScenarioMatrix = (scenarioMatrix) => {
  const validationErrors = [];

  if (!Array.isArray(scenarioMatrix)) {
    return { scenarios: [], validationErrors: ["Scenario matrix must be an array."] };
  }

  const scenarios = [];
  const scenarioIds = new Set();

  for (let index = 0; index < scenarioMatrix.length; index += 1) {
    const scenario = scenarioMatrix[index];
    if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
      validationErrors.push(`Scenario #${index + 1} must be an object.`);
      continue;
    }

    if (typeof scenario.id !== "string" || scenario.id.trim() === "") {
      validationErrors.push(`Scenario #${index + 1}: missing or empty "id".`);
      continue;
    }

    const id = scenario.id;
    if (scenarioIds.has(id)) {
      validationErrors.push(`Scenario "${id}" is duplicated in matrix.`);
      continue;
    }
    scenarioIds.add(id);

    if (!Number.isInteger(scenario.expectedRuns) || scenario.expectedRuns <= 0) {
      validationErrors.push(`Scenario "${id}": expectedRuns must be a positive integer.`);
      continue;
    }

    let runIds;
    if (scenario.runIds !== undefined) {
      if (!Array.isArray(scenario.runIds)) {
        validationErrors.push(`Scenario "${id}": runIds must be an array when provided.`);
      } else {
        if (scenario.runIds.length !== scenario.expectedRuns) {
          validationErrors.push(`Scenario "${id}": runIds length must equal expectedRuns (${scenario.expectedRuns}).`);
        }
        runIds = [];
        const runIdSet = new Set();
        for (let runIdIndex = 0; runIdIndex < scenario.runIds.length; runIdIndex += 1) {
          const runId = scenario.runIds[runIdIndex];
          if (typeof runId !== "string" || runId.trim() === "") {
            validationErrors.push(`Scenario "${id}": runIds[${runIdIndex}] must be a non-empty string.`);
          } else if (runIdSet.has(runId)) {
            validationErrors.push(`Scenario "${id}": runIds contains duplicate id "${runId}".`);
          } else {
            runIdSet.add(runId);
            runIds.push(runId);
          }
        }
      }
    }

    scenarios.push({
      id,
      expectedRuns: scenario.expectedRuns,
      runIds,
      shape: scenario.shape,
    });
  }

  return { scenarios, validationErrors };
};

const keyFor = (scenario, workflow) => `${scenario}|${workflow}`;

const summarize = (rows, options = {}) => {
  const validationErrors = [];
  let scenarioMatrix;

  if (!Array.isArray(rows)) {
    validationErrors.push("Input rows must be an array.");
    return buildFailureSummary(rows, validationErrors);
  }

  try {
    scenarioMatrix = options.scenarioMatrix ?? JSON.parse(readFileSync(SCENARIO_MATRIX_PATH, "utf8"));
  } catch {
    validationErrors.push(`Unable to load benchmark scenario matrix from ${SCENARIO_MATRIX_PATH}.`);
    return buildFailureSummary(rows, validationErrors);
  }

  const { scenarios: scenarioDefinitions, validationErrors: scenarioErrors } = normalizeScenarioMatrix(scenarioMatrix);
  if (scenarioErrors.length > 0) {
    return buildFailureSummary(rows, [...scenarioErrors]);
  }

  const scenarioSpecById = new Map(scenarioDefinitions.map((scenario) => [scenario.id, scenario]));
  const rowsByScenarioWorkflow = new Map();
  const seenRunIdsByScenarioWorkflow = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const error = parseRow(row, index);
    if (error) {
      validationErrors.push(error);
      continue;
    }

    const scenario = row.scenario;
    const workflow = row.workflow;
    const workflowKey = keyFor(scenario, workflow);
    const scenarioSpec = scenarioSpecById.get(scenario);

    if (!scenarioSpec) {
      validationErrors.push(`Row #${index + 1}: unexpected scenario "${scenario}".`);
      continue;
    }

    const rowKey = keyFor(scenario, workflow);
    const expectedRunIds = scenarioSpec.runIds;
    if (expectedRunIds) {
      if (typeof row.runId !== "string" || row.runId.trim() === "") {
        validationErrors.push(`Row #${index + 1}: missing or empty "runId" for scenario "${scenario}".`);
      } else {
        if (!expectedRunIds.includes(row.runId)) {
          validationErrors.push(`Row #${index + 1}: Unexpected runId "${row.runId}" for scenario "${scenario}".`);
        } else {
          const seen = seenRunIdsByScenarioWorkflow.get(rowKey) ?? new Set();
          if (seen.has(row.runId)) {
            validationErrors.push(`Row #${index + 1}: duplicate runId "${row.runId}" for scenario "${scenario}" and workflow "${workflow}".`);
          } else {
            seen.add(row.runId);
            seenRunIdsByScenarioWorkflow.set(rowKey, seen);
          }
        }
      }
    }

    const rowList = rowsByScenarioWorkflow.get(workflowKey) ?? [];
    rowList.push(row);
    rowsByScenarioWorkflow.set(workflowKey, rowList);
  }

  for (const scenarioSpec of scenarioDefinitions) {
    const expectedRuns = scenarioSpec.expectedRuns;
    const scenario = scenarioSpec.id;
    const runIds = scenarioSpec.runIds;

    const superRows = rowsByScenarioWorkflow.get(keyFor(scenario, "superpowers")) ?? [];
    const imspeedRows = rowsByScenarioWorkflow.get(keyFor(scenario, "imspeed")) ?? [];
    if (superRows.length !== expectedRuns) {
      validationErrors.push(`Missing required runs for scenario "${scenario}" and workflow "superpowers": got ${superRows.length}, expected ${expectedRuns}.`);
    }
    if (imspeedRows.length !== expectedRuns) {
      validationErrors.push(`Missing required runs for scenario "${scenario}" and workflow "imspeed": got ${imspeedRows.length}, expected ${expectedRuns}.`);
    }

    if (runIds) {
      const superSeen = seenRunIdsByScenarioWorkflow.get(keyFor(scenario, "superpowers")) ?? new Set();
      const imSeen = seenRunIdsByScenarioWorkflow.get(keyFor(scenario, "imspeed")) ?? new Set();
      for (const runId of runIds) {
        if (!superSeen.has(runId)) {
          validationErrors.push(`Scenario "${scenario}" missing superpowers runId "${runId}".`);
        }
        if (!imSeen.has(runId)) {
          validationErrors.push(`Scenario "${scenario}" missing imspeed runId "${runId}".`);
        }
      }
    }
  }

  if (!validationErrors.length) {
    const superRows = [];
    const imRows = [];
    for (const definition of scenarioDefinitions) {
      superRows.push(...(rowsByScenarioWorkflow.get(keyFor(definition.id, "superpowers")) ?? []));
      imRows.push(...(rowsByScenarioWorkflow.get(keyFor(definition.id, "imspeed")) ?? []));
    }
    const base = summarizeWorkflow(superRows);
    const im = summarizeWorkflow(imRows);

    const wallClockReductionPercent = ((base.medianDurationMs - im.medianDurationMs) / base.medianDurationMs) * 100;
    const tokenReductionPercent = ((base.medianTotalTokens - im.medianTotalTokens) / base.medianTotalTokens) * 100;

    const gates = {
      wallClockReductionMet: wallClockReductionPercent >= WALL_CLOCK_THRESHOLD_PERCENT,
      tokenReductionMet: tokenReductionPercent >= TOKEN_THRESHOLD_PERCENT,
      functionalRegressionPassed: im.testPassRate >= base.testPassRate,
      criticalFindingsPassed: im.maxCriticalOpen === 0,
      importantFindingsPassed: im.maxImportantOpen === 0,
    };

    const qualityPassed = gates.functionalRegressionPassed && gates.criticalFindingsPassed && gates.importantFindingsPassed;

    const failureReasons = [];
    if (!gates.wallClockReductionMet) {
      failureReasons.push(`Wall-clock reduction below threshold: ${wallClockReductionPercent.toFixed(2)}% (min ${WALL_CLOCK_THRESHOLD_PERCENT}%).`);
    }
    if (!gates.tokenReductionMet) {
      failureReasons.push(`Token reduction below threshold: ${tokenReductionPercent.toFixed(2)}% (min ${TOKEN_THRESHOLD_PERCENT}%).`);
    }
    if (!gates.functionalRegressionPassed) {
      failureReasons.push(`Functional regression detected: imspeed test pass rate ${im.testPassRate.toFixed(2)} vs baseline ${base.testPassRate.toFixed(2)}.`);
    }
    if (!gates.criticalFindingsPassed) {
      failureReasons.push(`Unresolved Critical findings detected (max open: ${im.maxCriticalOpen}).`);
    }
    if (!gates.importantFindingsPassed) {
      failureReasons.push(`Unresolved Important findings detected (max open: ${im.maxImportantOpen}).`);
    }

    return {
      measurements: {
        ready: true,
        recordCount: rows.length,
        workflows: {
          superpowers: superRows.length,
          imspeed: imRows.length,
        },
        baselines: {
          baseline: base,
          imspeed: im,
        },
        thresholds: {
          wallClockPercentMin: WALL_CLOCK_THRESHOLD_PERCENT,
          tokenPercentMin: TOKEN_THRESHOLD_PERCENT,
        },
      },
      baseline: {
        medianDurationMs: base.medianDurationMs,
        medianTotalTokens: base.medianTotalTokens,
        testPassRate: base.testPassRate,
        maxCriticalOpen: base.maxCriticalOpen,
        maxImportantOpen: base.maxImportantOpen,
      },
      imspeed: {
        medianDurationMs: im.medianDurationMs,
        medianTotalTokens: im.medianTotalTokens,
        testPassRate: im.testPassRate,
        maxCriticalOpen: im.maxCriticalOpen,
        maxImportantOpen: im.maxImportantOpen,
      },
      baselineMedianDurationMs: base.medianDurationMs,
      imspeedMedianDurationMs: im.medianDurationMs,
      baselineMedianTokens: base.medianTotalTokens,
      imspeedMedianTokens: im.medianTotalTokens,
      wallClockReductionPercent,
      tokenReductionPercent,
      qualityPassed,
      gates,
      qualified: qualityPassed && gates.wallClockReductionMet && gates.tokenReductionMet,
      failureReasons,
    };
  }

  return buildFailureSummary(rows, validationErrors);
};

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node scripts/summarize-benchmark.mjs <results.jsonl>");
    process.exit(2);
  }

  const content = await readFile(input, "utf8");
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`Invalid JSON at line ${index + 1}`);
      }
    });
  const summary = summarize(rows);
  console.log(JSON.stringify(summary, null, 2));
}

export { summarize, SCENARIO_MATRIX_PATH };
