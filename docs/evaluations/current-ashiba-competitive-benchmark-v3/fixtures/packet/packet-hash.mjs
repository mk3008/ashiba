import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const packetRoot = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = dirname(packetRoot);
const benchmarkRoot = dirname(fixtureRoot);
const expectedManifestPath = join(packetRoot, 'EXPECTED_HASHES_V2.json');

// This list is deliberately in verifier source, not inferred from the expected
// manifest. The expected manifest therefore cannot silently omit the protocol
// declaration, profile, amendments, or the verifier that enforces them.
const PROTOCOL_INPUTS = Object.freeze([
  'benchmark/ARM_TREATMENTS.md',
  'benchmark/EVALUATOR_SPEC.md',
  'benchmark/EXECUTION_PROFILE.md',
  'benchmark/EXCLUSION_AND_CORRECTION_LEDGER.md',
  'benchmark/MANIFEST.md',
  'benchmark/PREREGISTRATION.md',
  'benchmark/PREREGISTRATION_AMENDMENT_1.md',
  'benchmark/PREREGISTRATION_AMENDMENT_2.md',
  'benchmark/PREREGISTRATION_AMENDMENT_3.md',
  'benchmark/PREREGISTRATION_AMENDMENT_4.md',
  'benchmark/PREREGISTRATION_AMENDMENT_5.md',
  'benchmark/PREREGISTRATION_AMENDMENT_6.md',
  'benchmark/PREREGISTRATION_AMENDMENT_7.md',
  'benchmark/PREREGISTRATION_AMENDMENT_8.md',
  'benchmark/PREREGISTRATION_AMENDMENT_9.md',
  'benchmark/WORKLOADS.md',
  'fixtures/packet/packet-hash.mjs',
]);

const REQUIRED_LOCKFILES = Object.freeze([
  'fixtures/package-lock.json',
  'fixtures/packet/arms/A/package-lock.json',
  'fixtures/packet/arms/D/package-lock.json',
  'fixtures/packet/arms/G/package-lock.json',
  'fixtures/packet/arms/K/package-lock.json',
  'fixtures/packet/arms/P/package-lock.json',
  'fixtures/packet/arms/S/package-lock.json',
]);

const FIXTURE_INPUTS = Object.freeze([
  'fixtures/api-contract.mjs', 'fixtures/COMMON_API.md', 'fixtures/fixture.mjs', 'fixtures/NEGATIVE_CONTROLS.md',
  'fixtures/package-lock.json', 'fixtures/package.json', 'fixtures/q1.sql', 'fixtures/REPRODUCE.md', 'fixtures/runner.mjs',
  'fixtures/schema.sql', 'fixtures/seed.sql', 'fixtures/artifacts/ashiba-ts-named-parameters-0.1.0.tgz',
  'fixtures/evidence-executor/REPORT.md', 'fixtures/evidence-executor/SPEC.md', 'fixtures/evidence-executor/attempt-evidence-executor.mjs',
  'fixtures/evidence-executor/MATERIALIZE_CELL.md', 'fixtures/evidence-executor/materialize-cell.mjs',
  'fixtures/reference/reference-application.mjs',
  'fixtures/negative-controls/duplicate-claim/candidate.mjs',
  'fixtures/negative-controls/admin-database-url-exfiltration/candidate.mjs',
  'fixtures/negative-controls/fabricated-stdout-missing-api/candidate.mjs',
  'fixtures/negative-controls/hostile-value/candidate.mjs',
  'fixtures/negative-controls/invalid-sort/candidate.mjs',
  'fixtures/negative-controls/partial-transaction/candidate.mjs',
  'fixtures/negative-controls/wrong-output/candidate.mjs',
  'fixtures/negative-controls/wrong-schema/candidate.mjs',
  'fixtures/packet/execution-order.json', 'fixtures/packet/FETCH_SQLC_ARTIFACTS.md',
  'fixtures/packet/fetch-sqlc-artifacts.mjs', 'fixtures/packet/OFFICIAL_SOURCES.md',
  'fixtures/packet/official-doc-snapshots-v1.zip', 'fixtures/packet/PACKET_MANIFEST.md',
  'fixtures/packet/arms/A/package-lock.json', 'fixtures/packet/arms/A/package.json',
  'fixtures/packet/arms/D/package-lock.json', 'fixtures/packet/arms/D/package.json',
  'fixtures/packet/arms/G/package-lock.json', 'fixtures/packet/arms/G/package.json',
  'fixtures/packet/arms/K/package-lock.json', 'fixtures/packet/arms/K/package.json',
  'fixtures/packet/arms/P/package-lock.json', 'fixtures/packet/arms/P/package.json',
  'fixtures/packet/arms/S/package-lock.json', 'fixtures/packet/arms/S/package.json',
  'fixtures/prompts/A.md', 'fixtures/prompts/COMMON_ASSIGNMENT.md', 'fixtures/prompts/D.md',
  'fixtures/prompts/G.md', 'fixtures/prompts/K.md', 'fixtures/prompts/P.md', 'fixtures/prompts/S.md',
  'fixtures/prompts/workloads/G1.md', 'fixtures/prompts/workloads/Q1.md',
  'fixtures/prompts/workloads/T1.md', 'fixtures/prompts/workloads/T2.md',
]);

function isCanonicalPath(value) {
  return typeof value === 'string'
    && /^(?:benchmark|fixtures)\/[A-Za-z0-9._/-]+$/.test(value)
    && !isAbsolute(value)
    && !value.split('/').includes('..')
    && !value.endsWith('/');
}

function equalPathList(left, right) {
  return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function absolutePath(logicalPath) {
  if (!isCanonicalPath(logicalPath)) throw new Error(`unsafe canonical path: ${logicalPath}`);
  const base = logicalPath.startsWith('benchmark/') ? benchmarkRoot : fixtureRoot;
  const suffix = logicalPath.startsWith('benchmark/') ? logicalPath.slice('benchmark/'.length) : logicalPath.slice('fixtures/'.length);
  const target = resolve(base, ...suffix.split('/'));
  if (!target.startsWith(`${base}${sep}`)) throw new Error(`path escapes frozen root: ${logicalPath}`);
  return target;
}

async function hashFile(logicalPath) {
  const bytes = await readFile(absolutePath(logicalPath));
  return { path: logicalPath, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}

function assertCanonical(manifest) {
  if (manifest.protocol !== 'v2' || manifest.canonicalRepresentation !== 'v2-logical-path-byte-sha256' || !Array.isArray(manifest.protocolInputs) || !Array.isArray(manifest.files)) {
    throw new Error('EXPECTED_HASHES_V2.json must declare protocol v2, canonical representation, protocolInputs, and files');
  }
  if (!equalPathList(manifest.protocolInputs, PROTOCOL_INPUTS)) throw new Error('expected protocolInputs do not exactly match verifier-declared protocol inputs');
  const paths = manifest.files.map((entry) => entry.path);
  if (new Set(paths).size !== paths.length || paths.some((value) => !isCanonicalPath(value))) throw new Error('expected hash manifest contains duplicate or unsafe canonical paths');
  if (!equalPathList([...paths].sort(), paths)) throw new Error('expected hash manifest paths must be sorted');
  if (manifest.files.some((entry) => !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isInteger(entry.bytes) || entry.bytes < 0)) throw new Error('expected hash manifest contains an invalid digest or byte count');
  const required = [...new Set([...PROTOCOL_INPUTS, ...REQUIRED_LOCKFILES])];
  for (const input of required) if (!paths.includes(input)) throw new Error(`required frozen input is absent: ${input}`);
}

async function readExpected() {
  const manifest = JSON.parse(await readFile(expectedManifestPath, 'utf8'));
  assertCanonical(manifest);
  return manifest;
}

async function verify() {
  const expected = await readExpected();
  const mismatches = [];
  for (const entry of expected.files) {
    try {
      const observed = await hashFile(entry.path);
      if (observed.sha256 !== entry.sha256 || observed.bytes !== entry.bytes) mismatches.push({ path: entry.path, expected: entry, observed });
    } catch (error) {
      mismatches.push({ path: entry.path, error: error.message });
    }
  }
  if (mismatches.length) {
    console.error(JSON.stringify({ status: 'FAIL', protocol: 'v2', mismatches }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ status: 'PASS', protocol: 'v2', files: expected.files.length, protocolInputs: expected.protocolInputs.length }, null, 2));
}

async function writeExpected() {
  const paths = [...new Set([...PROTOCOL_INPUTS, ...FIXTURE_INPUTS])].sort();
  const files = [];
  for (const logicalPath of paths) files.push(await hashFile(logicalPath));
  const manifest = {
    protocol: 'v2',
    canonicalRepresentation: 'v2-logical-path-byte-sha256',
    protocolInputs: [...PROTOCOL_INPUTS],
    files,
  };
  await writeFile(expectedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'WRITTEN', protocol: 'v2', files: files.length, protocolInputs: PROTOCOL_INPUTS.length }, null, 2));
}

if (process.argv.includes('--write')) await writeExpected();
else await verify();
