#!/usr/bin/env node
/**
 * Verify that the compact competitive-benchmark indexes are reproducible from
 * committed evidence and that every emitted path/hash reference resolves.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const benchmarkRoot = join(repositoryRoot, "docs", "evaluations", "current-ashiba-competitive-benchmark-v3");
const extractor = join(benchmarkRoot, "fixtures", "aggregate-results.mjs");
const committedJson = join(benchmarkRoot, "raw-results.json");
const committedCsv = join(benchmarkRoot, "results.csv");

function sha256(path) {
  return createHash("sha256")
    .update(readFileSync(path, "utf8").replaceAll("\r\n", "\n"), "utf8")
    .digest("hex");
}

function assertEqualBytes(actualPath, expectedPath) {
  if (!readFileSync(actualPath).equals(readFileSync(expectedPath))) {
    throw new Error(`${basename(expectedPath)} is not byte-identical to an extractor rebuild`);
  }
}

function inspectReferences(value, failures, trail = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectReferences(item, failures, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  const reference = typeof value.path === "string" ? value.path : value.evidencePath;
  if (typeof reference === "string" && typeof value.sha256 === "string") {
    const target = resolve(benchmarkRoot, reference);
    const allowedPrefix = `${benchmarkRoot}${sep}`;
    if (!(target === benchmarkRoot || target.startsWith(allowedPrefix))) {
      failures.push(`${trail}: path escapes benchmark root: ${reference}`);
    } else if (!existsSync(target)) {
      failures.push(`${trail}: missing committed evidence: ${reference}`);
    } else if (sha256(target) !== value.sha256) {
      failures.push(`${trail}: SHA-256 mismatch: ${reference}`);
    }
  }
  for (const [key, child] of Object.entries(value)) inspectReferences(child, failures, `${trail}.${key}`);
}

const temporary = mkdtempSync(join(tmpdir(), "ashiba-benchmark-index-"));
try {
  const rebuiltJson = join(temporary, "raw-results.json");
  const rebuiltCsv = join(temporary, "results.csv");
  const run = spawnSync(process.execPath, [extractor, "--root", benchmarkRoot, "--json", rebuiltJson, "--csv", rebuiltCsv], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`aggregate-results failed: ${run.stderr || run.stdout}`);
  assertEqualBytes(rebuiltJson, committedJson);
  assertEqualBytes(rebuiltCsv, committedCsv);
  const failures = [];
  inspectReferences(JSON.parse(readFileSync(committedJson, "utf8")), failures);
  if (failures.length > 0) throw new Error(`invalid compact-index references:\n${failures.join("\n")}`);
  console.log(`benchmark index verified: ${relative(repositoryRoot, committedJson)} and ${relative(repositoryRoot, committedCsv)}`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
