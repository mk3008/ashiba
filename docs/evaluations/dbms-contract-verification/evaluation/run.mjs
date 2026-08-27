import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeStandalonePostgresContract, checkStandalonePostgresContract } from '../../../../packages/cli/dist/commands/standalone-postgres-contract.js';

const mysqlRequire = createRequire(new URL('../../../../packages/driver-adapter-mysql2/package.json', import.meta.url));
const mssqlRequire = createRequire(new URL('../../../../packages/driver-adapter-mssql/package.json', import.meta.url));
const pgRequire = createRequire(new URL('../../../../packages/driver-adapter-pg/package.json', import.meta.url));
const mysql = mysqlRequire('mysql2/promise');
const sql = mssqlRequire('mssql');
const { Client } = pgRequire('pg');
const assert = (value, message) => { if (!value) throw new Error(message); };
const compareShape = (actual, expected) => {
  const actualByName = new Map(actual.map((field) => [field.name, field.type])); const expectedByName = new Map(expected.map((field) => [field.name, field.type]));
  return [...expectedByName].flatMap(([name, type]) => !actualByName.has(name) ? [`${name}: missing`] : actualByName.get(name) !== type ? [`${name}: ${type} / ${actualByName.get(name)}`] : []).concat([...actualByName.keys()].filter((name) => !expectedByName.has(name)).map((name) => `${name}: extra`));
};

const pgSql = 'select t.id, t.customer_id, t.status, t.assignee_id, t.amount, c.active from ashiba_contract_eval_tickets t join ashiba_contract_eval_customers c on c.id = t.customer_id where t.id = :ticketId::bigint order by t.id';
const pgDml = 'insert into ashiba_contract_eval_tickets (id, customer_id, status, amount) values (:ticketId::bigint, :customerId::bigint, :status::text, :amount::numeric) returning id';
const mssqlSql = 'select t.id, t.customer_id, t.status, t.assignee_id, t.amount, c.active from ashiba_contract_eval_tickets t join ashiba_contract_eval_customers c on c.id = t.customer_id where t.customer_id = @customerId and (@status is null or t.status = @status) order by t.id';
const mssqlDml = 'insert into ashiba_contract_eval_tickets (id, customer_id, status, amount) values (@ticketId, @customerId, @status, @amount)';
const mysqlSql = 'select t.id, t.customer_id, t.status, t.assignee_id, t.amount, c.active from ashiba_contract_eval_tickets t join ashiba_contract_eval_customers c on c.id = t.customer_id where t.customer_id = ? and (? is null or t.status = ?) order by t.id';
const mysqlDml = 'insert into ashiba_contract_eval_tickets (id, customer_id, status, amount) values (?, ?, ?, ?)';

async function postgres() {
  const client = new Client({ connectionString: process.env.PG_URL }); await client.connect();
  const root = await mkdtemp(path.join(tmpdir(), 'ashiba-contract-eval-pg-'));
  try {
    await client.query('create table ashiba_contract_eval_customers (id bigint primary key, active boolean not null); create table ashiba_contract_eval_tickets (id bigint primary key, customer_id bigint not null references ashiba_contract_eval_customers(id), status text not null, assignee_id bigint null, amount numeric(20,2) not null)');
    await client.query('insert into ashiba_contract_eval_customers values (1, true)');
    await writeFile(path.join(root, 'get.sql'), pgSql); await writeFile(path.join(root, 'types.ts'), 'export interface Params { ticketId: string | bigint; }\nexport interface Row { id: string | null; customer_id: string | null; status: string | null; assignee_id: string | null; amount: string | null; active: boolean | null; }\nexport interface WrongParams { ticketId: number; extra: string; }\nexport interface WrongRow { id: number; customer_id: string; status: string; assignee_id: string | null; amount: string; extra: boolean; }\n');
    const written = await writeStandalonePostgresContract({ rootDir: root, sqlFile: 'get.sql', databaseUrl: process.env.PG_URL, out: 'get.contract.json' });
    const positive = checkStandalonePostgresContract({ rootDir: root, sqlFile: 'get.sql', contract: 'get.contract.json', paramsTypeFile: 'types.ts', paramsType: 'Params', resultTypeFile: 'types.ts', resultType: 'Row' });
    const wrongParams = checkStandalonePostgresContract({ rootDir: root, sqlFile: 'get.sql', contract: 'get.contract.json', paramsTypeFile: 'types.ts', paramsType: 'WrongParams', resultTypeFile: 'types.ts', resultType: 'Row' });
    const wrongRow = checkStandalonePostgresContract({ rootDir: root, sqlFile: 'get.sql', contract: 'get.contract.json', paramsTypeFile: 'types.ts', paramsType: 'Params', resultTypeFile: 'types.ts', resultType: 'WrongRow' });
    await writeFile(path.join(root, 'get.sql'), `${pgSql}\n-- stale\n`); const stale = checkStandalonePostgresContract({ rootDir: root, sqlFile: 'get.sql', contract: 'get.contract.json', paramsTypeFile: 'types.ts', paramsType: 'Params', resultTypeFile: 'types.ts', resultType: 'Row' });
    await writeFile(path.join(root, 'dml.sql'), pgDml); await writeStandalonePostgresContract({ rootDir: root, sqlFile: 'dml.sql', databaseUrl: process.env.PG_URL, out: 'dml.contract.json' }); const count = await client.query('select count(*)::integer as count from ashiba_contract_eval_tickets');
    assert(positive.ok && !wrongParams.ok && !wrongRow.ok && !stale.ok && count.rows[0].count === 0, `postgres controls failed: ${JSON.stringify({ positive, wrongParams, wrongRow, stale, count: count.rows[0].count })}`);
    return { strategy: 'native-static-describe', positive: positive.ok, wrongParams: wrongParams.issues, wrongRow: wrongRow.issues, stale: stale.issues, dmlRowsAfterDescribe: count.rows[0].count, parameters: written.contract.database.parameters.map((x) => [x.name, x.databaseType.formattedName]), results: written.contract.database.results.map((x) => [x.name, x.databaseType.formattedName, x.nullability.value]), driver: written.contract.driver.results.map((x) => [x.name, x.typeScriptType]) };
  } finally { await client.query('drop table if exists ashiba_contract_eval_tickets; drop table if exists ashiba_contract_eval_customers'); await client.end(); await rm(root, { recursive: true, force: true }); }
}

async function mssql() {
  const pool = await sql.connect(JSON.parse(process.env.MSSQL_CONFIG));
  const describe = async (source, params) => { const request = pool.request(); request.input('source', sql.NVarChar, source); request.input('params', sql.NVarChar, params); return request.query('exec sys.sp_describe_first_result_set @tsql = @source, @params = @params, @browse_information_mode = 0'); };
  const undeclared = async (source) => { const request = pool.request(); request.input('source', sql.NVarChar, source); return request.query('exec sys.sp_describe_undeclared_parameters @tsql = @source'); };
  try {
    await pool.request().query("create table ashiba_contract_eval_customers (id bigint primary key, active bit not null); create table ashiba_contract_eval_tickets (id bigint primary key, customer_id bigint not null references ashiba_contract_eval_customers(id), status nvarchar(32) not null, assignee_id bigint null, amount decimal(20,2) not null); insert into ashiba_contract_eval_customers values (1, 1)");
    const result = await describe(mssqlSql, '@customerId bigint, @status nvarchar(32)');
    const parameter = await undeclared('select id from ashiba_contract_eval_tickets where customer_id = @customerId');
    const repeatedParameter = await undeclared(mssqlSql).then((value) => ({ rows: value.recordset })).catch((error) => ({ error: { number: error.number, message: error.message } }));
    const dml = await describe(mssqlDml, '@ticketId bigint, @customerId bigint, @status nvarchar(32), @amount decimal(20,2)');
    const count = await pool.request().query('select count(*) as count from ashiba_contract_eval_tickets');
    const wrongType = await undeclared("select id from ashiba_contract_eval_tickets where status = @status");
    const resultColumns = result.recordset.map((x) => ({ name: x.name, type: x.system_type_name, nullable: x.is_nullable }));
    const positiveShape = compareShape(resultColumns, [{ name: 'id', type: 'bigint' }, { name: 'customer_id', type: 'bigint' }, { name: 'status', type: 'nvarchar(32)' }, { name: 'assignee_id', type: 'bigint' }, { name: 'amount', type: 'decimal(20,2)' }, { name: 'active', type: 'bit' }]);
    const wrongShape = compareShape(resultColumns, [{ name: 'id', type: 'int' }, { name: 'status', type: 'nvarchar(32)' }, { name: 'extra', type: 'bit' }]);
    assert(resultColumns.length === 6 && positiveShape.length === 0 && wrongShape.length > 0 && count.recordset[0].count === 0, 'mssql describe or non-execution control failed');
    return { strategy: 'native-static-describe', resultColumns, manualShapePositive: positiveShape, manualShapeWrong: wrongShape, parameterInference: parameter.recordset.map((x) => ({ name: x.name, type: x.suggested_system_type_name })), repeatedParameterInference: repeatedParameter.rows ? repeatedParameter.rows.map((x) => ({ name: x.name, type: x.suggested_system_type_name })) : repeatedParameter, dmlDescribeColumnCount: dml.recordset.length, dmlRowsAfterDescribe: count.recordset[0].count, wrongTypeInference: wrongType.recordset.map((x) => ({ name: x.name, type: x.suggested_system_type_name })), limitations: 'sp_describe_undeclared_parameters is only a suggestion source; supplied @params are authoritative for describe.' };
  } finally { await pool.request().query("if object_id('ashiba_contract_eval_tickets', 'U') is not null drop table ashiba_contract_eval_tickets; if object_id('ashiba_contract_eval_customers', 'U') is not null drop table ashiba_contract_eval_customers"); await pool.close(); }
}

async function mysqlEval() {
  const connection = await mysql.createConnection(process.env.MYSQL_URL);
  const prepare = async (source) => connection.prepare(source);
  const internalPrepare = (source) => new Promise((resolve, reject) => connection.connection.prepare(source, (error, statement) => error ? reject(error) : resolve(statement)));
  try {
    await connection.query('drop table if exists ashiba_contract_eval_tickets'); await connection.query('drop table if exists ashiba_contract_eval_customers');
    await connection.query('create table ashiba_contract_eval_customers (id bigint primary key, active tinyint not null)'); await connection.query('create table ashiba_contract_eval_tickets (id bigint primary key, customer_id bigint not null, status varchar(32) not null, assignee_id bigint null, amount decimal(20,2) not null, foreign key (customer_id) references ashiba_contract_eval_customers(id))'); await connection.query('insert into ashiba_contract_eval_customers values (1, 1)');
    const select = await prepare(mysqlSql); const dml = await prepare(mysqlDml); const internalSelect = await internalPrepare(mysqlSql); const internalDml = await internalPrepare(mysqlDml); const count = await connection.query('select count(*) as count from ashiba_contract_eval_tickets');
    const columnShape = (statement) => ({ keys: Object.keys(statement), parameterCount: statement.parameterCount, parameters: statement.parameters?.map((x) => ({ name: x.name, columnType: x.columnType, type: x.type })) ?? [], columns: statement.columns?.map((x) => ({ name: x.name, columnType: x.columnType, type: x.type, flags: x.flags, decimals: x.decimals })) ?? [] });
    const selectShape = columnShape(select); const dmlShape = columnShape(dml); const internalSelectShape = columnShape(internalSelect); const internalDmlShape = columnShape(internalDml);
    select.close(); dml.close(); internalSelect.close(); internalDml.close(); assert(Number(count[0][0].count) === 0, 'mysql prepare executed DML');
    return { strategy: 'application-supplied-contract', select: selectShape, dml: dmlShape, internalPrepareOnlyObservation: { select: internalSelectShape, dml: internalDmlShape }, dmlRowsAfterPrepare: count[0][0].count, negativeControls: { missingAndExtraNames: 'available from existing generated binding metadata, not from native prepare metadata', wrongParameterType: 'not returned by mysql2 public prepare shape', wrongResultType: 'internal prepare exposes result fields but using connection.connection is driver-internal ownership, so not a small public Ashiba lane' } };
  } finally { await connection.query('drop table if exists ashiba_contract_eval_tickets'); await connection.query('drop table if exists ashiba_contract_eval_customers'); await connection.end(); }
}

const results = { generatedAt: new Date().toISOString(), postgresql: await postgres(), mssql: await mssql(), mysql: await mysqlEval() };
await writeFile(new URL('../raw-results.json', import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
