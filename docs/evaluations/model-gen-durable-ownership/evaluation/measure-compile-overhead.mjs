import { performance } from 'node:perf_hooks';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [repositoryRoot = process.cwd()] = process.argv.slice(2);
const root = path.resolve(repositoryRoot);
const { compileNamedParameters } = await import(pathToFileURL(path.join(root, 'packages', 'named-parameters', 'dist', 'compiler.js')).href);
const sqlDirectory = path.join(root, 'examples', 'postgres-ticket-queue-vsa', 'src', 'tickets', 'sql');
const referenceQueries = readdirSync(sqlDirectory)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => readFileSync(path.join(sqlDirectory, name), 'utf8'));

function syntheticQueries(count) {
  return Array.from({ length: count }, (_, index) => `select :tenantId as tenant_id, :status as status /* synthetic-${index} */ where :tenantId = :tenantId`);
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function measure(queries, repetitions) {
  const samples = [];
  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    const started = performance.now();
    for (const sql of queries) compileNamedParameters(sql);
    samples.push(performance.now() - started);
  }
  return {
    queryCount: queries.length,
    repetitions,
    medianWallMs: Number(median(samples).toFixed(4)),
    minWallMs: Number(Math.min(...samples).toFixed(4)),
    maxWallMs: Number(Math.max(...samples).toFixed(4)),
  };
}

// Warm the module/JIT without treating this as a performance competition.
measure(referenceQueries, 10);
const result = {
  purpose: 'bounded controlled-startup compile cost, not a throughput benchmark',
  node: process.version,
  measurements: {
    oneRepresentativeQuery: measure([referenceQueries[0]], 100),
    referenceQuerySet: measure(referenceQueries, 100),
    synthetic100Queries: measure(syntheticQueries(100), 20),
    synthetic1000Queries: measure(syntheticQueries(1000), 10),
  },
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
