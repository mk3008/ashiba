import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import {
  AshibaParameterError,
  createPostgresAdapter,
  type AshibaPostgresQueryModel,
  type NodePostgresQueryable,
} from '../src/index.js';
import { AshibaSortError, type AshibaSqlExecutionEvent } from '@ashiba/driver-adapter-core';

describe('@ashiba/driver-adapter-pg', () => {
  test('executes named-parameter SQL through a pg compatible client', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [{ user_id: 1 }], rowCount: 1 };
      },
    };
    const adapter = createPostgresAdapter(client);
    const sourceSql = 'select * from users where id = :id';

    const result = await adapter.execute(querySource(sourceSql), { id: 1 }, {
      queryModel: queryModelFor(sourceSql, {
        sql: 'select * from users where id = $1',
        orderedNames: ['id'],
      }),
    });

    expect(result.rows).toEqual([{ user_id: 1 }]);
    expect(calls).toEqual([{ sql: 'select * from users where id = $1', values: [1] }]);
  });

  test('uses precomputed query model binding when source hash matches', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where id = :id and status = :status';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(
      querySource(sourceSql),
      { id: 1, status: 'active' },
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            hasTopLevelOrderBy: true,
            sourceHash: hashSql(sourceSql),
          },
          bindings: {
            postgres: {
              sourceHash: hashSql(sourceSql),
              sql: 'select * from users where id = $1 and status = $2',
              orderedNames: ['id', 'status'],
            },
          },
        },
      },
    );

    expect(calls).toEqual([{ sql: 'select * from users where id = $1 and status = $2', values: [1, 'active'] }]);
  });

  test('rejects stale precomputed query model binding', async () => {
    let called = false;
    const sourceSql = 'select * from users where id = :id';
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(
      querySource(sourceSql),
      { id: 1 },
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql('select * from other_users where id = :id'),
          },
          bindings: {
            postgres: {
              sourceHash: hashSql('select * from other_users where id = :id'),
              sql: 'select * from other_users where id = $1',
              orderedNames: ['id'],
            },
          },
        },
      },
    )).rejects.toMatchObject({ code: 'ASHIBA_QUERY_MODEL_STALE' });

    expect(called).toBe(false);
  });

  test('rejects runtime parameter binding without CLI-generated metadata', async () => {
    let called = false;
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(querySource('select * from users where id = :id', {
      analysis: {
        astParse: 'ok',
        statementKind: 'select',
        hasTopLevelOrderBy: false,
        sourceHash: hashSql('select * from users where id = :id'),
      },
    }), { id: 1 }))
      .rejects.toMatchObject({
        code: 'ASHIBA_BINDING_METADATA_REQUIRED',
        causeText: 'The PostgreSQL adapter is running in metadata-based binding mode, but the query model did not include Postgres binding metadata.',
        nextAction: 'Run Ashiba model generation for the visible SQL and pass queryModel.bindings.postgres to the adapter.',
      });

    expect(called).toBe(false);
  });

  test('emits masked logger-ready events', async () => {
    const events: AshibaSqlExecutionEvent[] = [];
    const client: NodePostgresQueryable = {
      async query() {
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client, {
      observer: {
        emit(event) {
          events.push(event);
        },
      },
    });

    const sourceSql = 'select :secret';
    await adapter.execute(querySource(sourceSql), { secret: 'value' }, {
      metadata: { queryId: 'q1' },
      queryModel: queryModelFor(sourceSql, {
        sql: 'select $1',
        orderedNames: ['secret'],
      }),
    });

    expect(events.map((event) => event.phase)).toEqual(['start', 'end']);
    expect(events[0]?.metadata?.queryId).toBe('q1');
    expect(events[1]?.sourceSql).toBe('select :secret');
    expect(events[0]?.maskedParams).toEqual(['<masked>']);
    expect(events[0]?.params).toBeUndefined();
  });

  test('emits logger-ready error events for pre-execution parameter failures', async () => {
    const events: AshibaSqlExecutionEvent[] = [];
    let called = false;
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client, {
      observer: {
        emit(event) {
          events.push(event);
        },
      },
    });

    await expect(adapter.execute(
      querySource('select :id'),
      {},
      {
        metadata: { queryId: 'users.get', sqlPath: 'src/features/users/queries/get/get.sql' },
        queryModel: queryModelFor('select :id', {
          sql: 'select $1',
          orderedNames: ['id'],
        }),
      },
    )).rejects.toThrow(AshibaParameterError);

    expect(called).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      phase: 'error',
      metadata: {
        queryId: 'users.get',
        sqlPath: 'src/features/users/queries/get/get.sql',
        dialect: 'postgres',
      },
      sourceSql: 'select :id',
      error: {
        code: 'ASHIBA_MISSING_PARAMETER',
        cause: 'The provided parameter object does not include every named SQL parameter required by the query model.',
        nextAction: 'Pass values for the listed parameters or regenerate the query contract if the SQL changed.',
      },
    });
    expect(events[0]?.compiledSql).toBeUndefined();
    expect(events[0]?.maskedParams).toBeUndefined();
  });

  test('renders safe sort from query model sortable metadata without proprietary SQL markers', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(
      querySource(sourceSql),
      {},
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'simple-select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(sourceSql),
            safeSort: {
              insertion: { status: 'ready', index: sourceSql.length, mode: 'order-by' },
              sortable: { id: { sql: 'a.user_id' } },
            },
          },
          bindings: queryModelFor(sourceSql, {
            safeSortInsertion: { index: sourceSql.length },
          }).bindings,
        },
        sort: [{ key: 'id' }],
      },
    );

    expect(calls).toEqual([{ sql: 'select a.user_id as id from users a order by a.user_id asc', values: [] }]);
  });

  test('renders safe sort as comma when query already has ORDER BY', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a order by a.name';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(
      querySource(sourceSql),
      {},
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'simple-select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(sourceSql),
            safeSort: {
              insertion: { status: 'ready', index: sourceSql.length, mode: 'comma' },
              sortable: { id: { sql: 'a.user_id' } },
            },
          },
          bindings: queryModelFor(sourceSql, {
            safeSortInsertion: { index: sourceSql.length },
          }).bindings,
        },
        sort: [{ key: 'id', direction: 'desc' }],
      },
    );

    expect(calls).toEqual([{ sql: 'select a.user_id as id from users a order by a.name, a.user_id desc', values: [] }]);
  });

  test('renders safe sort before LIMIT from query model insertion metadata', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a where a.status = :status limit :limit';
    const insertionIndex = sourceSql.indexOf('limit :limit');
    const compiledSql = 'select a.user_id as id from users a where a.status = $1 limit $2';
    const compiledInsertionIndex = compiledSql.indexOf('limit $2');
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(
      querySource(sourceSql),
      { status: 'active', limit: 10 },
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'simple-select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(sourceSql),
            safeSort: {
              insertion: { status: 'ready', index: insertionIndex, mode: 'order-by' },
              sortable: { id: { sql: 'a.user_id' } },
            },
          },
          bindings: queryModelFor(sourceSql, {
            sql: compiledSql,
            orderedNames: ['status', 'limit'],
            safeSortInsertion: { index: compiledInsertionIndex },
          }).bindings,
        },
        sort: [{ key: 'id', direction: 'desc' }],
      },
    );

    expect(calls).toEqual([{
      sql: 'select a.user_id as id from users a where a.status = $1 order by a.user_id desc limit $2',
      values: ['active', 10],
    }]);
  });

  test('renders safe sort before FOR UPDATE from query model insertion metadata', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a where a.user_id = :user_id for update';
    const insertionIndex = sourceSql.indexOf('for update');
    const compiledSql = 'select a.user_id as id from users a where a.user_id = $1 for update';
    const compiledInsertionIndex = compiledSql.indexOf('for update');
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(
      querySource(sourceSql),
      { user_id: 1 },
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'simple-select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(sourceSql),
            safeSort: {
              insertion: { status: 'ready', index: insertionIndex, mode: 'order-by' },
              sortable: { id: { sql: 'a.user_id' } },
            },
          },
          bindings: queryModelFor(sourceSql, {
            sql: compiledSql,
            orderedNames: ['user_id'],
            safeSortInsertion: { index: compiledInsertionIndex },
          }).bindings,
        },
        sort: [{ key: 'id' }],
      },
    );

    expect(calls).toEqual([{
      sql: 'select a.user_id as id from users a where a.user_id = $1 order by a.user_id asc for update',
      values: [1],
    }]);
  });

  test('rejects safe sort execution until insertion position is explicitly resolved', async () => {
    let called = false;
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(
      querySource('select * from users'),
      {},
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'simple-select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql('select * from users'),
            safeSort: { insertion: { status: 'unresolved' } },
          },
        },
        sortProfile: {
          createdAt: { sql: '"created_at"', defaultDirection: 'desc' },
        },
        sort: [{ key: 'createdAt' }],
      },
    )).rejects.toMatchObject({ code: 'ASHIBA_SORT_INSERTION_UNRESOLVED' });

    expect(called).toBe(false);
  });

  test('rejects safe sort when compiled insertion metadata is missing', async () => {
    let called = false;
    const sourceSql = 'select a.user_id as id from users a where a.user_id = :user_id';
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(
      querySource(sourceSql),
      { user_id: 1 },
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'simple-select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(sourceSql),
            safeSort: {
              insertion: { status: 'ready', index: sourceSql.length, mode: 'order-by' },
              sortable: { id: { sql: 'a.user_id' } },
            },
          },
          bindings: {
            postgres: {
              sourceHash: hashSql(sourceSql),
              sql: 'select a.user_id as id from users a where a.user_id = $1',
              orderedNames: ['user_id'],
            },
          },
        },
        sort: [{ key: 'id' }],
      },
    )).rejects.toMatchObject({ code: 'ASHIBA_SORT_QUERY_MODEL_STALE' });

    expect(called).toBe(false);
  });

  test('includes query model guidance when safe sort insertion is unresolved', async () => {
    let called = false;
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);
    const sourceSql = 'select user_id as id from active_users union all select user_id as id from archived_users';

    await expect(adapter.execute(
      querySource(sourceSql),
      {},
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'compound-select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(sourceSql),
            safeSort: {
              insertion: {
                status: 'unresolved',
                reason: 'Root compound SELECT safe sort is not supported. Wrap the compound query in a subquery and expose stable sortable columns.',
              },
            },
          },
        },
        sortProfile: {
          id: { sql: 'id' },
        },
        sort: [{ key: 'id' }],
      },
    )).rejects.toMatchObject({
      code: 'ASHIBA_SORT_UNSUPPORTED_QUERY_MODEL',
      message: expect.stringContaining('Wrap the compound query in a subquery'),
    });

    expect(called).toBe(false);
  });

  test('validates safe sort profile before execution', async () => {
    let called = false;
    const sourceSql = 'select * from users;';
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(
      querySource(sourceSql),
      {},
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(sourceSql),
            safeSort: {
              insertion: { status: 'ready', index: sourceSql.length - 1, mode: 'order-by' },
              sortable: { createdAt: { sql: '"created_at"', defaultDirection: 'desc' } },
            },
          },
        },
        sort: [{ key: 'missing' }],
      },
    )).rejects.toMatchObject({ code: 'ASHIBA_UNKNOWN_SORT_KEY' });

    expect(called).toBe(false);
  });

  test('rejects explicit sort profile SQL outside query model sortable metadata', async () => {
    let called = false;
    const sourceSql = 'select a.user_id as id from users a';
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(
      querySource(sourceSql),
      {},
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'simple-select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(sourceSql),
            safeSort: {
              insertion: { status: 'ready', index: sourceSql.length, mode: 'order-by' },
              sortable: { id: { sql: 'a.user_id' } },
            },
          },
        },
        sortProfile: {
          id: { sql: 'random()' },
        },
        sort: [{ key: 'id' }],
      },
    )).rejects.toMatchObject({ code: 'ASHIBA_SORT_PROFILE_OUTSIDE_QUERY_MODEL' });

    expect(called).toBe(false);
  });

  test('rejects safe sort when query model source hash does not match SQL', async () => {
    let called = false;
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(
      querySource('select * from users'),
      {},
      {
        queryModel: {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql('select * from other_users'),
            safeSort: { insertion: { status: 'unresolved' } },
          },
        },
        sortProfile: {
          createdAt: { sql: '"created_at"', defaultDirection: 'desc' },
        },
        sort: [{ key: 'createdAt' }],
      },
    )).rejects.toMatchObject({ code: 'ASHIBA_SORT_QUERY_MODEL_STALE' });

    expect(called).toBe(false);
  });

  test('rejects sort input without CLI-generated query model analysis', async () => {
    const client: NodePostgresQueryable = {
      async query() {
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(
      querySource('select * from users order by created_at desc', {} as AshibaPostgresQueryModel),
      {},
      {
        sortProfile: {
          createdAt: { sql: '"created_at"', defaultDirection: 'desc' },
        },
        sort: [{ key: 'createdAt' }],
      },
    )).rejects.toMatchObject({ code: 'ASHIBA_SORT_QUERY_MODEL_REQUIRED' });
  });

  test('rejects safe sort when query model parse failed', async () => {
    const client: NodePostgresQueryable = {
      async query() {
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(
      querySource('select * from users'),
      {},
      {
        queryModel: {
          analysis: { astParse: 'failed', statementKind: 'unknown', hasTopLevelOrderBy: false },
        },
        sortProfile: {
          createdAt: { sql: '"created_at"', defaultDirection: 'desc' },
        },
        sort: [{ key: 'createdAt' }],
      },
    )).rejects.toMatchObject({ code: 'ASHIBA_SORT_UNSUPPORTED_QUERY_MODEL' });
  });

  test('rejects safe sort when query model is not a SELECT', async () => {
    const client: NodePostgresQueryable = {
      async query() {
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(
      querySource('update users set name = :name'),
      {},
      {
        queryModel: {
          analysis: { astParse: 'ok', statementKind: 'update', hasTopLevelOrderBy: false },
        },
        sortProfile: {
          createdAt: { sql: '"created_at"', defaultDirection: 'desc' },
        },
        sort: [{ key: 'createdAt' }],
      },
    )).rejects.toThrow(AshibaSortError);
  });

  test('emits error events from pg compatible failures', async () => {
    const events: AshibaSqlExecutionEvent[] = [];
    const client: NodePostgresQueryable = {
      async query() {
        const error = new Error('relation does not exist') as Error & { code: string };
        error.code = '42P01';
        throw error;
      },
    };
    const adapter = createPostgresAdapter(client, {
      observer: {
        emit(event) {
          events.push(event);
        },
      },
      includeUnmaskedParamsInEvents: true,
      maskPolicy: 'never',
    });

    const sourceSql = 'select * from missing where id = :id';
    await expect(adapter.execute(querySource(sourceSql), { id: 1 }, {
      queryModel: queryModelFor(sourceSql, {
        sql: 'select * from missing where id = $1',
        orderedNames: ['id'],
      }),
    })).rejects.toThrow('relation does not exist');

    expect(events.map((event) => event.phase)).toEqual(['start', 'error']);
    expect(events[1]?.error).toMatchObject({ message: 'relation does not exist', code: '42P01' });
    expect(events[1]?.params).toEqual([1]);
    expect(events[1]?.maskedParams).toEqual([1]);
  });

  test('rejects unused parameters before calling the driver', async () => {
    let called = false;
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(querySource('select :id'), { id: 1, unused: true }, {
      queryModel: queryModelFor('select :id', {
        sql: 'select $1',
        orderedNames: ['id'],
      }),
    })).rejects.toThrow(AshibaParameterError);
    expect(called).toBe(false);
  });
});

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}

function querySource(sourceSql: string, queryModel: AshibaPostgresQueryModel = queryModelFor(sourceSql)) {
  return {
    sql: sourceSql,
    sqlPath: 'queries/test.sql',
    queryModel,
  };
}

function queryModelFor(
  sourceSql: string,
  binding: { sql?: string; orderedNames?: readonly string[]; safeSortInsertion?: { index: number } } = {},
  analysis: Record<string, unknown> = {},
) {
  return {
    analysis: {
      astParse: 'ok',
      statementKind: 'select',
      hasTopLevelOrderBy: false,
      sourceHash: hashSql(sourceSql),
      ...analysis,
    },
    bindings: {
      postgres: {
        sourceHash: hashSql(sourceSql),
        sql: binding.sql ?? sourceSql,
        orderedNames: binding.orderedNames ?? [],
        ...(binding.safeSortInsertion ? { safeSortInsertion: binding.safeSortInsertion } : {}),
      },
    },
  };
}
