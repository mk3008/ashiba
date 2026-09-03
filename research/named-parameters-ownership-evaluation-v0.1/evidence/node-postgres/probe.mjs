import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { compileNamedParameters } from '../../../../packages/named-parameters/dist/compiler.js';
import { bindNamedParameters, NamedParameterError } from '../../../../packages/named-parameters/dist/index.js';

const { default: pg } = await import(pathToFileURL('C:/tmp/ashiba-named-parameters-ownership-v0-1/examples/postgres-ticket-queue-reference/node_modules/pg/lib/index.js').href);

const canonical = readFileSync(new URL('./representative-sql.txt', import.meta.url), 'utf8');
const prepared = compileNamedParameters(canonical);
assert.deepEqual(prepared.parameterNames, ['tenantId', 'status', 'hostileValue']);
assert.match(prepared.sql, /tenant_id = \$1::uuid/);
assert.match(prepared.sql, /\(\$2::text IS NULL OR status = \$2\)/);
const hostileValue = "x'); drop table ownership_probe_items; --";
const query = bindNamedParameters(prepared, { tenantId: '11111111-1111-1111-1111-111111111111', status: 'open', hostileValue });
assert.equal(query.sql.includes(hostileValue), false);
assert.deepEqual(query.values, ['11111111-1111-1111-1111-111111111111', 'open', hostileValue]);
assert.throws(() => bindNamedParameters(prepared, { tenantId: 'x', status: 'open' }), NamedParameterError);
assert.throws(() => bindNamedParameters(prepared, { tenantId: 'x', status: 'open', hostileValue, extra: 1 }), NamedParameterError);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('create table if not exists ownership_probe_items (id int primary key, tenant_id uuid not null, status text not null, title text not null)');
  await client.query('truncate ownership_probe_items');
  await client.query("insert into ownership_probe_items values (1, '11111111-1111-1111-1111-111111111111', 'open', 'ok'), (2, '11111111-1111-1111-1111-111111111111', 'closed', 'other'), (3, '22222222-2222-2222-2222-222222222222', 'open', 'other tenant')");
  const result = await client.query(query.sql, query.values);
  assert.deepEqual(result.rows, [{ id: 1, status: 'open' }]);
  console.log('NODE_POSTGRES_PROBE_PASS');
} finally { await client.end(); }
