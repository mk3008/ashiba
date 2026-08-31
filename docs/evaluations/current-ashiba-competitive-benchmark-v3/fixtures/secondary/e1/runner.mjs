import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBenchmark } from '../../runner.mjs';
import { ARM, json, sha, sourceTexts, walk, writeJson } from '../common.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const values = (name) => argv.flatMap((value, index) => value === name && argv[index + 1] ? [argv[index + 1]] : []);
  const value = (name) => values(name)[0];
  return { arm: value('--arm'), candidate: value('--candidate'), sourceRoot: value('--source-root'), baselineManifest: value('--baseline-manifest'), output: value('--output'), databaseUrl: value('--database-url') ?? process.env.DATABASE_URL, forbidden: values('--forbidden') };
}

function map(entries) { return new Map(entries.map((entry) => [entry.path, entry])); }

function diff(baseline, candidate) {
  const before = map(baseline); const after = map(candidate);
  const added = candidate.filter((entry) => !before.has(entry.path)).map((entry) => entry.path);
  const removed = baseline.filter((entry) => !after.has(entry.path)).map((entry) => entry.path);
  const changed = candidate.filter((entry) => before.has(entry.path) && before.get(entry.path).sha256 !== entry.sha256).map((entry) => entry.path);
  return { added, removed, changed };
}

async function forbiddenMatches(root, patterns) {
  const compiled = patterns.map((value) => ({ value, expression: new RegExp(value, 'i') }));
  const matches = [];
  for (const file of await sourceTexts(root)) for (const pattern of compiled) if (pattern.expression.test(file.text)) matches.push({ pattern: pattern.value, path: file.path });
  return matches;
}

export async function runExitControl(input) {
  const { arm, candidate, sourceRoot, baselineManifest, output, databaseUrl, forbidden = [] } = input;
  if (!ARM.has(arm)) throw new Error('--arm must be A, P, S, D, K, or G');
  if (!candidate || !sourceRoot || !baselineManifest || !output || !databaseUrl) throw new Error('--candidate, --source-root, --baseline-manifest, --output, and DATABASE_URL are required');
  const root = resolve(sourceRoot);
  const baseline = JSON.parse(await readFile(resolve(baselineManifest), 'utf8'));
  const baselineFiles = Array.isArray(baseline.files) ? baseline.files : baseline;
  const sourceBefore = await walk(root);
  const record = { harness: 'e1-exit-removal-v1', protocol: 'secondary-controls-v1', control: 'E1', arm, candidatePath: resolve(candidate), sourceRoot: root, baselineManifestPath: resolve(baselineManifest), baselineSourceHash: sha(json(baselineFiles)), exitSourceManifestBefore: sourceBefore, forbiddenPatterns: forbidden, startedAt: new Date().toISOString() };
  record.sourceDiff = diff(baselineFiles, sourceBefore);
  record.forbiddenMatches = await forbiddenMatches(root, forbidden);
  record.treatmentRemoval = record.forbiddenMatches.length === 0 ? 'pass' : 'fail';
  const g1Output = resolve(output).replace(/\.json$/i, '.primary-g1.json');
  record.primaryG1 = await runBenchmark({ databaseUrl, candidatePath: resolve(candidate), sourceRoot: root, workloads: ['G1'], outputPath: g1Output });
  const sourceAfter = await walk(root);
  record.exitSourceManifestAfter = sourceAfter;
  record.sourceUnchangedDuringRunner = sha(json(sourceBefore)) === sha(json(sourceAfter));
  record.status = record.treatmentRemoval === 'pass' && record.sourceUnchangedDuringRunner && record.primaryG1.status === 'P' ? 'P' : 'F';
  record.finishedAt = new Date().toISOString();
  await writeJson(output, record);
  return record;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const record = await runExitControl(parseArgs(process.argv.slice(2)));
  console.log(json({ status: record.status, treatmentRemoval: record.treatmentRemoval, primaryStatus: record.primaryG1.status }));
  if (record.status !== 'P') process.exitCode = 1;
}
