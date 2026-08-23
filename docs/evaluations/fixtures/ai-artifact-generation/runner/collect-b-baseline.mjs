import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(root, '..');
const repoRoot = path.resolve(fixtureRoot, '../../../..');
const { runModelGen } = await import(pathToFileURL(path.join(repoRoot, 'packages/cli/dist/commands/model-gen.js')).href);
const workloadNames = ['w1-named-lexical', 'w2-optional-search', 'w3-sort', 'w4-mixed-complex'];
const startedAt = new Date().toISOString();
const results = [];

for (const name of workloadNames) {
  const start = performance.now();
  try {
    const result = runModelGen({
      sqlFile: path.join(fixtureRoot, 'workloads', `${name}.sql`),
      rootDir: fixtureRoot,
      dryRun: true,
      format: 'json',
    });
    results.push({
      workload: name,
      success: true,
      wallMs: Number((performance.now() - start).toFixed(2)),
      sourceHash: result.analysis.sourceHash,
      postgres: result.bindings.postgres,
      optionalAnalysis: result.analysis.optionalConditionCompression ?? null,
      safeSort: result.analysis.safeSort,
    });
  } catch (error) {
    results.push({ workload: name, success: false, wallMs: Number((performance.now() - start).toFixed(2)), error: error instanceof Error ? error.message : String(error) });
  }
}

const sourceFiles = [
  'packages/cli/src/commands/model-gen.ts',
  'packages/driver-adapter-core/src/index.ts',
  'packages/cli/tests/smoke.test.ts',
];
const sourceSurface = sourceFiles.map((relativePath) => {
  const text = readFileSync(path.join(repoRoot, relativePath), 'utf8');
  return { relativePath, lines: text.split(/\r?\n/).length };
});
const payload = {
  treatment: 'B',
  startedAt,
  completedAt: new Date().toISOString(),
  tool: 'Ashiba current product model-gen / runModelGen',
  runtimeDependencies: ['node', '@ashiba-ts/cli', '@ashiba-ts/driver-adapter-core'],
  sourceSurface,
  freshnessRequirement: 'sourceHash is carried by analysis and postgres binding; runtime rejects a mismatch.',
  results,
};
const outputDir = path.join(fixtureRoot, 'b-baseline');
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'results.json'), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
