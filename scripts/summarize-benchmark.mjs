import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WALL_CLOCK_THRESHOLD_PERCENT = 50;
const TOKEN_THRESHOLD_PERCENT = 40;
const REQUIRED_WORKFLOWS = ["superpowers", "imspeed"];

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

const summarize = (rows) => {
  const validationErrors = [];
  if (!Array.isArray(rows)) {
    validationErrors.push("Input rows must be an array.");
    return buildFailureSummary(rows, validationErrors);
  }

  const rowsByWorkflow = { superpowers: [], imspeed: [] };
  for (let index = 0; index < rows.length; index += 1) {
    const error = parseRow(rows[index], index);
    if (error) {
      validationErrors.push(error);
      continue;
    }
    rowsByWorkflow[rows[index].workflow].push(rows[index]);
  }

  if (rowsByWorkflow.superpowers.length === 0 || rowsByWorkflow.imspeed.length === 0) {
    validationErrors.push("Both superpowers and imspeed workflow records are required.");
  }

  if (validationErrors.length > 0) {
    return buildFailureSummary(rows, validationErrors);
  }

  const base = summarizeWorkflow(rowsByWorkflow.superpowers);
  const im = summarizeWorkflow(rowsByWorkflow.imspeed);
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

  const summary = {
    measurements: {
      ready: true,
      recordCount: rows.length,
      workflows: {
        superpowers: rowsByWorkflow.superpowers.length,
        imspeed: rowsByWorkflow.imspeed.length,
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

  return summary;
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

export { summarize };
