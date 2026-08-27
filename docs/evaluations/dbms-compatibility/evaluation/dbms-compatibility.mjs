import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { compileNamedParameters } from '../../../../packages/named-parameters/dist/compiler.js';
import { bindNamedParameters, NamedParameterError } from '../../../../packages/named-parameters/dist/index.js';
import { createMysql2Adapter } from '../../../../packages/driver-adapter-mysql2/dist/index.js';
import { createMssqlAdapter } from '../../../../packages/driver-adapter-mssql/dist/index.js';
import { createPostgresAdapter } from '../../../../packages/driver-adapter-pg/dist/index.js';

const mysqlRequire = createRequire(new URL('../../../../packages/driver-adapter-mysql2/package.json', import.meta.url));
const mssqlRequire = createRequire(new URL('../../../../packages/driver-adapter-mssql/package.json', import.meta.url));
const pgRequire = createRequire(new URL('../../../../packages/driver-adapter-pg/package.json', import.meta.url));
const mysql = mysqlRequire('mysql2/promise');
const sql = mssqlRequire('mssql');
const { Client } = pgRequire('pg');

if (process.env.ASHIBA_DBMS_EVALUATION_ALLOW_DESTRUCTIVE !== '1') {
  throw new Error('Set ASHIBA_DBMS_EVALUATION_ALLOW_DESTRUCTIVE=1 only for an isolated evaluation database.');
}

const outputPath = new URL('../raw-results.json', import.meta.url);
const bigId = '9007199254740993';
const customerId = '9007199254740992';
const amount = '1234567890123.45';
const observedAt = new Date('2030-01-02T03:04:05.678Z');
const canonical = {
  get: 'select t.id, t.customer_id, t.status, t.assignee_id, t.amount, t.observed_at, c.active from ashiba_dbms_eval_tickets t join ashiba_dbms_eval_customers c on c.id = t.customer_id where t.id = :ticketId order by t.id',
  list: 'select t.id, t.customer_id, t.status, t.assignee_id, t.amount, t.observed_at, c.active from ashiba_dbms_eval_tickets t join ashiba_dbms_eval_customers c on c.id = t.customer_id where t.customer_id = :customerId and (:status is null or t.status = :status) order by t.id',
  listPostgres: 'select t.id, t.customer_id, t.status, t.assignee_id, t.amount, t.observed_at, c.active from ashiba_dbms_eval_tickets t join ashiba_dbms_eval_customers c on c.id = t.customer_id where t.customer_id = :customerId and (:status::text is null or t.status = :status::text) order by t.id',
  insert: 'insert into ashiba_dbms_eval_tickets (id, customer_id, status, assignee_id, amount, observed_at) values (:ticketId, :customerId, :status, :assigneeId, :amount, :observedAt)',
  update: 'update ashiba_dbms_eval_tickets set status = :status where id = :ticketId',
  hostile: 'select id from ashiba_dbms_eval_customers where display_name = :displayName',
};

const typeOf = (value) => value === null ? 'null' : value instanceof Date ? 'Date' : typeof value;
const rowTypes = (row) => Object.fromEntries(Object.entries(row ?? {}).map(([key, value]) => [key, typeOf(value)]));
function assert(condition, message) { if (!condition) throw new Error(message); }
function binding(style, source) {
  return compileNamedParameters(source, style === 'pg'
    ? { rendering: { style: 'indexed', prefix: '$' } }
    : style === 'mysql2'
      ? { rendering: { style: 'anonymous', token: '?' } }
      : { rendering: { style: 'named', prefix: '@' } });
}
function bindingEvidence(style, source = canonical.list) {
  const statement = binding(style, source);
  const bound = bindNamedParameters(statement, { customerId, status: 'open' });
  let missing; let unused;
  try { bindNamedParameters(statement, { customerId }); } catch (error) { missing = error instanceof NamedParameterError ? error.code : String(error); }
  try { bindNamedParameters(statement, { customerId, status: 'open', unused: true }); } catch (error) { unused = error instanceof NamedParameterError ? error.code : String(error); }
  assert(missing === 'ASHIBA_MISSING_PARAMETER', `${style}: missing parameter was not rejected`);
  assert(unused === 'ASHIBA_UNUSED_PARAMETER', `${style}: unused parameter was not rejected`);
  assert(!statement.sql.includes(customerId), `${style}: lowering interpolated a value`);
  return { compiled: statement, boundValues: bound.values, missing, unused };
}
function sourceHash(source) { return `sha256:${createHash('sha256').update(source.replace(/\r\n?/g, '\n')).digest('hex')}`; }
async function staleEvidence(style) {
  const source = canonical.get; const compiled = binding(style, source); const model = { analysis: { sourceHash: sourceHash(source) }, bindings: { [style === 'pg' ? 'postgres' : style]: { sourceHash: sourceHash(source), ...compiled } } };
  let nativeCalled = false; let errorCode;
  try {
    if (style === 'pg') await createPostgresAdapter({ async query() { nativeCalled = true; return { rows: [] }; } }).execute({ sql: `${source} /* stale */`, queryModel: model }, { ticketId: bigId });
    else if (style === 'mysql2') await createMysql2Adapter({ async execute() { nativeCalled = true; return [[], []]; } }).execute({ sql: `${source} /* stale */`, queryModel: model }, { ticketId: bigId });
    else await createMssqlAdapter({ request() { return { input() { return this; }, async query() { nativeCalled = true; return { recordset: [] }; } }; } }).execute({ sql: `${source} /* stale */`, queryModel: model }, { ticketId: bigId });
  } catch (error) { errorCode = error?.code; }
  assert(errorCode === 'ASHIBA_QUERY_MODEL_STALE' && !nativeCalled, `${style}: stale metadata did not fail before native execution`);
  return { errorCode, nativeCalled };
}

async function pgEvaluation() {
  const client = new Client({ connectionString: process.env.PG_URL }); await client.connect();
  const run = async (source, params) => { const b = binding('pg', source); const q = bindNamedParameters(b, params); return client.query(q.sql, q.values); };
  try {
    await client.query('drop table if exists ashiba_dbms_eval_tickets; drop table if exists ashiba_dbms_eval_customers; drop table if exists ashiba_dbms_eval_generated_probe');
    await client.query('create table ashiba_dbms_eval_customers (id bigint primary key, display_name text not null, active boolean not null); create table ashiba_dbms_eval_tickets (id bigint primary key, customer_id bigint not null references ashiba_dbms_eval_customers(id), status text not null, assignee_id bigint null, amount numeric(20,2) not null, observed_at timestamptz not null); create table ashiba_dbms_eval_generated_probe (id bigserial primary key)');
    await client.query('insert into ashiba_dbms_eval_customers (id, display_name, active) values ($1, $2, $3)', [customerId, 'Ada', true]);
    await run(canonical.insert, { ticketId: bigId, customerId, status: 'open', assigneeId: null, amount, observedAt });
    const get = await run(canonical.get, { ticketId: bigId }); assert(get.rows.length === 1 && get.rows[0].assignee_id === null, 'pg: nullable join result mismatch');
    const list = await run(canonical.listPostgres, { customerId, status: 'open' }); assert(list.rows.length === 1, 'pg: repeated logical parameter failed');
    const updated = await run(canonical.update, { ticketId: bigId, status: 'closed' }); assert(updated.rowCount === 1, 'pg: update affected-row behavior failed');
    const hostile = "Ada'; drop table ashiba_dbms_eval_customers; --"; const hostileResult = await run(canonical.hostile, { displayName: hostile }); assert(hostileResult.rows.length === 0, 'pg: hostile value changed SQL meaning'); const stillThere = await client.query('select count(*) from ashiba_dbms_eval_customers'); assert(stillThere.rows[0].count === '1', 'pg: hostile value changed schema');
    await client.query('begin'); await run(canonical.insert, { ticketId: '9007199254740994', customerId, status: 'rolled-back', assigneeId: null, amount, observedAt }); await client.query('rollback'); const residue = await client.query("select count(*) from ashiba_dbms_eval_tickets where status = 'rolled-back'"); assert(residue.rows[0].count === '0', 'pg: rollback left fixture residue');
    const generated = await client.query('insert into ashiba_dbms_eval_generated_probe default values returning id');
    return { live: true, binding: bindingEvidence('pg', canonical.listPostgres), staleMetadata: await staleEvidence('pg'), representations: rowTypes(get.rows[0]), nullableValue: get.rows[0].assignee_id, dml: { updateRowCount: updated.rowCount, generatedId: { value: String(generated.rows[0].id), type: typeOf(generated.rows[0].id) } }, rollbackResidue: residue.rows[0].count };
  } finally { await client.end(); }
}

async function mysqlEvaluation() {
  const connection = await mysql.createConnection(process.env.MYSQL_URL);
  const run = async (source, params) => { const b = binding('mysql2', source); const q = bindNamedParameters(b, params); return connection.execute(q.sql, q.values); };
  try {
    await connection.query('drop table if exists ashiba_dbms_eval_tickets'); await connection.query('drop table if exists ashiba_dbms_eval_customers'); await connection.query('drop table if exists ashiba_dbms_eval_generated_probe');
    await connection.query('create table ashiba_dbms_eval_customers (id bigint primary key, display_name varchar(100) not null, active tinyint not null)');
    await connection.query('create table ashiba_dbms_eval_tickets (id bigint primary key, customer_id bigint not null, status varchar(32) not null, assignee_id bigint null, amount decimal(20,2) not null, observed_at datetime(3) not null, foreign key (customer_id) references ashiba_dbms_eval_customers(id))');
    await connection.query('create table ashiba_dbms_eval_generated_probe (id bigint auto_increment primary key)');
    await connection.execute('insert into ashiba_dbms_eval_customers (id, display_name, active) values (?, ?, ?)', [customerId, 'Ada', 1]);
    await run(canonical.insert, { ticketId: bigId, customerId, status: 'open', assigneeId: null, amount, observedAt });
    const [get] = await run(canonical.get, { ticketId: bigId }); assert(get.length === 1 && get[0].assignee_id === null, 'mysql2: nullable join result mismatch');
    const [list] = await run(canonical.list, { customerId, status: 'open' }); assert(list.length === 1, 'mysql2: repeated logical parameter failed');
    const [updated] = await run(canonical.update, { ticketId: bigId, status: 'closed' }); assert(updated.affectedRows === 1, 'mysql2: update affected-row behavior failed');
    const hostile = "Ada'; drop table ashiba_dbms_eval_customers; --"; const [hostileResult] = await run(canonical.hostile, { displayName: hostile }); assert(hostileResult.length === 0, 'mysql2: hostile value changed SQL meaning'); const [[stillThere]] = await connection.query('select count(*) as count from ashiba_dbms_eval_customers'); assert(Number(stillThere.count) === 1, 'mysql2: hostile value changed schema');
    await connection.beginTransaction(); await run(canonical.insert, { ticketId: '9007199254740994', customerId, status: 'rolled-back', assigneeId: null, amount, observedAt }); await connection.rollback(); const [[residue]] = await connection.query("select count(*) as count from ashiba_dbms_eval_tickets where status = 'rolled-back'"); assert(Number(residue.count) === 0, 'mysql2: rollback left fixture residue');
    const [generated] = await connection.execute('insert into ashiba_dbms_eval_generated_probe values ()');
    return { live: true, binding: bindingEvidence('mysql2'), staleMetadata: await staleEvidence('mysql2'), representations: rowTypes(get[0]), nullableValue: get[0].assignee_id, dml: { updateAffectedRows: updated.affectedRows, generatedId: { value: String(generated.insertId), type: typeOf(generated.insertId) } }, rollbackResidue: residue.count };
  } finally { await connection.end(); }
}

async function mssqlEvaluation() {
  const pool = await sql.connect(process.env.MSSQL_CONFIG ? JSON.parse(process.env.MSSQL_CONFIG) : {});
  const run = async (source, params, request = pool.request()) => { const b = binding('mssql', source); const q = bindNamedParameters(b, params); for (const name of q.parameterNames) request.input(name, params[name]); return request.query(q.sql); };
  try {
    await pool.request().query("if object_id('ashiba_dbms_eval_tickets', 'U') is not null drop table ashiba_dbms_eval_tickets; if object_id('ashiba_dbms_eval_customers', 'U') is not null drop table ashiba_dbms_eval_customers; if object_id('ashiba_dbms_eval_generated_probe', 'U') is not null drop table ashiba_dbms_eval_generated_probe; create table ashiba_dbms_eval_customers (id bigint primary key, display_name nvarchar(100) not null, active bit not null); create table ashiba_dbms_eval_tickets (id bigint primary key, customer_id bigint not null references ashiba_dbms_eval_customers(id), status nvarchar(32) not null, assignee_id bigint null, amount decimal(20,2) not null, observed_at datetime2(3) not null); create table ashiba_dbms_eval_generated_probe (id bigint identity(1,1) primary key)");
    const seed = pool.request(); seed.input('id', customerId); seed.input('name', 'Ada'); seed.input('active', true); await seed.query('insert into ashiba_dbms_eval_customers (id, display_name, active) values (@id, @name, @active)');
    await run(canonical.insert, { ticketId: bigId, customerId, status: 'open', assigneeId: null, amount, observedAt });
    const get = await run(canonical.get, { ticketId: bigId }); assert(get.recordset.length === 1 && get.recordset[0].assignee_id === null, 'mssql: nullable join result mismatch');
    const list = await run(canonical.list, { customerId, status: 'open' }); assert(list.recordset.length === 1, 'mssql: repeated logical parameter failed');
    const updated = await run(canonical.update, { ticketId: bigId, status: 'closed' }); assert(updated.rowsAffected[0] === 1, 'mssql: update affected-row behavior failed');
    const hostile = "Ada'; drop table ashiba_dbms_eval_customers; --"; const hostileResult = await run(canonical.hostile, { displayName: hostile }); assert(hostileResult.recordset.length === 0, 'mssql: hostile value changed SQL meaning'); const stillThere = await pool.request().query('select count(*) as count from ashiba_dbms_eval_customers'); assert(stillThere.recordset[0].count === 1, 'mssql: hostile value changed schema');
    const transaction = new sql.Transaction(pool); await transaction.begin(); await run(canonical.insert, { ticketId: '9007199254740994', customerId, status: 'rolled-back', assigneeId: null, amount, observedAt }, new sql.Request(transaction)); await transaction.rollback(); const residue = await pool.request().query("select count(*) as count from ashiba_dbms_eval_tickets where status = 'rolled-back'"); assert(residue.recordset[0].count === 0, 'mssql: rollback left fixture residue');
    const generated = await pool.request().query('insert into ashiba_dbms_eval_generated_probe output inserted.id default values');
    return { live: true, binding: bindingEvidence('mssql'), staleMetadata: await staleEvidence('mssql'), representations: rowTypes(get.recordset[0]), nullableValue: get.recordset[0].assignee_id, dml: { updateRowsAffected: updated.rowsAffected, generatedId: { value: String(generated.recordset[0].id), type: typeOf(generated.recordset[0].id) } }, rollbackResidue: residue.recordset[0].count };
  } finally { await pool.close(); }
}

const results = { generatedAt: new Date().toISOString(), canonicalSql: canonical, postgresql: await pgEvaluation(), mysql2: await mysqlEvaluation(), mssql: await mssqlEvaluation() };
await writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
