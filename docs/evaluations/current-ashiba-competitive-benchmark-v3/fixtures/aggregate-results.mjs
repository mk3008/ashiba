#!/usr/bin/env node
/**
 * Rebuild the benchmark's compact result index from immutable evidence.
 *
 * This is deliberately an extractor, not a scorer.  It neither runs a
 * candidate nor interprets a missing field as a pass, failure, repair, or
 * tool property.  The full runner and attempt documents remain authoritative
 * at the paths emitted in the index.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const PRIMARY_CELL = /^(G1|T1|T2|Q1)-(A|P|S|D|K|G)-r(\d+)$/;
const SECONDARY_CELL = /^(AF-V|AF-L|X1|SD|E1)-(A|P|S|D|K|G)-r(\d+)$/;

function usage(message) {
  console.error(`Usage: node fixtures/aggregate-results.mjs --root <benchmark-dir> [--json <path>] [--csv <path>]`);
  if (message) console.error(`Error: ${message}`);
  process.exitCode = 2;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) usage(`unexpected argument ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) usage(`missing value for ${key}`);
    args[key.slice(2)] = value;
    index += 1;
  }
  if (!args.root) usage("--root is required");
  return args;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { __aggregationReadError: String(error?.message ?? error) };
  }
}

function maybeJson(path) {
  return existsSync(path) ? readJson(path) : null;
}

function hash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sortedDirectories(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function resultStatus(document) {
  if (!document || typeof document !== "object") return null;
  return typeof document.status === "string" ? document.status : null;
}

function checkSummary(document) {
  if (!Array.isArray(document?.checks)) return null;
  const statusCounts = {};
  for (const check of document.checks) {
    const status = typeof check?.status === "string" ? check.status : "missing";
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }
  return { total: document.checks.length, statusCounts };
}

function sourceSummary(document) {
  if (!document?.source || typeof document.source !== "object") return null;
  return {
    pass: typeof document.source.pass === "boolean" ? document.source.pass : null,
    fileCount: Array.isArray(document.source.files) ? document.source.files.length : null,
    findingCount: Array.isArray(document.source.findings) ? document.source.findings.length : null,
  };
}

function liveSummary(document) {
  if (!document || typeof document !== "object") return null;
  return {
    status: resultStatus(document),
    harness: typeof document.harness === "string" ? document.harness : null,
    workloads: Array.isArray(document.workloads) ? document.workloads : null,
    checks: checkSummary(document),
    source: sourceSummary(document),
    cleanup: document.cleanup ?? null,
    startedAt: typeof document.startedAt === "string" ? document.startedAt : null,
    finishedAt: typeof document.finishedAt === "string" ? document.finishedAt : null,
  };
}

function fileReference(root, path) {
  if (!existsSync(path)) return null;
  return { path: relative(root, path).replaceAll("\\", "/"), sha256: hash(path) };
}

function attemptRecord(root, attemptDirectory, ordinal) {
  const attemptPath = join(attemptDirectory, "attempt.json");
  const firstPassPath = join(attemptDirectory, "first-pass.json");
  const runnerPath = join(attemptDirectory, "runner-result.json");
  const treatmentPath = join(attemptDirectory, "treatment-review.json");
  const finalizationPath = join(attemptDirectory, "finalization.json");
  const attempt = maybeJson(attemptPath);
  const runnerCapture = maybeJson(runnerPath);
  const liveDocument = runnerCapture?.value ?? null;

  // An attempt after ordinal zero is recorded as an additional attempt.  The
  // evidence format does not consistently label an attempt as a repair, so
  // this extractor intentionally does not classify it as one.
  return {
    ordinal,
    additionalAttempt: ordinal > 0,
    attempt: attempt
      ? {
          attemptId: typeof attempt.attemptId === "string" ? attempt.attemptId : null,
          createdAt: typeof attempt.createdAt === "string" ? attempt.createdAt : null,
          scoring: typeof attempt.scoring === "string" ? attempt.scoring : null,
          cleanup: attempt.cleanup ?? null,
          source: fileReference(root, attemptPath),
        }
      : null,
    firstPass: maybeJson(firstPassPath),
    live: liveSummary(liveDocument),
    treatment: maybeJson(treatmentPath),
    finalization: maybeJson(finalizationPath),
    repair: {
      classification: null,
      classificationSource: null,
      note: "The primary evidence schema does not provide a normalized repair classification; additionalAttempt is not interpreted as a repair category.",
    },
    sources: {
      firstPass: fileReference(root, firstPassPath),
      runner: fileReference(root, runnerPath),
      treatment: fileReference(root, treatmentPath),
      finalization: fileReference(root, finalizationPath),
    },
  };
}

function parseCell(name, matcher) {
  const match = name.match(matcher);
  if (!match) return null;
  return { workloadOrControl: match[1], arm: match[2], replicate: Number(match[3]) };
}

function primaryRecords(root) {
  const evidenceRoot = join(root, "evidence");
  return sortedDirectories(evidenceRoot)
    .map((cell) => {
      const metadata = parseCell(cell, PRIMARY_CELL);
      if (!metadata) return null;
      const cellRoot = join(evidenceRoot, cell);
      const attemptRoot = join(cellRoot, "attempts");
      const attempts = sortedDirectories(attemptRoot).map((name, ordinal) =>
        attemptRecord(root, join(attemptRoot, name), ordinal),
      );
      const finalRunnerPath = join(cellRoot, "runner.json");
      const finalRunner = maybeJson(finalRunnerPath);
      return {
        kind: "primary",
        cell,
        ...metadata,
        evidenceRoot: relative(root, cellRoot).replaceAll("\\", "/"),
        attemptCount: attempts.length,
        additionalAttemptCount: Math.max(0, attempts.length - 1),
        firstAttempt: attempts[0] ?? null,
        finalAttempt: attempts.at(-1) ?? null,
        finalLive: liveSummary(finalRunner),
        finalLiveSource: fileReference(root, finalRunnerPath),
        attempts,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.cell.localeCompare(right.cell));
}

function walkRunnerDocuments(root, directory) {
  const results = [];
  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile() && entry.name === "runner.json") {
        results.push(path);
      }
    }
  }
  if (existsSync(directory)) walk(directory);
  return results.sort((left, right) => left.localeCompare(right));
}

function secondaryRecords(root) {
  const evidenceRoot = join(root, "secondary-evidence");
  return sortedDirectories(evidenceRoot)
    .map((cell) => {
      const metadata = parseCell(cell, SECONDARY_CELL);
      if (!metadata) return null;
      const cellRoot = join(evidenceRoot, cell);
      const observations = walkRunnerDocuments(root, cellRoot).map((path) => {
        const document = readJson(path);
        return {
          evidencePath: relative(root, path).replaceAll("\\", "/"),
          sha256: hash(path),
          live: liveSummary(document),
          architectureDelta: document?.architectureDelta ?? null,
          deltaComplete: typeof document?.deltaComplete === "boolean" ? document.deltaComplete : null,
        };
      });
      return {
        kind: "secondary",
        cell,
        ...metadata,
        evidenceRoot: relative(root, cellRoot).replaceAll("\\", "/"),
        observationCount: observations.length,
        observations,
        note: "Secondary evidence is retained as observations. This extractor does not infer a final observation from directory labels such as corrected.",
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.cell.localeCompare(right.cell));
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvRows(primary, secondary) {
  const header = [
    "kind",
    "cell",
    "workload_or_control",
    "arm",
    "replicate",
    "evidence_path",
    "attempt_count",
    "additional_attempt_count",
    "first_build_status",
    "first_typecheck_status",
    "first_test_status",
    "first_runner_status",
    "final_live_status",
    "final_treatment_value",
    "final_cleanup_status",
    "observation_index",
    "note",
  ];
  const rows = [header];
  for (const record of primary) {
    const slots = record.firstAttempt?.firstPass?.slots ?? {};
    rows.push([
      record.kind,
      record.cell,
      record.workloadOrControl,
      record.arm,
      record.replicate,
      record.finalLiveSource?.path ?? record.evidenceRoot,
      record.attemptCount,
      record.additionalAttemptCount,
      slots.build?.status ?? null,
      slots.typecheck?.status ?? null,
      slots.test?.status ?? null,
      slots.runner?.status ?? null,
      record.finalLive?.status ?? null,
      record.finalAttempt?.treatment?.value ?? null,
      record.finalLive?.cleanup?.status ?? null,
      null,
      "No aggregate score or winner is computed.",
    ]);
  }
  for (const record of secondary) {
    record.observations.forEach((observation, index) => {
      rows.push([
        record.kind,
        record.cell,
        record.workloadOrControl,
        record.arm,
        record.replicate,
        observation.evidencePath,
        null,
        null,
        null,
        null,
        null,
        null,
        observation.live?.status ?? null,
        null,
        observation.live?.cleanup?.status ?? null,
        index,
        record.note,
      ]);
    });
  }
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

const args = parseArgs(process.argv.slice(2));
const root = resolve(args.root);
if (!existsSync(root) || !statSync(root).isDirectory()) usage(`root does not exist: ${root}`);
const jsonOutput = resolve(args.json ?? join(root, "raw-results.json"));
const csvOutput = resolve(args.csv ?? join(root, "results.csv"));
const primary = primaryRecords(root);
const secondary = secondaryRecords(root);
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  generator: {
    path: relative(root, resolve(import.meta.dirname, "aggregate-results.mjs")).replaceAll("\\", "/"),
    sha256: hash(resolve(import.meta.dirname, "aggregate-results.mjs")),
  },
  // The output is relocatable: all retained evidence links are relative to
  // this benchmark directory rather than to the coordinator's machine.
  inputRoot: ".",
  interpretationPolicy: {
    noAggregateWinnerOrRanking: true,
    missingFieldPolicy: "Missing or undocumented fields remain null/absent and are not interpreted as a pass, failure, repair, or tool-quality signal.",
    attemptPolicy: "Each preserved primary attempt is listed in chronological directory order. An attempt after the first is recorded as an additional attempt; repair taxonomy is left null unless a source schema supplies it.",
    secondaryPolicy: "Each secondary runner document is an observation. Directory names do not establish a final result.",
  },
  limitations: [
    "Token and credit telemetry are not synthesized by this extractor. They remain unavailable unless recorded in source evidence or the orchestration ledger.",
    "The compact index does not replace immutable runner outputs, command logs, candidate snapshots, or attempt manifests.",
    "This extractor summarizes recorded fields only; it does not determine treatment fidelity, candidate quality, or causal tool effects.",
  ],
  inventory: {
    primaryCellCount: primary.length,
    primaryAttemptCount: primary.reduce((sum, record) => sum + record.attemptCount, 0),
    secondaryCellCount: secondary.length,
    secondaryObservationCount: secondary.reduce((sum, record) => sum + record.observationCount, 0),
  },
  primary,
  secondary,
};
writeFileSync(jsonOutput, JSON.stringify(output, null, 2) + "\n");
writeFileSync(csvOutput, csvRows(primary, secondary));
console.log(JSON.stringify({ jsonOutput, csvOutput, inventory: output.inventory }, null, 2));
