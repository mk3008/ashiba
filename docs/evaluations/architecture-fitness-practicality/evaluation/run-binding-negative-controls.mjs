import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bindNamedParameters } from '../../../../packages/named-parameters/dist/index.js';
import { compileNamedParameters } from '../../../../packages/named-parameters/dist/compiler.js';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(baseDir, 'fixtures', 'read-current.sql');
const sql = readFileSync(sqlPath, 'utf8');
const compiled = compileNamedParameters(sql);

const results = [];

try {
  bindNamedParameters(compiled, {
    status: 'open',
    customer_id: '10',
    limit: 20,
  });
  results.push({ name: 'missing-parameter', status: 'unexpected-pass' });
} catch (error) {
  results.push({
    name: 'missing-parameter',
    status: error instanceof Error ? 'expected-failure' : 'unexpected-error-shape',
    code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
    message: error instanceof Error ? error.message : String(error),
  });
}

const repeated = compileNamedParameters('select * from public.tickets where status = :status or subject = :status');
const repeatedBinding = bindNamedParameters(repeated, { status: 'open' });

results.push({
  name: 'repeated-parameter-reuses-one-application-value',
  status: repeatedBinding.values.length === 1 && repeatedBinding.values[0] === 'open' ? 'pass' : 'unexpected-pass',
  compiledSql: repeatedBinding.sql,
  values: repeatedBinding.values,
});

try {
  bindNamedParameters(compiled, {
    status: 'open',
    customer_id: '10',
    locale: 'ja-JP',
    limit: 20,
    offset: 0,
  });
  results.push({ name: 'unused-parameter', status: 'unexpected-pass' });
} catch (error) {
  results.push({
    name: 'unused-parameter',
    status: error instanceof Error ? 'expected-failure' : 'unexpected-error-shape',
    code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
    message: error instanceof Error ? error.message : String(error),
  });
}

const hostile = "x'); drop table public.tickets; --";
const hostileBinding = bindNamedParameters(compiled, {
  status: hostile,
  customer_id: '10',
  limit: 20,
  offset: 0,
});

results.push({
  name: 'hostile-value-stays-out-of-sql',
  status: hostileBinding.sql.includes(hostile) ? 'unexpected-pass' : 'pass',
  sqlContainsHostile: hostileBinding.sql.includes(hostile),
  firstValue: hostileBinding.values[0],
});

process.stdout.write(`${JSON.stringify({
  sqlPath: path.relative(baseDir, sqlPath).replaceAll(path.sep, '/'),
  parameterNames: compiled.parameterNames,
  results,
}, null, 2)}\n`);
