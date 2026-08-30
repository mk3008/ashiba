import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const databaseUrl = process.env.ASHIBA_REFERENCE_DATABASE_URL;
const [repositoryRoot = process.cwd()] = process.argv.slice(2);
if (!databaseUrl) throw new Error('ASHIBA_REFERENCE_DATABASE_URL is required');
const root = path.resolve(repositoryRoot);
const { runModelGen } = await import(pathToFileURL(path.join(root, 'packages', 'cli', 'dist', 'commands', 'model-gen.js')).href);
const { compileNamedParameters } = await import(pathToFileURL(path.join(root, 'packages', 'named-parameters', 'dist', 'compiler.js')).href);
const { bindNamedParameters, NamedParameterError } = await import(pathToFileURL(path.join(root, 'packages', 'named-parameters', 'dist', 'index.js')).href);
const requireFromReference = createRequire(path.join(root, 'examples', 'postgres-ticket-queue-vsa', 'package.json'));
const pg = requireFromReference('pg');

const baseline = 'select id, status from tickets where id = :id;\n';
const semantic = "select id, status from tickets where id = :id and status <> 'deleted';\n";
const parameterShape = "select id, status from tickets where id = :id and (cast(:includeDeleted as boolean) or status <> 'deleted');\n";
const temporary = mkdtempSync(path.join(os.tmpdir(), 'ashiba-model-gen-drift-'));
const sqlFile = path.join(temporary, 'get.sql');
const outputFile = path.join(temporary, 'get.generated.ts');
const pool = new pg.Pool({ connectionString: databaseUrl });

async function execute(binding, values) {
  const bound = bindNamedParameters(binding, values);
  return pool.query(bound.sql, bound.values);
}

try {
  writeFileSync(sqlFile, baseline, 'utf8');
  const generatedBaseline = runModelGen({ rootDir: temporary, sqlFile: 'get.sql', out: 'get.generated.ts' });
  assert.equal(readFileSync(outputFile, 'utf8'), generatedBaseline.contents);
  const staticArtifactContents = readFileSync(outputFile, 'utf8');

  await pool.query('DROP TABLE IF EXISTS tickets CASCADE; CREATE TABLE tickets (id bigint primary key, status text not null); INSERT INTO tickets (id, status) VALUES (1, \'open\'), (2, \'deleted\');');

  writeFileSync(sqlFile, semantic, 'utf8');
  const semanticCheck = runModelGen({ rootDir: temporary, sqlFile: 'get.sql', out: 'get.generated.ts', check: true });
  assert.equal(semanticCheck.fresh, false);
  assert.equal(readFileSync(outputFile, 'utf8'), staticArtifactContents);

  const armAStaleRows = await execute(generatedBaseline.bindings.postgres, { id: 2 });
  const armBStaticRows = await execute(compileNamedParameters(baseline), { id: 2 });
  const armCFreshRows = await execute(compileNamedParameters(semantic), { id: 2 });
  assert.equal(armAStaleRows.rows.length, 1);
  assert.equal(armBStaticRows.rows.length, 1);
  assert.equal(armCFreshRows.rows.length, 0);

  writeFileSync(sqlFile, parameterShape, 'utf8');
  const parameterCheck = runModelGen({ rootDir: temporary, sqlFile: 'get.sql', out: 'get.generated.ts', check: true });
  assert.equal(parameterCheck.fresh, false);
  assert.doesNotThrow(() => bindNamedParameters(generatedBaseline.bindings.postgres, { id: 2 }));
  assert.doesNotThrow(() => bindNamedParameters(compileNamedParameters(baseline), { id: 2 }));
  assert.throws(
    () => bindNamedParameters(compileNamedParameters(parameterShape), { id: 2 }),
    (error) => error instanceof NamedParameterError && error.code === 'ASHIBA_MISSING_PARAMETER',
  );

  process.stdout.write(`${JSON.stringify({
    semanticDrift: {
      armA: { modelGenFreshness: semanticCheck.fresh, staleArtifactRuntimeReturnsDeleted: armAStaleRows.rows.length === 1 },
      armB: { automaticFreshness: false, staleStaticRuntimeReturnsDeleted: armBStaticRows.rows.length === 1 },
      armC: { committedArtifact: false, directCompileRuntimeExcludesDeleted: armCFreshRows.rows.length === 0 },
    },
    parameterShapeDrift: {
      armA: { modelGenFreshness: parameterCheck.fresh, staleArtifactBinderKnowsNewParameter: false },
      armB: { automaticFreshness: false, staleStaticBinderKnowsNewParameter: false },
      armC: { freshDirectCompilerMissingParameter: 'ASHIBA_MISSING_PARAMETER' },
    },
    temporaryResources: 'removed by script',
  }, null, 2)}\n`);
} finally {
  await pool.end();
  rmSync(temporary, { recursive: true, force: true });
}
