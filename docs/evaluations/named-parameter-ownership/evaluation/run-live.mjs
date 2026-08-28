import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { compileNamedParameters } from '../../../../packages/named-parameters/dist/compiler.js';
import { bindNamedParameters } from '../../../../packages/named-parameters/dist/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, '..', '..', '..', '..');
const requirePg = createRequire(path.join(workspaceRoot, 'examples', 'postgres-ticket-queue-reference', 'package.json'));
const requireMysql = createRequire(path.join(workspaceRoot, 'packages', 'driver-adapter-mysql2', 'package.json'));
const requireMssql = createRequire(path.join(workspaceRoot, 'packages', 'driver-adapter-mssql', 'package.json'));
const { Client: PgClient } = requirePg('pg');
const mysql = requireMysql('mysql2/promise');
const mssql = requireMssql('mssql');
const out = path.join(here, '..', 'raw-results.json');
const params = { shop_id: 'shop-a', status: 'open', actor_id: 'actor-a', customer_id: 'customer-a' };
const crossParams = { shop_id: params.shop_id, status: params.status };
const query = 'select shop_id, status, customer_id from np_orders where shop_id = :shop_id and status = :status and (created_by = :actor_id or updated_by = :actor_id) and customer_id = :customer_id order by shop_id';
const crosswire = 'select shop_id from np_orders where shop_id = :status and status = :shop_id';
const result = { schemaVersion: 1, node: process.version, task: { sql: query, params }, drivers: {} };

function record(fn) { try { return { ok: true, value: fn() }; } catch (error) { return { ok: false, error: String(error.message ?? error) }; } }
async function recordAsync(fn) { try { return { ok: true, value: await fn() }; } catch (error) { return { ok: false, error: String(error.message ?? error) }; } }
function currentBinding(rendering) { return compileNamedParameters(query, { rendering }); }
function currentExec(binding) { return bindNamedParameters(binding, params); }

async function postgres() {
  const client = new PgClient({ connectionString: 'postgres://named_parameter_eval:named_parameter_eval@127.0.0.1:55434/named_parameter_eval' });
  await client.connect();
  try {
    await client.query('drop table if exists np_orders');
    await client.query('create table np_orders(shop_id text, status text, customer_id text, created_by text, updated_by text)');
    await client.query("insert into np_orders values ('shop-a','open','customer-a','actor-a','actor-b'), ('shop-b','closed','customer-b','actor-b','actor-a')");
    const binding = currentBinding({ style: 'indexed', prefix: '$' }); const bound = currentExec(binding);
    const directSql = 'select shop_id, status, customer_id from np_orders where shop_id = $1 and status = $2 and (created_by = $3 or updated_by = $3) and customer_id = $4 order by shop_id';
    result.drivers.pg = {
      version: '8.21.0', applicationSyntax: '$n + ordered values', current: { binding, rows: (await client.query(bound.sql, bound.values)).rows },
      direct: { sql: directSql, rows: (await client.query(directSql, ['shop-a', 'open', 'actor-a', 'customer-a'])).rows },
      negative: {
        sameTypeSwap: (await client.query(directSql, ['open', 'shop-a', 'actor-a', 'customer-a'])).rows,
        missingValues: await recordAsync(() => client.query(directSql, ['shop-a'])),
        extraValues: await recordAsync(() => client.query(directSql, ['shop-a', 'open', 'actor-a', 'customer-a', 'extra'])),
        currentMissing: record(() => bindNamedParameters(binding, { status: 'open', actor_id: 'actor-a', customer_id: 'customer-a' })),
        currentUnused: record(() => bindNamedParameters(binding, { ...params, unused: 'extra' })),
        semanticCrossWire: (await client.query(compileNamedParameters(crosswire).sql, bindNamedParameters(compileNamedParameters(crosswire), crossParams).values)).rows,
      },
    };
  } finally { await client.end(); }
}

async function mysqlRun() {
  const conn = await mysql.createConnection({ host: '127.0.0.1', port: 53306, user: 'named_parameter_eval', password: 'named_parameter_eval', database: 'named_parameter_eval', namedPlaceholders: true });
  try {
    await conn.execute('drop table if exists np_orders');
    await conn.execute('create table np_orders(shop_id varchar(30), status varchar(30), customer_id varchar(30), created_by varchar(30), updated_by varchar(30))');
    await conn.execute("insert into np_orders values ('shop-a','open','customer-a','actor-a','actor-b'), ('shop-b','closed','customer-b','actor-b','actor-a')");
    const binding = currentBinding({ style: 'anonymous', token: '?' }); const bound = currentExec(binding);
    const namedSql = 'select shop_id, status, customer_id from np_orders where shop_id = :shop_id and status = :status and (created_by = :actor_id or updated_by = :actor_id) and customer_id = :customer_id order by shop_id';
    const anonymousSql = 'select shop_id, status, customer_id from np_orders where shop_id = ? and status = ? and (created_by = ? or updated_by = ?) and customer_id = ? order by shop_id';
    const [currentRows] = await conn.execute(bound.sql, bound.values);
    const [namedRows] = await conn.execute(namedSql, params);
    const [anonymousRows] = await conn.execute(anonymousSql, ['shop-a', 'open', 'actor-a', 'actor-a', 'customer-a']);
    const [swapRows] = await conn.execute(anonymousSql, ['open', 'shop-a', 'actor-a', 'actor-a', 'customer-a']);
    const [crossRows] = await conn.execute(crosswire, crossParams);
    result.drivers.mysql2 = {
      version: '3.22.3', applicationSyntax: 'namedPlaceholders: true accepts :name + object; driver lowers internally to ?',
      current: { binding, rows: currentRows }, driverNamed: { sql: namedSql, rows: namedRows }, directAnonymous: { sql: anonymousSql, rows: anonymousRows },
      negative: {
        sameTypeSwap: swapRows,
        missingNamed: await recordAsync(() => conn.execute(namedSql, { status: 'open', actor_id: 'actor-a', customer_id: 'customer-a' })),
        unusedNamed: await recordAsync(() => conn.execute(namedSql, { ...params, unused: 'extra' })),
        anonymousMissing: await recordAsync(() => conn.execute(anonymousSql, ['shop-a'])),
        anonymousExtra: await recordAsync(() => conn.execute(anonymousSql, ['shop-a', 'open', 'actor-a', 'actor-a', 'customer-a', 'extra'])),
        repeatedOccurrenceMissing: await recordAsync(() => conn.execute(anonymousSql, ['shop-a', 'open', 'actor-a', 'customer-a'])),
        semanticCrossWire: crossRows,
        currentMissing: record(() => bindNamedParameters(binding, { status: 'open', actor_id: 'actor-a', customer_id: 'customer-a' })),
        currentUnused: record(() => bindNamedParameters(binding, { ...params, unused: 'extra' })),
      },
    };
  } finally { await conn.end(); }
}

async function mssqlRun() {
  const pool = await mssql.connect({ server: '127.0.0.1', port: 51433, user: 'sa', password: 'NamedParameterEval!42', database: 'master', options: { trustServerCertificate: true, encrypt: false } });
  const apply = (request, values) => { for (const [key, value] of Object.entries(values)) request.input(key, mssql.NVarChar, value); return request; };
  try {
    await pool.request().query("if object_id('dbo.np_orders', 'U') is not null drop table dbo.np_orders; create table dbo.np_orders(shop_id nvarchar(30), status nvarchar(30), customer_id nvarchar(30), created_by nvarchar(30), updated_by nvarchar(30)); insert into dbo.np_orders values ('shop-a','open','customer-a','actor-a','actor-b'), ('shop-b','closed','customer-b','actor-b','actor-a')");
    const binding = currentBinding({ style: 'named', prefix: '@' }); const bound = currentExec(binding);
    const namedSql = 'select shop_id, status, customer_id from dbo.np_orders where shop_id = @shop_id and status = @status and (created_by = @actor_id or updated_by = @actor_id) and customer_id = @customer_id order by shop_id';
    const currentRows = (await apply(pool.request(), Object.fromEntries(binding.parameterNames.map((name, index) => [name, bound.values[index]]))).query(bound.sql)).recordset;
    const namedRows = (await apply(pool.request(), params).query(namedSql)).recordset;
    const swapRows = (await apply(pool.request(), { ...params, shop_id: 'open', status: 'shop-a' }).query(namedSql)).recordset;
    result.drivers.mssql = {
      version: '11.0.1', applicationSyntax: '@name SQL + request.input(name, value)', current: { binding, rows: currentRows }, driverNamed: { sql: namedSql, rows: namedRows },
      negative: {
        sameTypeSwap: swapRows,
        missingRegistration: await recordAsync(() => apply(pool.request(), { status: 'open', actor_id: 'actor-a', customer_id: 'customer-a' }).query(namedSql)),
        extraRegistration: await recordAsync(() => apply(pool.request(), { ...params, unused: 'extra' }).query(namedSql)),
        repeatedName: (await apply(pool.request(), { actor_id: 'actor-a' }).query('select shop_id from dbo.np_orders where created_by = @actor_id or updated_by = @actor_id order by shop_id')).recordset,
        semanticCrossWire: (await apply(pool.request(), crossParams).query('select shop_id from dbo.np_orders where shop_id = @status and status = @shop_id')).recordset,
        currentMissing: record(() => bindNamedParameters(binding, { status: 'open', actor_id: 'actor-a', customer_id: 'customer-a' })),
        currentUnused: record(() => bindNamedParameters(binding, { ...params, unused: 'extra' })),
      },
    };
  } finally { await pool.close(); }
}

await postgres(); await mysqlRun(); await mssqlRun();
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
