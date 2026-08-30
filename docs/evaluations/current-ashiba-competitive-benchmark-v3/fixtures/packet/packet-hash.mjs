import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const packetRoot = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = dirname(packetRoot);

const expectedManifestPath = join(packetRoot, 'EXPECTED_HASHES_V2.json');
const requiredLockfiles = [
  'packet/arms/A/package-lock.json',
  'packet/arms/P/package-lock.json',
  'packet/arms/S/package-lock.json',
  'packet/arms/D/package-lock.json',
  'packet/arms/K/package-lock.json',
  'packet/arms/G/package-lock.json',
  'package-lock.json',
];

async function hashFile(relativePath) {
  const bytes = await readFile(join(fixtureRoot, relativePath));
  return {
    path: relativePath,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
  };
}

async function readExpected() {
  const raw = await readFile(expectedManifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  if (manifest.protocol !== 'v2' || !Array.isArray(manifest.files)) {
    throw new Error('EXPECTED_HASHES_V2.json must declare protocol v2 and files');
  }
  const paths = manifest.files.map((entry) => entry.path);
  if (new Set(paths).size !== paths.length || paths.some((path) => path !== path.replaceAll('\\', '/'))) {
    throw new Error('expected hash manifest contains duplicate or non-canonical paths');
  }
  if ([...paths].sort().join('\n') !== paths.join('\n')) {
    throw new Error('expected hash manifest paths must be sorted');
  }
  for (const lockfile of requiredLockfiles) {
    if (!paths.includes(lockfile)) throw new Error(`required package lock is not frozen: ${lockfile}`);
  }
  return manifest;
}

async function verify() {
  const expected = await readExpected();
  const actual = [];
  const mismatches = [];
  for (const entry of expected.files) {
    try {
      const observed = await hashFile(entry.path);
      actual.push(observed);
      if (observed.sha256 !== entry.sha256 || observed.bytes !== entry.bytes) {
        mismatches.push({ path: entry.path, expected: entry, observed });
      }
    } catch (error) {
      mismatches.push({ path: entry.path, error: error.message });
    }
  }
  if (mismatches.length > 0) {
    console.error(JSON.stringify({ status: 'FAIL', protocol: 'v2', mismatches }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ status: 'PASS', protocol: 'v2', files: actual.length }, null, 2));
}

async function writeExpected() {
  const paths = [
    'api-contract.mjs', 'COMMON_API.md', 'fixture.mjs', 'NEGATIVE_CONTROLS.md',
    'package-lock.json', 'package.json', 'q1.sql', 'REPRODUCE.md', 'runner.mjs',
    'schema.sql', 'seed.sql', 'artifacts/ashiba-ts-named-parameters-0.1.0.tgz',
    'evidence-executor/REPORT.md', 'evidence-executor/SPEC.md',
    'evidence-executor/attempt-evidence-executor.mjs',
    'reference/reference-application.mjs',
    'negative-controls/duplicate-claim/candidate.mjs',
    'negative-controls/fabricated-stdout-missing-api/candidate.mjs',
    'negative-controls/hostile-value/candidate.mjs',
    'negative-controls/invalid-sort/candidate.mjs',
    'negative-controls/partial-transaction/candidate.mjs',
    'negative-controls/wrong-output/candidate.mjs',
    'negative-controls/wrong-schema/candidate.mjs',
    'packet/execution-order.json', 'packet/OFFICIAL_SOURCES.md',
    'packet/official-doc-snapshots-v1.zip', 'packet/PACKET_MANIFEST.md',
    'packet/arms/A/package-lock.json', 'packet/arms/A/package.json',
    'packet/arms/D/package-lock.json', 'packet/arms/D/package.json',
    'packet/arms/G/package-lock.json', 'packet/arms/G/package.json',
    'packet/arms/K/package-lock.json', 'packet/arms/K/package.json',
    'packet/arms/P/package-lock.json', 'packet/arms/P/package.json',
    'packet/arms/S/package-lock.json', 'packet/arms/S/package.json',
    'prompts/A.md', 'prompts/COMMON_ASSIGNMENT.md', 'prompts/D.md',
    'prompts/G.md', 'prompts/K.md', 'prompts/P.md', 'prompts/S.md',
    'prompts/workloads/G1.md', 'prompts/workloads/Q1.md',
    'prompts/workloads/T1.md', 'prompts/workloads/T2.md',
  ];
  const files = [];
  for (const path of paths.sort()) files.push(await hashFile(path));
  await writeFile(expectedManifestPath, `${JSON.stringify({ protocol: 'v2', files }, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'WRITTEN', protocol: 'v2', files: files.length }, null, 2));
}

if (process.argv.includes('--write')) await writeExpected();
else await verify();
