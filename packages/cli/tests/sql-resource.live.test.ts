import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import pg from 'pg';
import {
  compareSqlResourceFleetSnapshots,
  createSqlResourceFleetSnapshot,
  type SqlResourceFleetComparison,
} from '../src/commands/sql-resource.js';

const databaseUrl = process.env.ASHIBA_TEST_DATABASE_URL ?? process.env.ASHIBA_POSTGRES_DATABASE_URL;

describe.skipIf(!databaseUrl)('SQL resource portability and schema compatibility live', () => {
  const client = new pg.Client({ connectionString: databaseUrl });
  const schemaName = `ashiba_resource_${randomUUID().replaceAll('-', '')}`;
  const schema = `"${schemaName}"`;
  let rootDir = '';

  beforeAll(async () => {
    await client.connect();
    await client.query(`create schema ${schema}`);
    await createBeforeSchema();
    rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-sql-resource-live-'));
    writeQuery('external', `select id, label from ${schema}.portfolio where id >= :minimum order by id`);
    writeQuery('rename-column', `select old_name as value from ${schema}.rename_probe`);
    writeQuery('drop-column', `select removed as value from ${schema}.drop_probe`);
    writeQuery('widen-type', `select value from ${schema}.widen_probe`);
    writeQuery('breaking-type', `select value from ${schema}.breaking_type_probe`);
    writeQuery('nullable-up', `select value from ${schema}.nullable_up_probe`);
    writeQuery('nullable-down', `select value from ${schema}.nullable_down_probe`);
    writeQuery('aggregate', `select sum(value) as value from ${schema}.aggregate_probe`);
    writeQuery('function-return', `select ${schema}.return_probe() as value`);
    writeQuery('join-view', `select id, note from ${schema}.join_probe`);
    writeQuery('parameter', `select id from ${schema}.param_probe where id = :id`);
    writeQuery('cast-parameter', `select :id::integer as value from ${schema}.cast_probe where id = :id::integer`);
    writeQuery('incompatible-parameter', `select id from ${schema}.incompatible_param_probe where id = :id`);
    writeQuery('array-element', `select values as value from ${schema}.array_probe`);
    writeQuery('enum-add', `select :value::${schema}.state_append as value`);
    writeQuery('enum-rename', `select :value::${schema}.state_rename as value`);
    writeQuery('domain', `select :value::${schema}.positive_int as value`);
    writeQuery('json', `select payload as value from ${schema}.json_probe`);
    writeQuery('delete-table', `select value from ${schema}.deleted_table`);
    writeQuery('delete-view', `select value from ${schema}.deleted_view`);
    writeQuery('delete-function', `select ${schema}.deleted_function() as value`);
  });

  afterAll(async () => {
    await client.query(`drop schema ${schema} cascade`);
    await client.end();
  });

  test('supports a non-TypeScript pg consumer, EXPLAIN, and canonical SQL round trip', async () => {
    const first = await createSqlResourceFleetSnapshot({ rootDir, databaseUrl, out: 'generated/first.json' });
    const external = first.entries.find((entry) => entry.id.endsWith('/external/external'));
    expect(external?.status).toBe('described');
    expect(external?.resource).toBeDefined();
    expect(JSON.stringify(external?.resource)).not.toContain('select id, label');
    expect(JSON.stringify(external?.resource?.contract.database)).not.toContain('"oid"');
    const consumer = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'sql-resource-consumer.mjs');
    const args = [rootDir, external?.resourcePath ?? '', databaseUrl ?? '', JSON.stringify({ minimum: 1 })];
    const executed = JSON.parse(execFileSync(process.execPath, [consumer, ...args], { encoding: 'utf8' }));
    expect(executed).toMatchObject({ mode: 'execute', rows: 2, columns: ['id', 'label'] });
    const explained = JSON.parse(execFileSync(process.execPath, [consumer, ...args, 'explain'], { encoding: 'utf8' }));
    expect(explained.mode).toBe('explain');
    expect(explained.plan).toBeDefined();

    const sqlPath = path.join(rootDir, external?.canonicalPath ?? '');
    const beforeHash = external?.sourceHash;
    writeFileSync(sqlPath, readFileSync(sqlPath, 'utf8').replace(
      'order by id',
      'order by id\nlimit 1\n-- tuned in a generic SQL client',
    ), 'utf8');
    const regenerated = await createSqlResourceFleetSnapshot({ rootDir, databaseUrl, out: 'generated/regenerated.json' });
    const after = regenerated.entries.find((entry) => entry.id === external?.id);
    expect(after?.sourceHash).not.toBe(beforeHash);
    const rerun = JSON.parse(execFileSync(process.execPath, [consumer, rootDir, after?.resourcePath ?? '', databaseUrl ?? '', JSON.stringify({ minimum: 1 })], { encoding: 'utf8' }));
    expect(rerun).toMatchObject({ mode: 'execute', rows: 1 });
  }, 60_000);

  test('classifies an unchanged-SQL live PostgreSQL mutation matrix', async () => {
    const before = await createSqlResourceFleetSnapshot({ rootDir, databaseUrl, out: 'generated/before.json' });
    const deterministicRepeat = await createSqlResourceFleetSnapshot({ rootDir, databaseUrl, out: 'generated/before-repeat.json' });
    expect(deterministicRepeat).toEqual(before);
    await applyMutations();
    const after = await createSqlResourceFleetSnapshot({ rootDir, databaseUrl, out: 'generated/after.json' });
    const comparison = compareSqlResourceFleetSnapshots(before, after);

    expect(after.entries.every((entry) => entry.sourceHash === before.entries.find((old) => old.id === entry.id)?.sourceHash)).toBe(true);
    expect(kind(comparison, 'external')).toBe('unaffected');
    expect(kind(comparison, 'rename-column')).toBe('execution-breaking');
    expect(kind(comparison, 'drop-column')).toBe('execution-breaking');
    expect(kind(comparison, 'widen-type')).toBe('compatible');
    expect(kind(comparison, 'breaking-type')).toBe('contract-changed');
    expect(kind(comparison, 'nullable-up')).toBe('compatible');
    expect(kind(comparison, 'nullable-down')).toBe('contract-changed');
    expect(kind(comparison, 'aggregate')).toBe('contract-changed');
    expect(kind(comparison, 'function-return')).toBe('contract-changed');
    expect(kind(comparison, 'join-view')).toBe('needs-review');
    expect(kind(comparison, 'parameter')).toBe('contract-changed');
    expect(kind(comparison, 'cast-parameter')).toBe('compatible');
    expect(kind(comparison, 'incompatible-parameter')).toBe('contract-changed');
    expect(kind(comparison, 'array-element')).toBe('compatible');
    expect(kind(comparison, 'enum-add')).toBe('compatible');
    expect(kind(comparison, 'enum-rename')).toBe('contract-changed');
    expect(kind(comparison, 'domain')).toBe('needs-review');
    expect(kind(comparison, 'json')).toBe('contract-changed');
    expect(kind(comparison, 'delete-table')).toBe('execution-breaking');
    expect(kind(comparison, 'delete-view')).toBe('execution-breaking');
    expect(kind(comparison, 'delete-function')).toBe('execution-breaking');
    const brokenResource = after.entries.find((entry) => entry.id.endsWith('/rename-column/rename-column'));
    expect(JSON.parse(readFileSync(path.join(rootDir, brokenResource?.resourcePath ?? ''), 'utf8'))).toMatchObject({
      status: 'error',
      error: { code: '42703' },
    });
    expect(comparison.metrics.affectedQueries).toBeGreaterThanOrEqual(19);
    expect(comparison.metrics.deterministicFieldsCompared).toBeGreaterThan(comparison.summary.checked);
  }, 60_000);

  async function createBeforeSchema(): Promise<void> {
    await client.query(`create type ${schema}.state_append as enum ('queued')`);
    await client.query(`create type ${schema}.state_rename as enum ('queued', 'done')`);
    await client.query(`create domain ${schema}.positive_int as integer constraint positive_check check (value > 0)`);
    await client.query(`create table ${schema}.portfolio (id integer primary key, label text not null)`);
    await client.query(`insert into ${schema}.portfolio values (1, 'one'), (2, 'two')`);
    for (const ddl of [
      `create table ${schema}.rename_probe (old_name integer)`,
      `create table ${schema}.drop_probe (removed integer)`,
      `create table ${schema}.widen_probe (value smallint)`,
      `create table ${schema}.breaking_type_probe (value integer)`,
      `create table ${schema}.nullable_up_probe (value integer)`,
      `create table ${schema}.nullable_down_probe (value integer not null)`,
      `create table ${schema}.aggregate_probe (value integer)`,
      `create table ${schema}.param_probe (id integer)`,
      `create table ${schema}.cast_probe (id integer)`,
      `create table ${schema}.incompatible_param_probe (id integer)`,
      `create table ${schema}.array_probe (values smallint[])`,
      `create table ${schema}.json_probe (payload json)`,
      `create table ${schema}.domain_probe (value ${schema}.positive_int)`,
      `create table ${schema}.join_left (id integer primary key)`,
      `create table ${schema}.join_right (id integer primary key, note text not null)`,
      `create table ${schema}.deleted_table (value integer)`,
    ]) await client.query(ddl);
    await client.query(`create view ${schema}.join_probe as select l.id, r.note from ${schema}.join_left l join ${schema}.join_right r on r.id = l.id`);
    await client.query(`create view ${schema}.deleted_view as select value from ${schema}.deleted_table`);
    await client.query(`create function ${schema}.return_probe() returns integer language sql immutable as $$ select 1 $$`);
    await client.query(`create function ${schema}.deleted_function() returns integer language sql immutable as $$ select 1 $$`);
  }

  async function applyMutations(): Promise<void> {
    for (const ddl of [
      `alter table ${schema}.rename_probe rename column old_name to new_name`,
      `alter table ${schema}.drop_probe drop column removed`,
      `alter table ${schema}.widen_probe alter column value type integer using value::integer`,
      `alter table ${schema}.breaking_type_probe alter column value type bigint using value::bigint`,
      `alter table ${schema}.nullable_up_probe alter column value set not null`,
      `alter table ${schema}.nullable_down_probe alter column value drop not null`,
      `alter table ${schema}.aggregate_probe alter column value type bigint using value::bigint`,
      `alter function ${schema}.return_probe() rename to old_return_probe`,
      `create function ${schema}.return_probe() returns bigint language sql immutable as $$ select 1::bigint $$`,
      `create or replace view ${schema}.join_probe as select l.id, r.note from ${schema}.join_left l left join ${schema}.join_right r on r.id = l.id`,
      `alter table ${schema}.param_probe alter column id type bigint using id::bigint`,
      `alter table ${schema}.cast_probe alter column id type bigint using id::bigint`,
      `alter table ${schema}.incompatible_param_probe alter column id type uuid using '00000000-0000-0000-0000-000000000000'::uuid`,
      `alter table ${schema}.array_probe alter column values type integer[] using values::integer[]`,
      `alter type ${schema}.state_append add value 'done'`,
      `alter type ${schema}.state_rename rename value 'queued' to 'waiting'`,
      `alter domain ${schema}.positive_int drop constraint positive_check`,
      `alter domain ${schema}.positive_int add constraint positive_check check (value >= 0)`,
      `alter table ${schema}.json_probe alter column payload type jsonb using payload::jsonb`,
      `alter view ${schema}.deleted_view rename to old_deleted_view`,
      `alter table ${schema}.deleted_table rename to old_deleted_table`,
      `alter function ${schema}.deleted_function() rename to old_deleted_function`,
    ]) await client.query(ddl);
  }

  function writeQuery(name: string, sql: string): void {
    const directory = path.join(rootDir, 'src/features/schema-compat/queries', name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, `${name}.sql`), `${sql.trim()}\n`, 'utf8');
  }
});

function kind(comparison: SqlResourceFleetComparison, queryName: string): string | undefined {
  return comparison.queries.find((query) => query.id.endsWith(`/${queryName}/${queryName}`))?.classification;
}
