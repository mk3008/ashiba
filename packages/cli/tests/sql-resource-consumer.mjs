import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const [rootDir, resourceFile, databaseUrl, rawParams = '{}', mode = 'execute'] = process.argv.slice(2);
if (!rootDir || !resourceFile || !databaseUrl) {
  throw new Error('Usage: node sql-resource-consumer.mjs <root> <resource> <database-url> [params-json] [execute|explain]');
}

const resource = JSON.parse(await readFile(path.resolve(rootDir, resourceFile), 'utf8'));
if (resource.status !== 'described') {
  throw new Error(`SQL resource is not executable: ${resource.error?.code ?? 'unknown error'} ${resource.error?.message ?? ''}`.trim());
}
const sql = await readFile(path.resolve(rootDir, resource.executable.path), 'utf8');
const params = JSON.parse(rawParams);
const values = resource.executable.orderedNames.map((name) => params[name]);
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  if (mode === 'explain') {
    const result = await client.query(`explain (format json) ${sql}`, values);
    process.stdout.write(`${JSON.stringify({ mode, queryId: resource.id, plan: result.rows[0]['QUERY PLAN'] })}\n`);
  } else {
    const result = await client.query(sql, values);
    const expectedNames = resource.contract.database.results.map((field) => field.name);
    const actualNames = result.fields.map((field) => field.name);
    if (JSON.stringify(expectedNames) !== JSON.stringify(actualNames)) {
      throw new Error(`Result names differ: expected ${JSON.stringify(expectedNames)}, received ${JSON.stringify(actualNames)}.`);
    }
    for (const [index, field] of resource.contract.driver.results.entries()) {
      for (const row of result.rows) {
        const value = row[actualNames[index]];
        if (value === null || field.runtimeType === 'unknown' || field.runtimeType === 'json-value') continue;
        const actualType = Array.isArray(value) ? 'array' : value instanceof Date ? 'Date' : typeof value;
        if (actualType !== field.runtimeType) {
          throw new Error(`Driver representation differs at result ${index + 1}: expected ${field.runtimeType}, received ${actualType}.`);
        }
      }
    }
    process.stdout.write(`${JSON.stringify({ mode, queryId: resource.id, rows: result.rows.length, columns: actualNames })}\n`);
  }
} finally {
  await client.end();
}
