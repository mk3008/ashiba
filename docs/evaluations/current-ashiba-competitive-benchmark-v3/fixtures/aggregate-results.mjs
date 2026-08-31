#!/usr/bin/env node
/**
 * Rebuild the benchmark's compact result index from immutable evidence.
 *
 * This is deliberately an extractor, not a scorer.  It neither runs a
 * candidate nor interprets a missing field as a pass, failure, causal category, or
 * tool property.  The full runner and attempt documents remain authoritative
 * at the paths emitted in the index.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const PRIMARY_CELL = /^(G1|T1|T2|Q1)-(A|P|S|D|K|G)-r(\d+)$/;
const SECONDARY_CELL = /^(AF-V|AF-L|X1|SD|E1)-(A|P|S|D|K|G)-r(\d+)$/;
const SECONDARY_RELIABLE_ROOT = /^(AF-V|AF-L|X1|SD|E1)-(A|P|S|D|K|G)-r(\d+)-reliable(?:-[a-z0-9]+)*$/i;
const EXCLUDED_X1_R3_ROOT = /^X1-(A|P|S|D|K|G)-r3$/;

// H-007 reran every X1 arm under the corrected static-isolation rule. These
// entries are an explicit, audited selection of the terminal runner output in
// that r2 correction set. The original r1 paths remain retained observations,
// but are not selected as final X1 outcomes. Do not infer a selection from a
// filename for any other secondary control.
const X1_SELECTED_FINAL_RUNNERS = new Map([
  ["X1-A-r2", "secondary-evidence/X1-A-r2/corrected-h007/runner-evidence/runner-repair1.json"],
  ["X1-P-r2", "secondary-evidence/X1-P-r2/corrected-h007/runner-evidence/runner-initial.json"],
  ["X1-S-r2", "secondary-evidence/X1-S-r2/corrected-h007/runner-evidence/runner-repair1.json"],
  ["X1-D-r2", "secondary-evidence/X1-D-r2/corrected-h007/runner-evidence/runner-repair1.json"],
  ["X1-K-r2", "secondary-evidence/X1-K-r2/corrected-h007/runner-evidence/runner.json"],
  ["X1-G-r2", "secondary-evidence/X1-G-r2/corrected-h007/runner-evidence/runner.json"],
]);

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

  // An attempt after ordinal zero is recorded only as an additional attempt.
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
    sources: {
      firstPass: fileReference(root, firstPassPath),
      runner: fileReference(root, runnerPath),
      treatment: fileReference(root, treatmentPath),
      finalization: fileReference(root, finalizationPath),
    },
  };
}

function primaryEvidenceCounts(record) {
  return {
    firstPassDocuments: record.attempts.filter((attempt) => attempt.firstPass != null).length,
    liveDocuments:
      record.attempts.filter((attempt) => attempt.live != null).length + (record.finalLive != null ? 1 : 0),
    finalDocuments: record.finalLive != null ? 1 : 0,
    treatmentDocuments: record.attempts.filter((attempt) => attempt.treatment != null).length,
    attemptRecords: record.attempts.length,
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
      // The immutable cell-root runner is the initial runner observation. A
      // repair is represented by a later, separately finalized attempt. The
      // terminal primary outcome must therefore select the most recent
      // finalized attempt, rather than silently retaining the initial
      // cell-root runner as the final live result.
      const terminalAttempt = [...attempts].reverse().find((attempt) => attempt.finalization != null) ?? attempts.at(-1) ?? null;
      const record = {
        kind: "primary",
        cell,
        ...metadata,
        evidenceRoot: relative(root, cellRoot).replaceAll("\\", "/"),
        attemptCount: attempts.length,
        additionalAttemptCount: Math.max(0, attempts.length - 1),
        firstAttempt: attempts[0] ?? null,
        finalAttempt: terminalAttempt,
        // This is a direct alias of the first attempt's captured runner
        // result. It is deliberately distinct from first-pass command slots
        // and from the terminal cell-level runner.json.
        firstLive: attempts[0]?.live ?? null,
        firstLiveSource: attempts[0]?.sources?.runner ?? null,
        finalLive: terminalAttempt?.live ?? null,
        finalLiveSource: terminalAttempt?.sources?.runner ?? null,
        // Preserve the original cell-root runner independently. It is
        // evidence of the initial runner observation, not a terminal verdict
        // when a later attempt has been finalized.
        cellRootLive: liveSummary(finalRunner),
        cellRootLiveSource: fileReference(root, finalRunnerPath),
        attempts,
      };
      return { ...record, evidenceCounts: primaryEvidenceCounts(record) };
    })
    .filter(Boolean)
    .sort((left, right) => left.cell.localeCompare(right.cell));
}

function primaryFirstLiveCounts(primary) {
  const counts = { P: 0, F: 0, missing: 0 };
  for (const record of primary) {
    const status = record.firstLive?.status;
    if (status === "P" || status === "F") counts[status] += 1;
    else counts.missing += 1;
  }
  return counts;
}

function walkNamedDocuments(directory, matcher) {
  const results = [];
  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile() && matcher.test(entry.name)) {
        results.push(path);
      }
    }
  }
  if (existsSync(directory)) walk(directory);
  return results.sort((left, right) => left.localeCompare(right));
}

function e1Summary(document) {
  if (!document || typeof document !== "object") return null;
  return {
    status: resultStatus(document),
    harness: typeof document.harness === "string" ? document.harness : null,
    treatmentRemoval: typeof document.treatmentRemoval === "string" ? document.treatmentRemoval : null,
    primaryG1: liveSummary(document.primaryG1),
    sourceUnchangedDuringRunner:
      typeof document.sourceUnchangedDuringRunner === "boolean" ? document.sourceUnchangedDuringRunner : null,
    startedAt: typeof document.startedAt === "string" ? document.startedAt : null,
    finishedAt: typeof document.finishedAt === "string" ? document.finishedAt : null,
  };
}

function sdSummary(document) {
  if (!document || typeof document !== "object") return null;
  const mutations = Array.isArray(document.mutations) ? document.mutations : [];
  return {
    status: resultStatus(document),
    harness: typeof document.harness === "string" ? document.harness : null,
    staticInspection: document.staticInspection
      ? {
          pass: typeof document.staticInspection.pass === "boolean" ? document.staticInspection.pass : null,
          findingCount: Array.isArray(document.staticInspection.findings)
            ? document.staticInspection.findings.length
            : null,
        }
      : null,
    mutationCount: mutations.length,
    mutationObservations: mutations.map((mutation) => ({
      mutation: typeof mutation?.mutation === "string" ? mutation.mutation : null,
      firstDetectionStage: typeof mutation?.firstDetectionStage === "string" ? mutation.firstDetectionStage : null,
      observationCount: Array.isArray(mutation?.observations) ? mutation.observations.length : 0,
      cleanup: mutation?.cleanup ?? null,
    })),
    startedAt: typeof document.startedAt === "string" ? document.startedAt : null,
    finishedAt: typeof document.finishedAt === "string" ? document.finishedAt : null,
  };
}

function durableSchemaRecords(root, cellRoot) {
  const e1Paths = walkNamedDocuments(cellRoot, /^e1(?:-[a-z0-9]+)*\.json$/i);
  const sdPaths = walkNamedDocuments(cellRoot, /^sd\.json$/i);
  return [
    ...e1Paths.map((path) => ({
      schema: "e1",
      evidencePath: relative(root, path).replaceAll("\\", "/"),
      sha256: hash(path),
      summary: e1Summary(readJson(path)),
    })),
    ...sdPaths.map((path) => ({
      schema: "sd",
      evidencePath: relative(root, path).replaceAll("\\", "/"),
      sha256: hash(path),
      summary: sdSummary(readJson(path)),
    })),
  ];
}

function secondaryEvidenceCounts(observations, durableSchemas, selectedFinalObservation) {
  const e1 = durableSchemas.filter((document) => document.schema === "e1");
  const sd = durableSchemas.filter((document) => document.schema === "sd");
  const selectedIsAdditional =
    selectedFinalObservation != null &&
    !selectedFinalObservation.missing &&
    !observations.some((observation) => observation.evidencePath === selectedFinalObservation.evidencePath);
  return {
    firstPassDocuments: 0,
    liveDocuments:
      observations.length +
      e1.filter((document) => document.summary?.primaryG1 != null).length +
      (selectedIsAdditional ? 1 : 0),
    finalDocuments: durableSchemas.length + (selectedFinalObservation != null && !selectedFinalObservation.missing ? 1 : 0),
    treatmentDocuments:
      e1.filter((document) => document.summary?.treatmentRemoval != null).length +
      sd.filter((document) => document.summary?.mutationCount > 0).length,
    attemptRecords: durableSchemas.length,
  };
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

function walkAfRunnerDocuments(directory) {
  const results = [];
  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile() && /(?:runner|af-run).*\.json$/i.test(entry.name)) {
        const document = readJson(path);
        // An AF runner record has the AF runner envelope. This rejects
        // nested primary runner attachments, which use a different harness.
        if (document?.harness === "af-controls-v1") results.push(path);
      }
    }
  }
  if (existsSync(directory)) walk(directory);
  return results.sort((left, right) => left.localeCompare(right));
}

function selectedSecondaryFinalObservation(root, cell) {
  const evidencePath = X1_SELECTED_FINAL_RUNNERS.get(cell);
  if (!evidencePath) return null;
  const path = join(root, evidencePath);
  if (!existsSync(path)) {
    return {
      selection: "x1-terminal-repair-map-v1",
      evidencePath,
      missing: true,
      live: null,
    };
  }
  const document = readJson(path);
  return {
    selection: "x1-terminal-repair-map-v1",
    evidencePath,
    sha256: hash(path),
    missing: false,
    live: liveSummary(document),
  };
}

function secondaryRecords(root) {
  const evidenceRoot = join(root, "secondary-evidence");
  const grouped = new Map();
  for (const name of sortedDirectories(evidenceRoot)) {
    // r3 is a deliberately aborted evidence-preservation remeasurement, not
    // a secondary benchmark cell. Its roots are retained separately below.
    if (EXCLUDED_X1_R3_ROOT.test(name)) continue;
    const exact = parseCell(name, SECONDARY_CELL);
    const reliable = parseCell(name, SECONDARY_RELIABLE_ROOT);
    const metadata = exact ?? reliable;
    if (!metadata) continue;
    const cell = `${metadata.workloadOrControl}-${metadata.arm}-r${metadata.replicate}`;
    const group = grouped.get(cell) ?? { cell, metadata, exactRoots: [], reliableRoots: [] };
    (exact ? group.exactRoots : group.reliableRoots).push(join(evidenceRoot, name));
    grouped.set(cell, group);
  }
  return [...grouped.values()]
    .map(({ cell, metadata, exactRoots, reliableRoots }) => {
      const cellRoot = exactRoots[0] ?? reliableRoots[0];
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
      const durableSchemas = durableSchemaRecords(root, cellRoot);
      const selectedFinalObservation = selectedSecondaryFinalObservation(root, cell);
      const exactNonstandardObservations = exactRoots.flatMap((exactRoot) =>
        walkAfRunnerDocuments(exactRoot).map((path) => {
          const document = readJson(path);
          return {
            evidencePath: relative(root, path).replaceAll("\\", "/"),
            sha256: hash(path),
            live: liveSummary(document),
            architectureDelta: document?.architectureDelta ?? null,
            deltaComplete: typeof document?.deltaComplete === "boolean" ? document.deltaComplete : null,
            sourceKind: "nonstandard-af-path",
          };
        }),
      );
      const reliableObservations = reliableRoots.flatMap((reliableRoot) =>
        walkAfRunnerDocuments(reliableRoot).map((path) => {
          const document = readJson(path);
          return {
            evidencePath: relative(root, path).replaceAll("\\", "/"),
            sha256: hash(path),
            live: liveSummary(document),
            architectureDelta: document?.architectureDelta ?? null,
            deltaComplete: typeof document?.deltaComplete === "boolean" ? document.deltaComplete : null,
            sourceKind: "nonstandard-reliable-path",
          };
        }),
      );
      const standardPaths = new Set(observations.map((entry) => entry.evidencePath));
      const supplementalObservations = [...exactNonstandardObservations, ...reliableObservations].filter(
        (entry, index, all) =>
          !standardPaths.has(entry.evidencePath) && all.findIndex((candidate) => candidate.evidencePath === entry.evidencePath) === index,
      );
      return {
        kind: "secondary",
        cell,
        ...metadata,
        evidenceRoot: relative(root, cellRoot).replaceAll("\\", "/"),
        evidenceRoots: [...exactRoots, ...reliableRoots].map((path) => relative(root, path).replaceAll("\\", "/")),
        observationCount: observations.length,
        observations,
        reliableObservationCount: reliableObservations.length,
        reliableObservations,
        supplementalObservationCount: supplementalObservations.length,
        supplementalObservations,
        selectedFinalObservation,
        durableSchemas,
        evidenceCounts: secondaryEvidenceCounts(observations, durableSchemas, selectedFinalObservation),
        note: "Secondary evidence is retained as recorded observations, durable schema documents, and explicit nonstandard AF runner records. The X1 H-007 r2 terminal map is an audited file selection; it does not infer a causal category or product property from a path name.",
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.cell.localeCompare(right.cell));
}

function excludedCorrectionEvidence(root) {
  const evidenceRoot = join(root, "secondary-evidence");
  const roots = sortedDirectories(evidenceRoot)
    .filter((name) => EXCLUDED_X1_R3_ROOT.test(name))
    .map((name) => `secondary-evidence/${name}`);
  const summaryPaths = [
    "secondary-evidence/X1-r3-h007-evidence-preservation-noncomparability.md",
    "secondary-evidence/X1-r3-h007-evidence-preservation-hash-verification.json",
  ];
  return {
    control: "X1",
    label: "H-007 r3 evidence-preservation remeasurement",
    disposition: "excluded-non-comparable-non-pooled",
    roots,
    summaries: summaryPaths.map((evidencePath) => {
      const path = join(root, evidencePath);
      return {
        evidencePath,
        sha256: existsSync(path) ? hash(path) : null,
        missing: !existsSync(path),
      };
    }),
  };
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
    "first_pass_document_count",
    "live_document_count",
    "final_document_count",
    "treatment_document_count",
    "first_build_status",
    "first_typecheck_status",
    "first_test_status",
    "first_oracle_live_status",
    "final_live_status",
    "final_treatment_value",
    "final_cleanup_status",
    "observation_index",
    "durable_schema",
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
      record.evidenceCounts.firstPassDocuments,
      record.evidenceCounts.liveDocuments,
      record.evidenceCounts.finalDocuments,
      record.evidenceCounts.treatmentDocuments,
      slots.build?.status ?? null,
      slots.typecheck?.status ?? null,
      slots.test?.status ?? null,
      record.firstLive?.status ?? null,
      record.finalLive?.status ?? null,
      record.finalAttempt?.treatment?.value ?? null,
      record.finalLive?.cleanup?.status ?? null,
      null,
      null,
      "No aggregate score or winner is computed.",
    ]);
  }
  for (const record of secondary) {
    const rowsForCell = [
      ...record.observations.map((observation, index) => ({ observation, index, durableSchema: null, reliable: null })),
      ...record.durableSchemas.map((durableSchema) => ({ observation: null, index: null, durableSchema, reliable: null })),
      ...record.supplementalObservations.map((reliable, index) => ({ observation: null, index, durableSchema: null, reliable })),
      ...(record.selectedFinalObservation
        ? [{ observation: null, index: "selected-final", durableSchema: null, reliable: record.selectedFinalObservation }]
        : []),
    ];
    if (rowsForCell.length === 0) rowsForCell.push({ observation: null, index: null, durableSchema: null, reliable: null });
    rowsForCell.forEach(({ observation, index, durableSchema, reliable }) => {
      rows.push([
        record.kind,
        record.cell,
        record.workloadOrControl,
        record.arm,
        record.replicate,
        observation?.evidencePath ?? durableSchema?.evidencePath ?? reliable?.evidencePath ?? record.evidenceRoot,
        null,
        null,
        record.evidenceCounts.firstPassDocuments,
        record.evidenceCounts.liveDocuments,
        record.evidenceCounts.finalDocuments,
        record.evidenceCounts.treatmentDocuments,
        null,
        null,
        null,
        null,
        observation?.live?.status ?? durableSchema?.summary?.status ?? reliable?.live?.status ?? null,
        null,
        observation?.live?.cleanup?.status ?? reliable?.live?.cleanup?.status ?? null,
        index,
        durableSchema?.schema ?? reliable?.sourceKind ?? null,
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
const excludedCorrections = [excludedCorrectionEvidence(root)];
const output = {
  schemaVersion: 2,
  // A wall-clock timestamp would mutate otherwise identical durable output on
  // every rebuild. Source paths and SHA-256 values are the reproducibility
  // boundary, so absence is deliberate rather than an unavailable metric.
  generatedAt: null,
  generator: {
    path: relative(root, resolve(import.meta.dirname, "aggregate-results.mjs")).replaceAll("\\", "/"),
    sha256: hash(resolve(import.meta.dirname, "aggregate-results.mjs")),
  },
  // The output is relocatable: all retained evidence links are relative to
  // this benchmark directory rather than to the coordinator's machine.
  inputRoot: ".",
  interpretationPolicy: {
    noAggregateWinnerOrRanking: true,
    missingFieldPolicy: "Missing or undocumented fields remain null/absent and are not interpreted as a pass, failure, causal category, or tool-quality signal.",
    attemptPolicy: "Each preserved primary attempt is listed in chronological directory order. An attempt after the first is recorded only as an additional attempt.",
    secondaryPolicy: "Each secondary runner document and durable E1/SD schema document is retained as recorded evidence. Directory and file names do not establish a causal category.",
    excludedCorrectionPolicy: "Explicitly listed excluded correction roots are preserved for audit but are not canonical secondary cells, observations, final outcomes, repair counts, or treatment-fidelity results.",
  },
  limitations: [
    "Token and credit telemetry are not synthesized by this extractor. They remain unavailable unless recorded in source evidence or the orchestration ledger.",
    "The compact index does not replace immutable runner outputs, command logs, candidate snapshots, or attempt manifests.",
    "This extractor summarizes recorded fields only; it does not determine treatment fidelity, candidate quality, or causal tool effects.",
  ],
  inventory: {
    primaryCellCount: primary.length,
    primaryAttemptCount: primary.reduce((sum, record) => sum + record.attemptCount, 0),
    primaryFirstLiveStatusCounts: primaryFirstLiveCounts(primary),
    secondaryCellCount: secondary.length,
    secondaryObservationCount: secondary.reduce((sum, record) => sum + record.observationCount, 0),
    secondaryReliableObservationCount: secondary.reduce((sum, record) => sum + record.reliableObservationCount, 0),
    secondarySupplementalObservationCount: secondary.reduce((sum, record) => sum + record.supplementalObservationCount, 0),
    secondaryDurableSchemaCount: secondary.reduce((sum, record) => sum + record.durableSchemas.length, 0),
    excludedCorrectionRootCount: excludedCorrections.reduce((sum, record) => sum + record.roots.length, 0),
  },
  primary,
  secondary,
  excludedCorrections,
};
writeFileSync(jsonOutput, JSON.stringify(output, null, 2) + "\n");
writeFileSync(csvOutput, csvRows(primary, secondary));
console.log(JSON.stringify({ jsonOutput, csvOutput, inventory: output.inventory }, null, 2));
