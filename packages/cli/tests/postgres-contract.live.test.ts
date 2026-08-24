import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { derivePostgresQueryContractFromDatabase } from '../src/commands/postgres-contract.js';
import { runFeatureGeneratedMapperCheck, runFeatureQueryPostgresContract } from '../src/commands/feature.js';
import { runModelGen } from '../src/commands/model-gen.js';
import { checkStandalonePostgresContract, writeStandalonePostgresContract } from '../src/commands/standalone-postgres-contract.js';

const databaseUrl =
  process.env.ASHIBA_TEST_DATABASE_URL ??
  process.env.ASHIBA_POSTGRES_DATABASE_URL ??
  process.env.DATABASE_URL;
const connectionString = databaseUrl ?? '';

describe.skipIf(!databaseUrl)('PostgreSQL-derived query contract live', () => {
  const setup = new pg.Client({ connectionString });

  beforeAll(async () => {
    await setup.connect();
    await setup.query('drop schema if exists ashiba_contract_live cascade');
    await setup.query('create schema ashiba_contract_live');
    await setup.query("create type ashiba_contract_live.work_state as enum ('queued', 'running', 'done')");
    await setup.query('create domain ashiba_contract_live.positive_int as integer check (value > 0)');
    await setup.query([
      'create table ashiba_contract_live.accounts (',
      '  id integer primary key,',
      '  label text not null',
      ')',
    ].join('\n'));
    await setup.query([
      'create table ashiba_contract_live.events (',
      '  id bigint generated always as identity primary key,',
      '  account_id integer not null references ashiba_contract_live.accounts(id),',
      '  amount numeric(12, 2),',
      '  tags text[] not null,',
      '  payload jsonb not null',
      ')',
    ].join('\n'));
    await setup.query('create table ashiba_contract_live.mutation_probe (id integer primary key)');
    await setup.query("insert into ashiba_contract_live.accounts (id, label) values (1, 'one'), (2, 'two')");
    await setup.query([
      'insert into ashiba_contract_live.events (account_id, amount, tags, payload)',
      "values (1, 12.50, array['priority'], '{\"kind\":\"credit\"}'::jsonb),",
      "       (1, null, array[]::text[], '{\"kind\":\"unknown\"}'::jsonb)",
    ].join('\n'));
  });

  afterAll(async () => {
    await setup.query('drop schema if exists ashiba_contract_live cascade');
    await setup.end();
  });

  test('separates PostgreSQL type identity from default node-postgres values', async () => {
    const sourceSql = [
      'select',
      '  :intValue::integer as int_value,',
      '  :bigintValue::bigint as bigint_value,',
      '  :numericValue::numeric as numeric_value,',
      '  :textValue::text as text_value,',
      '  :boolValue::boolean as bool_value,',
      '  :timestampValue::timestamptz as timestamp_value,',
      '  :arrayValue::integer[] as array_value,',
      '  :enumValue::ashiba_contract_live.work_state as enum_value,',
      '  :domainValue::ashiba_contract_live.positive_int as domain_value,',
      '  :jsonValue::jsonb as json_value,',
      '  count(*) as aggregate_count,',
      '  case when :intValue > 0 then :intValue else null end as case_value,',
      '  nullif(:intValue, 0) as nullif_value,',
      '  row_number() over () as row_number_value',
      'from (values (1)) as sample(id)',
    ].join('\n');
    const compiledSql = sourceSql
      .replaceAll(':intValue', '$1')
      .replace(':bigintValue', '$2')
      .replace(':numericValue', '$3')
      .replace(':textValue', '$4')
      .replace(':boolValue', '$5')
      .replace(':timestampValue', '$6')
      .replace(':arrayValue', '$7')
      .replace(':enumValue', '$8')
      .replace(':domainValue', '$9')
      .replace(':jsonValue', '$10');
    const resultNames = [
      'int_value',
      'bigint_value',
      'numeric_value',
      'text_value',
      'bool_value',
      'timestamp_value',
      'array_value',
      'enum_value',
      'domain_value',
      'json_value',
      'aggregate_count',
      'case_value',
      'nullif_value',
      'row_number_value',
    ];
    const contract = await derivePostgresQueryContractFromDatabase(connectionString, {
      sql: sourceSql,
      compiledSql,
      parameterNames: [
        'intValue',
        'bigintValue',
        'numericValue',
        'textValue',
        'boolValue',
        'timestampValue',
        'arrayValue',
        'enumValue',
        'domainValue',
        'jsonValue',
      ],
      resultColumnOrder: resultNames,
      resultColumnNullability: Object.fromEntries(resultNames.map((name) => [name, name.endsWith('_value') ? 'unknown' : 'non-null'])),
    });

    expect(contract.database.serverMajor).toBeGreaterThanOrEqual(16);
    expect(contract.database.parameters.map((field) => field.databaseType.formattedName)).toEqual([
      'integer',
      'bigint',
      'numeric',
      'text',
      'boolean',
      'timestamp with time zone',
      'integer[]',
      'ashiba_contract_live.work_state',
      'ashiba_contract_live.positive_int',
      'jsonb',
    ]);
    expect(contract.database.results.map((field) => field.name)).toEqual(resultNames);
    expect(contract.database.results.find((field) => field.name === 'enum_value')?.databaseType).toMatchObject({
      kind: 'enum',
      enumValues: ['queued', 'running', 'done'],
    });
    expect(contract.database.results.find((field) => field.name === 'domain_value')?.databaseType).toMatchObject({
      kind: 'domain',
      baseTypeOid: 23,
    });
    expect(contract.driver.results.find((field) => field.name === 'bigint_value')).toMatchObject({
      runtimeType: 'string',
      typeScriptType: 'string | null',
      provenance: 'driver-mapped',
    });
    expect(contract.driver.results.find((field) => field.name === 'timestamp_value')).toMatchObject({
      runtimeType: 'Date',
      typeScriptType: 'Date | null',
    });
    expect(contract.driver.results.find((field) => field.name === 'array_value')).toMatchObject({
      runtimeType: 'array',
      typeScriptType: 'number[] | null',
    });
    expect(contract.driver.results.find((field) => field.name === 'enum_value')).toMatchObject({
      runtimeType: 'string',
      typeScriptType: '"queued" | "running" | "done" | null',
    });
    expect(contract.driver.results.find((field) => field.name === 'json_value')).toMatchObject({
      runtimeType: 'json-value',
      typeScriptType: 'unknown',
    });
    expect(contract.driver.results.find((field) => field.name === 'aggregate_count')).toMatchObject({
      runtimeType: 'string',
      typeScriptType: 'string',
    });

    const runtime = await setup.query([
      'select',
      '  7::integer as int_value,',
      '  9007199254740993::bigint as bigint_value,',
      '  12.50::numeric as numeric_value,',
      '  true::boolean as bool_value,',
      "  '2026-08-14'::date as date_value,",
      "  '2026-08-14 12:34:56'::timestamp as timestamp_value,",
      "  '2026-08-14 12:34:56+09'::timestamptz as timestamptz_value,",
      '  array[1, 2]::integer[] as array_value,',
      "  'queued'::ashiba_contract_live.work_state as enum_value,",
      '  3::ashiba_contract_live.positive_int as domain_value,',
      "  '{\"kind\":\"live\"}'::jsonb as json_value",
    ].join('\n'));
    expect(runtime.rows[0]).toMatchObject({
      int_value: 7,
      bigint_value: '9007199254740993',
      numeric_value: '12.50',
      bool_value: true,
      array_value: [1, 2],
      enum_value: 'queued',
      domain_value: 3,
      json_value: { kind: 'live' },
    });
    expect(runtime.rows[0]?.date_value).toBeInstanceOf(Date);
    expect(runtime.rows[0]?.timestamp_value).toBeInstanceOf(Date);
    expect(runtime.rows[0]?.timestamptz_value).toBeInstanceOf(Date);
  });

  test('executes a product-generated named PostgreSQL artifact directly without the Thin Driver', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-product-n2-live-'));
    const sqlDir = path.join(rootDir, 'queries');
    const sqlPath = path.join(sqlDir, 'canonical.sql');
    mkdirSync(sqlDir, { recursive: true });
    const sourceSql = [
      'select',
      '  :id::integer as id,',
      '  :id2::integer as id2,',
      '  :id::integer as repeated_id,',
      '  value::text as cast_value,',
      "  ':not_a_parameter'::text as literal,",
      '  value as "identifier:still_not_parameter",',
      "  E'escaped \\\\ :not_a_parameter'::text as escaped_literal,",
      '  $$ :not_a_parameter $$::text as dollar_literal,',
      '  $body$',
      '    :not_a_parameter',
      '  $body$::text as tagged_dollar_literal,',
      '  $function$',
      '  BEGIN',
      '    -- :not_a_parameter',
      '  END',
      '  $function$::text as function_body',
      'from (select :value::text as value) source',
      '-- :not_a_parameter',
      '/* :not_a_parameter */',
      '/* outer /* nested :not_a_parameter */ outer again */',
      'where :id::integer = :id::integer;',
      '',
    ].join('\n');
    writeFileSync(sqlPath, sourceSql, 'utf8');

    try {
      const generated = runModelGen({ rootDir, sqlFile: 'queries/canonical.sql' });
      const binding = generated.bindings.postgres;
      const params = { id: 1, id2: 2, value: 'x' };
      const values = binding.orderedNames.map((name) => params[name as keyof typeof params]);
      const direct = await setup.query(binding.sql, values);

      expect(binding.sourceHash).toBe(generated.analysis.sourceHash);
      expect(binding.orderedNames).toEqual(['id', 'id2', 'id', 'value', 'id', 'id']);
      expect(values).toEqual([1, 2, 1, 'x', 1, 1]);
      expect(direct.rows).toHaveLength(1);
      expect(direct.rows[0]).toMatchObject({ id: 1, id2: 2, repeated_id: 1, cast_value: 'x' });
      expect(() => {
        const edited = sourceSql + '-- source edit\n';
        if (generated.analysis.sourceHash !== 'sha256:' + createHash('sha256').update(edited).digest('hex')) {
          throw new Error('stale artifact rejected');
        }
      }).toThrow('stale artifact rejected');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('describes complex PostgreSQL SQL and mutation results without executing either statement', async () => {
    const complexSql = [
      'with event_totals as (',
      '  select',
      '    account_id,',
      '    count(*) filter (where amount > 0) as positive_count,',
      '    sum(amount) as total_amount,',
      '    array_agg(tags order by id) as tag_groups,',
      "    jsonb_agg(payload order by id) filter (where payload ? 'kind') as payloads",
      '  from ashiba_contract_live.events',
      '  group by account_id',
      ')',
      'select',
      '  account.id,',
      '  coalesce(event_totals.positive_count, 0) as positive_count,',
      "  jsonb_build_object('label', account.label, 'total', event_totals.total_amount) as summary,",
      '  event_totals.tag_groups,',
      "  case when event_totals.total_amount > 0 then 'active' else 'idle' end as activity,",
      '  row_number() over (order by account.id) as rank',
      'from ashiba_contract_live.accounts account',
      'left join event_totals on event_totals.account_id = account.id',
      'order by account.id',
    ].join('\n');
    const names = ['id', 'positive_count', 'summary', 'tag_groups', 'activity', 'rank'];
    const complex = await derivePostgresQueryContractFromDatabase(connectionString, {
      sql: complexSql,
      compiledSql: complexSql,
      parameterNames: [],
      resultColumnOrder: names,
      resultColumnNullability: {
        id: 'non-null',
        positive_count: 'non-null',
        summary: 'non-null',
        tag_groups: 'nullable',
        activity: 'non-null',
        rank: 'non-null',
      },
    });
    expect(complex.database.results.map((field) => [field.name, field.databaseType.formattedName])).toEqual([
      ['id', 'integer'],
      ['positive_count', 'bigint'],
      ['summary', 'jsonb'],
      ['tag_groups', 'text[]'],
      ['activity', 'text'],
      ['rank', 'bigint'],
    ]);
    expect(complex.driver.results.find((field) => field.name === 'summary')?.typeScriptType).toBe('unknown');
    expect(complex.driver.results.find((field) => field.name === 'tag_groups')?.typeScriptType).toBe('string[] | null');

    const mutationSql = 'insert into ashiba_contract_live.mutation_probe (id) values (:id::integer) returning id';
    const mutation = await derivePostgresQueryContractFromDatabase(connectionString, {
      sql: mutationSql,
      compiledSql: mutationSql.replace(':id', '$1'),
      parameterNames: ['id'],
      resultColumnOrder: ['id'],
      resultColumnNullability: { id: 'non-null' },
    });
    expect(mutation.database.parameters[0]?.databaseType.formattedName).toBe('integer');
    expect(mutation.database.results[0]?.databaseType.formattedName).toBe('integer');
    await expect(setup.query('select count(*)::integer as count from ashiba_contract_live.mutation_probe'))
      .resolves.toMatchObject({ rows: [{ count: 0 }] });
  });

  test('proves result names while custom driver profiles stay unknown instead of manufacturing types', async () => {
    const contract = await derivePostgresQueryContractFromDatabase(connectionString, {
      sql: 'select 1::bigint as value, jsonb_build_object() as payload',
      compiledSql: 'select 1::bigint as value, jsonb_build_object() as payload',
      parameterNames: [],
      resultColumnOrder: [],
      resultColumnNullability: {},
      driverProfile: 'custom:application-v1',
    });
    expect(contract.database.results.map((field) => field.databaseType.formattedName)).toEqual(['bigint', 'jsonb']);
    expect(contract.database.results.map((field) => [field.name, field.nameProvenance])).toEqual([
      ['value', 'proven'],
      ['payload', 'proven'],
    ]);
    expect(contract.driver.results.every((field) => field.typeScriptType === 'unknown' && field.provenance === 'unknown')).toBe(true);
    expect(contract.diagnostics).toEqual([]);
  });

  test('describes placeholders without rewriting quoted PostgreSQL text', async () => {
    const contract = await derivePostgresQueryContractFromDatabase(connectionString, {
      sql: "select '$1'::text as quoted_value, :value::integer as parameter_value, $$ $1 $$::text as dollar_value",
      compiledSql: "select '$1'::text as quoted_value, $1::integer as parameter_value, $$ $1 $$::text as dollar_value",
      parameterNames: ['value'],
      resultColumnOrder: [],
      resultColumnNullability: {},
    });
    expect(contract.database.results.map((field) => [field.name, field.databaseType.formattedName])).toEqual([
      ['quoted_value', 'text'],
      ['parameter_value', 'integer'],
      ['dollar_value', 'text'],
    ]);
  });

  test('writes a VSA-local contract and rejects false application result self-reporting and staleness', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-postgres-contract-command-'));
    const queryDir = path.join(rootDir, 'src/features/report-load/queries/load');
    mkdirSync(path.join(queryDir, 'generated'), { recursive: true });
    const sqlPath = path.join(queryDir, 'load.sql');
    writeFileSync(sqlPath, [
      'with base as (',
      '  select id',
      '  from ashiba_contract_live.accounts',
      '  where id >= :minimum',
      '    and :bigintValue::bigint > 0',
      '    and id = any(:idList::integer[])',
      '    and id >= :domainFloor::ashiba_contract_live.positive_int',
      ')',
      'select',
      '  base.id as minimum,',
      '  count(*) as total,',
      '  to_json(base.id) as payload,',
      '  array_agg(base.id) as value_list,',
      '  null::text as optional_note,',
      '  :state::ashiba_contract_live.work_state as state_value,',
      '  min(base.id)::ashiba_contract_live.positive_int as domain_value',
      'from base',
      'group by base.id',
    ].join('\n'), 'utf8');
    writeFileSync(path.join(queryDir, 'query.ts'), [
      'export interface LoadQueryParams {',
      '  minimum: number;',
      '  bigintValue: number;',
      '  idList: number;',
      '  domainFloor: string;',
      '  state: number;',
      '}',
      'export interface LoadQueryResult {',
      '  minimum: number;',
      '  total: number;',
      '  payload: Record<string, unknown>;',
      '  value_list: number;',
      '  optional_note: string;',
      '  state_value: number;',
      '  domain_value: string;',
      '}',
      '',
    ].join('\n'), 'utf8');

    const generated = await runFeatureQueryPostgresContract({
      rootDir,
      feature: 'report-load',
      query: 'load',
      databaseUrl: connectionString,
    });
    expect(generated.changedFiles).toContain('src/features/report-load/queries/load/generated/postgres.contract.json');
    expect(generated.contract.diagnostics).toEqual([]);
    const runtimeMetadata = readFileSync(path.join(queryDir, 'generated/query.meta.ts'), 'utf8');
    expect(runtimeMetadata).toContain('"contract"');
    expect(runtimeMetadata).toContain('"profile": "node-postgres-default"');
    expect(runtimeMetadata).not.toContain('"serverMajor"');
    expect(runtimeMetadata).not.toContain('"parameters": [');
    expect(readFileSync(path.join(queryDir, 'generated/postgres.contract.json'), 'utf8')).toContain('"serverMajor"');
    const falseReport = runFeatureGeneratedMapperCheck({ rootDir, feature: 'report-load', query: 'load' });
    expect(falseReport.ok).toBe(false);
    expect(falseReport.checked[0]?.mismatchedParameterTypes).toEqual(expect.arrayContaining([
      expect.stringContaining('bigintValue: mapper number / node-postgres input string | bigint | null'),
      expect.stringContaining('idList: mapper number / node-postgres input number[] | null'),
      expect.stringContaining('domainFloor: mapper string / node-postgres input number | null'),
      expect.stringContaining('state: mapper number / node-postgres input "queued" | "running" | "done" | null'),
    ]));
    expect(falseReport.checked[0]?.mismatchedResultTypes).toEqual(expect.arrayContaining([
      expect.stringContaining('total: mapper number / SQL string'),
      expect.stringContaining('payload: mapper Record<string, unknown> / SQL unknown'),
      expect.stringContaining('value_list: mapper number / SQL number[]'),
      expect.stringContaining('optional_note: mapper string / SQL string | null'),
      expect.stringContaining('state_value: mapper number / SQL "queued" | "running" | "done"'),
      expect.stringContaining('domain_value: mapper string / SQL number'),
    ]));

    writeFileSync(sqlPath, `${readFileSync(sqlPath, 'utf8')}\n-- changed after database validation\n`, 'utf8');
    const stale = runFeatureGeneratedMapperCheck({ rootDir, feature: 'report-load', query: 'load' });
    expect(stale.ok).toBe(false);
    expect(stale.checked[0]?.postgresContractIssues).toEqual([
      'generated/postgres.contract.json is stale; rerun feature query postgres-contract.',
    ]);
  });

  test('supports standalone canonical SQL without a feature boundary and rejects bigint as number', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-standalone-postgres-contract-'));
    const sqlFile = 'ticket.sql';
    const contractFile = 'generated/ticket.postgres.contract.json';
    const typeFile = 'ticket-row.ts';
    const paramsTypeFile = 'ticket-params.ts';
    writeFileSync(path.join(rootDir, sqlFile), [
      'update ashiba_contract_live.events',
      'set amount = :amount::numeric',
      'where id = :id::bigint',
      'returning id, amount, now() as observed_at',
    ].join('\n'), 'utf8');
    writeFileSync(path.join(rootDir, paramsTypeFile), [
      'export interface TicketParams {',
      '  amount: number;',
      '  id: string;',
      '}',
      '',
    ].join('\n'), 'utf8');
    writeFileSync(path.join(rootDir, typeFile), [
      'export interface TicketRow {',
      '  id: string | null;',
      '  amount: string | null;',
      '  observed_at: Date | null;',
      '}',
      '',
    ].join('\n'), 'utf8');
    const written = await writeStandalonePostgresContract({
      rootDir,
      sqlFile,
      out: contractFile,
      databaseUrl: connectionString,
    });
    expect(written.contract.database.parameters.map((field) => field.name)).toEqual(['amount', 'id']);
    expect(written.contract.driver.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'id', runtimeType: 'string', typeScriptType: 'string | null' }),
      expect.objectContaining({ name: 'amount', runtimeType: 'string', typeScriptType: 'string | null' }),
      expect.objectContaining({ name: 'observed_at', runtimeType: 'Date', typeScriptType: 'Date | null' }),
    ]));
    const checkOptions = { rootDir, sqlFile, contract: contractFile, resultTypeFile: typeFile, resultType: 'TicketRow', paramsTypeFile, paramsType: 'TicketParams' };
    expect(checkStandalonePostgresContract(checkOptions)).toEqual({ ok: true, issues: [] });

    writeFileSync(path.join(rootDir, typeFile), 'export type TicketRow = { id: number; amount: string | null; observed_at: Date | null; };\n', 'utf8');
    const falseClaim = checkStandalonePostgresContract(checkOptions);
    expect(falseClaim.ok).toBe(false);
    expect(falseClaim.issues).toEqual(expect.arrayContaining([
      expect.stringContaining('id: TypeScript number / node-postgres string'),
    ]));

    writeFileSync(path.join(rootDir, sqlFile), `${readFileSync(path.join(rootDir, sqlFile), 'utf8')}\n-- stale\n`, 'utf8');
    expect(checkStandalonePostgresContract(checkOptions).issues)
      .toContain('PostgreSQL contract is stale; rerun postgres-contract write.');
  });

  test('rejects wrong standalone parameter types and extra result fields', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-standalone-postgres-contract-negative-'));
    writeFileSync(path.join(rootDir, 'query.sql'), 'select :id::bigint as id\n', 'utf8');
    writeFileSync(path.join(rootDir, 'row.ts'), 'export interface Row { id: string | null; nonexistent: number; }\n', 'utf8');
    writeFileSync(path.join(rootDir, 'params.ts'), 'export interface Params { id: number; }\n', 'utf8');
    await writeStandalonePostgresContract({ rootDir, sqlFile: 'query.sql', out: 'query.contract.json', databaseUrl: connectionString });
    const checked = checkStandalonePostgresContract({
      rootDir, sqlFile: 'query.sql', contract: 'query.contract.json',
      resultTypeFile: 'row.ts', resultType: 'Row', paramsTypeFile: 'params.ts', paramsType: 'Params',
    });
    expect(checked.ok).toBe(false);
    expect(checked.issues).toEqual(expect.arrayContaining([
      expect.stringContaining('id: TypeScript number / node-postgres input string | bigint | null.'),
      'nonexistent: extra field in Row; absent from PostgreSQL results.',
    ]));
    writeFileSync(path.join(rootDir, 'row.ts'), 'export interface Row { id: string | null; unsupported(): void; }\n', 'utf8');
    expect(() => checkStandalonePostgresContract({
      rootDir, sqlFile: 'query.sql', contract: 'query.contract.json',
      resultTypeFile: 'row.ts', resultType: 'Row', paramsTypeFile: 'params.ts', paramsType: 'Params',
    })).toThrow('Unsupported syntax in Row');
  });

  test('checks source staleness for a standalone DML statement with no result row', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-standalone-postgres-contract-dml-'));
    writeFileSync(path.join(rootDir, 'insert.sql'), 'insert into ashiba_contract_live.mutation_probe (id) values (:id::integer)\n', 'utf8');
    writeFileSync(path.join(rootDir, 'params.ts'), 'export interface Params { id: number; }\n', 'utf8');
    await writeStandalonePostgresContract({
      rootDir,
      sqlFile: 'insert.sql',
      out: 'generated/insert.postgres.contract.json',
      databaseUrl: connectionString,
    });
    expect((await setup.query('select * from ashiba_contract_live.mutation_probe')).rows).toEqual([]);
    expect(checkStandalonePostgresContract({ rootDir, sqlFile: 'insert.sql', contract: 'generated/insert.postgres.contract.json', paramsTypeFile: 'params.ts', paramsType: 'Params' }))
      .toEqual({ ok: true, issues: [] });
  });
});
