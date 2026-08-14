import { describe, expect, test } from 'vitest';
import pg from 'pg';
import { createHash } from 'node:crypto';
import { compilePostgresQuery, createPostgresAdapter, type AshibaPostgresQuerySource } from '../src/index.js';
import type { AshibaSqlExecutionEvent } from '@ashiba-ts/driver-adapter-core';

const databaseUrl =
  process.env.ASHIBA_TEST_DATABASE_URL ??
  process.env.ASHIBA_POSTGRES_DATABASE_URL ??
  process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('@ashiba-ts/driver-adapter-pg live PostgreSQL smoke', () => {
  test('executes named parameters and observer events through pg.Client', async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    const events: AshibaSqlExecutionEvent[] = [];
    await client.connect();
    try {
      const adapter = createPostgresAdapter(client, {
        observer: {
          emit(event) {
            events.push(event);
          },
        },
      });

      const sourceSql = 'select :value::int as value';
      const source: AshibaPostgresQuerySource<{ value: number }, { value: number }> = {
        sql: sourceSql,
        sqlPath: 'smoke/driver-live-smoke.sql',
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(sourceSql),
          },
          bindings: {
            postgres: {
              sourceHash: hashSql(sourceSql),
              sql: 'select $1::int as value',
              orderedNames: ['value'],
            },
          },
        },
      };
      const result = await adapter.execute(
        source,
        { value: 7 },
        {
          metadata: { queryId: 'driver-live-smoke' },
        },
      );

      expect(result.rows).toEqual([{ value: 7 }]);
      expect(events.map((event) => event.phase)).toEqual(['start', 'end']);
      expect(events[0]?.compiledSql).toContain('$1::int');
      expect(events[0]?.maskedParams).toEqual(['<masked>']);

      const compiled = compilePostgresQuery(source, { value: 7 });
      expect(compiled.canonicalSql).toBe(sourceSql);
      expect(compiled.orderedNames).toEqual(['value']);
      expect(compiled.values).toEqual([7]);
      const explain = await client.query(`explain ${compiled.sql}`, [...compiled.values]);
      expect(explain.rows.length).toBeGreaterThan(0);

      const countSql = 'select count(*) as value from (values (1), (2)) as sample(id)';
      const countSource: AshibaPostgresQuerySource<Record<never, never>, { value: string }> = {
        sql: countSql,
        sqlPath: 'smoke/driver-live-count.sql',
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(countSql),
          },
          bindings: {
            postgres: {
              sourceHash: hashSql(countSql),
              sql: countSql,
              orderedNames: [],
            },
          },
        },
      };
      const countResult = await adapter.execute(countSource, {});
      expect(countResult.rows).toEqual([{ value: '2' }]);
    } finally {
      await client.end();
    }
  });

  test('preserves PostgreSQL arrays, nulls, aliases, and aggregate driver values', async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const adapter = createPostgresAdapter(client);
      const source = liveSource<
        { values: number[]; nullableValue: string | null },
        { values: number[]; nullable_value: string | null; item_count: number; aggregate_count: string }
      >(
        [
          'select',
          '  :values::int[] as values,',
          '  :nullableValue::text as nullable_value,',
          '  cardinality(:values::int[]) as item_count,',
          '  count(*) as aggregate_count',
        ].join('\n'),
        [
          'select',
          '  $1::int[] as values,',
          '  $2::text as nullable_value,',
          '  cardinality($1::int[]) as item_count,',
          '  count(*) as aggregate_count',
        ].join('\n'),
        ['values', 'nullableValue'],
        'smoke/driver-live-array-null.sql',
      );

      const result = await adapter.execute(source, { values: [3, 5, 8], nullableValue: null });
      expect(result.rows).toEqual([{
        values: [3, 5, 8],
        nullable_value: null,
        item_count: 3,
        aggregate_count: '1',
      }]);

      const renamedSql = source.sql.replace('as nullable_value', 'as renamed_value');
      await expect(adapter.execute({ ...source, sql: renamedSql }, { values: [1], nullableValue: 'x' }))
        .rejects.toMatchObject({ code: 'ASHIBA_QUERY_MODEL_STALE' });
    } finally {
      await client.end();
    }
  });

  test('executes FOR UPDATE SKIP LOCKED across real PostgreSQL transactions', async () => {
    const setup = new pg.Client({ connectionString: databaseUrl });
    const locker = new pg.Client({ connectionString: databaseUrl });
    const worker = new pg.Client({ connectionString: databaseUrl });
    await Promise.all([setup.connect(), locker.connect(), worker.connect()]);
    try {
      await setup.query('create schema if not exists ashiba_live_test');
      await setup.query('drop table if exists ashiba_live_test.work_queue');
      await setup.query('create table ashiba_live_test.work_queue (id integer primary key, payload text not null)');
      await setup.query("insert into ashiba_live_test.work_queue (id, payload) values (1, 'first'), (2, 'second')");

      await locker.query('begin');
      await locker.query('select id from ashiba_live_test.work_queue where id = 1 for update');
      await worker.query('begin');
      const adapter = createPostgresAdapter(worker);
      const source = liveSource<{ minimumId: number }, { id: number; payload: string }>(
        [
          'select id, payload',
          'from ashiba_live_test.work_queue',
          'where id >= :minimumId::int',
          'order by id',
          'limit 1',
          'for update skip locked',
        ].join('\n'),
        [
          'select id, payload',
          'from ashiba_live_test.work_queue',
          'where id >= $1::int',
          'order by id',
          'limit 1',
          'for update skip locked',
        ].join('\n'),
        ['minimumId'],
        'smoke/driver-live-skip-locked.sql',
      );

      await expect(adapter.execute(source, { minimumId: 1 })).resolves.toMatchObject({
        rows: [{ id: 2, payload: 'second' }],
      });
    } finally {
      await Promise.allSettled([locker.query('rollback'), worker.query('rollback')]);
      await setup.query('drop table if exists ashiba_live_test.work_queue');
      await Promise.all([setup.end(), locker.end(), worker.end()]);
    }
  });
});

function liveSource<Params extends object, Row>(
  sql: string,
  compiledSql: string,
  orderedNames: readonly string[],
  sqlPath: string,
): AshibaPostgresQuerySource<Params, Row> {
  return {
    sql,
    sqlPath,
    queryModel: {
      analysis: {
        astParse: 'ok',
        statementKind: 'select',
        hasTopLevelOrderBy: /\border\s+by\b/i.test(sql),
        sourceHash: hashSql(sql),
      },
      bindings: {
        postgres: {
          sourceHash: hashSql(sql),
          sql: compiledSql,
          orderedNames,
        },
      },
    },
  };
}

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}
