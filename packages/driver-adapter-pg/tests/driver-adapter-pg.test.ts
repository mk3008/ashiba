import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  AshibaParameterError,
  createPostgresAdapter,
  type AshibaPostgresQueryModel,
  type NodePostgresQueryable,
} from '../src/index.js';
import { AshibaSortError, type AshibaSqlExecutionEvent } from '@ashiba-ts/driver-adapter-core';

describe('@ashiba-ts/driver-adapter-pg', () => {
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

    const result = await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
        sql: 'select * from users where id = $1',
        orderedNames: ['id'],
      })), { id: 1 },{});

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

    await adapter.execute(querySource(sourceSql, {
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
        }),
      { id: 1, status: 'active' },{},
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

    await expect(adapter.execute(querySource(sourceSql, {
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
        }),
      { id: 1 },{},
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
    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
        sql: 'select $1',
        orderedNames: ['secret'],
      })), { secret: 'value' },{
      metadata: { queryId: 'q1' }});

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

    await expect(adapter.execute(querySource('select :id', queryModelFor('select :id', {
          sql: 'select $1',
          orderedNames: ['id'],
        })),
      {},{
        metadata: { queryId: 'users.get', sqlPath: 'src/features/users/queries/get/get.sql' }},
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

  test('compresses optional conditions only when explicitly enabled', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where tenant_id = :tenant_id and (:status is null or status = :status)';
    const compiledSql = 'select * from users where tenant_id = $1 and ($2 is null or status = $3)';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['tenant_id', 'status', 'status'],
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'status', 'and ($2 is null or status = $3)'),
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or status = :status)'),
        })),
      { tenant_id: 10, status: null },{
        optionalConditionCompression: true},
    );

    expect(calls).toEqual([{
      sql: 'select * from users where tenant_id = $1 ',
      values: [10],
    }]);
  });

  test('prunes only the null guard when an optional parameter is present', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = "select * from users where tenant_id = :tenant_id and (:keyword is null or users.email ilike '%' || :keyword || '%')";
    const compiledSql = "select * from users where tenant_id = $1 and ($2 is null or users.email ilike '%' || $3 || '%')";
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['tenant_id', 'keyword', 'keyword'],
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'keyword', "and ($2 is null or users.email ilike '%' || $3 || '%')"),
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'keyword', "and (:keyword is null or users.email ilike '%' || :keyword || '%')"),
        })),
      { tenant_id: 10, keyword: 'alice' }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: "select * from users where tenant_id = $1 and users.email ilike '%' || $2 || '%'",
      values: [10, 'alice'],
    }]);
  });

  test('compresses a sole optional where condition without leaving dangling where', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where (:email is null or email = :email)';
    const compiledSql = 'select * from users where ($1 is null or email = $2)';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['email', 'email'],
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'email', 'where ($1 is null or email = $2)'),
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'email', 'where (:email is null or email = :email)'),
        })),
      { email: null }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'select * from users ',
      values: [],
    }]);
  });

  test('compresses a sole optional where condition before a statement terminator', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where (:email is null or email = :email);';
    const compiledSql = 'select * from users where ($1 is null or email = $2);';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['email', 'email'],
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'email', 'where ($1 is null or email = $2)'),
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'email', 'where (:email is null or email = :email)'),
        })),
      { email: null }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'select * from users ;',
      values: [],
    }]);
  });

  test('keeps where when a leading optional condition is removed before a required condition', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where (:email is null or email = :email) and tenant_id = :tenant_id';
    const compiledSql = 'select * from users where ($1 is null or email = $2) and tenant_id = $3';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['email', 'email', 'tenant_id'],
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'email', '($1 is null or email = $2) and'),
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'email', '(:email is null or email = :email) and'),
        })),
      { email: null, tenant_id: 10 }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'select * from users where tenant_id = $1',
      values: [10],
    }]);
  });

  test('compresses all optional where conditions without emitting invalid where SQL', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where (:email is null or email = :email) and (:status is null or status = :status)';
    const compiledSql = 'select * from users where ($1 is null or email = $2) and ($3 is null or status = $4)';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['email', 'email', 'status', 'status'],
          optionalConditionCompression: {
            branches: [
              optionalCompressionBinding(compiledSql, 'email', '($1 is null or email = $2) and').branches[0],
              optionalCompressionBinding(compiledSql, 'status', 'and ($3 is null or status = $4)').branches[0],
            ],
          },
        }, {
          optionalConditionCompression: {
            enabled: true,
            branches: [
              optionalCompressionAnalysis(sourceSql, 'email', '(:email is null or email = :email) and').branches[0],
              optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or status = :status)').branches[0],
            ],
          },
        })),
      { email: null, status: null }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'select * from users ',
      values: [],
    }]);
  });

  test('removes multiple leading optional conditions before a required condition', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where (:email is null or email = :email) and (:status is null or status = :status) and tenant_id = :tenant_id';
    const compiledSql = 'select * from users where ($1 is null or email = $2) and ($3 is null or status = $4) and tenant_id = $5';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['email', 'email', 'status', 'status', 'tenant_id'],
          optionalConditionCompression: {
            branches: [
              optionalCompressionBinding(compiledSql, 'email', '($1 is null or email = $2) and').branches[0],
              optionalCompressionBinding(compiledSql, 'status', 'and ($3 is null or status = $4)').branches[0],
            ],
          },
        }, {
          optionalConditionCompression: {
            enabled: true,
            branches: [
              optionalCompressionAnalysis(sourceSql, 'email', '(:email is null or email = :email) and').branches[0],
              optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or status = :status)').branches[0],
            ],
          },
        })),
      { email: null, status: null, tenant_id: 10 }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'select * from users where tenant_id = $1',
      values: [10],
    }]);
  });

  test('keeps where spacing when the first optional condition is removed before a present optional condition', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where (:email is null or email = :email) and (:tier is null or tier = :tier)';
    const compiledSql = 'select * from users where ($1 is null or email = $2) and ($3 is null or tier = $4)';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['email', 'email', 'tier', 'tier'],
          optionalConditionCompression: {
            branches: [
              optionalCompressionBinding(compiledSql, 'email', '($1 is null or email = $2) and').branches[0],
              optionalCompressionBinding(compiledSql, 'tier', 'and ($3 is null or tier = $4)').branches[0],
            ],
          },
        }, {
          optionalConditionCompression: {
            enabled: true,
            branches: [
              optionalCompressionAnalysis(sourceSql, 'email', '(:email is null or email = :email) and').branches[0],
              optionalCompressionAnalysis(sourceSql, 'tier', 'and (:tier is null or tier = :tier)').branches[0],
            ],
          },
        })),
      { email: null, tier: 'vip' }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'select * from users where tier = $1',
      values: ['vip'],
    }]);
  });

  test('compresses optional conditions around a required middle predicate', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where (:email is null or email = :email) and tenant_id = :tenant_id and (:x is null or x = :x)';
    const compiledSql = 'select * from users where ($1 is null or email = $2) and tenant_id = $3 and ($4 is null or x = $5)';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);
    const source = querySource(sourceSql, queryModelFor(sourceSql, {
      sql: compiledSql,
      orderedNames: ['email', 'email', 'tenant_id', 'x', 'x'],
      optionalConditionCompression: {
        branches: [
          optionalCompressionBinding(compiledSql, 'email', '($1 is null or email = $2) and').branches[0],
          optionalCompressionBinding(compiledSql, 'x', 'and ($4 is null or x = $5)').branches[0],
        ],
      },
    }, {
      optionalConditionCompression: {
        enabled: true,
        branches: [
          optionalCompressionAnalysis(sourceSql, 'email', '(:email is null or email = :email) and').branches[0],
          optionalCompressionAnalysis(sourceSql, 'x', 'and (:x is null or x = :x)').branches[0],
        ],
      },
    }));

    await adapter.execute(source,
      { email: null, tenant_id: 10, x: null }, {
        optionalConditionCompression: true,
      },
    );
    await adapter.execute(source,
      { email: null, tenant_id: 10, x: 20 }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([
      {
        sql: 'select * from users where tenant_id = $1 ',
        values: [10],
      },
      {
        sql: 'select * from users where tenant_id = $1 and x = $2',
        values: [10, 20],
      },
    ]);
  });

  test('compresses an optional condition between required predicates', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where tenant_id = :tenant_id and (:email is null or email = :email) and x = :x';
    const compiledSql = 'select * from users where tenant_id = $1 and ($2 is null or email = $3) and x = $4';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['tenant_id', 'email', 'email', 'x'],
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'email', 'and ($2 is null or email = $3)'),
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'email', 'and (:email is null or email = :email)'),
        })),
      { tenant_id: 10, email: null, x: 20 }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'select * from users where tenant_id = $1  and x = $2',
      values: [10, 20],
    }]);
  });

  test('removes where clause when comments are between where and all optional branches', async () => {
    const cases = [
      { sourceComment: '/* optional filters */ ', compiledComment: '/* optional filters */ ' },
      { sourceComment: '-- optional filters\n', compiledComment: '-- optional filters\n' },
    ];

    for (const testCase of cases) {
      const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
      const sourceSql = `select * from users where ${testCase.sourceComment}(:email is null or email = :email) and (:status is null or status = :status)`;
      const compiledSql = `select * from users where ${testCase.compiledComment}($1 is null or email = $2) and ($3 is null or status = $4)`;
      const client: NodePostgresQueryable = {
        async query(sql, values) {
          calls.push({ sql, values });
          return { rows: [], rowCount: 0 };
        },
      };
      const adapter = createPostgresAdapter(client);

      await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
            sql: compiledSql,
            orderedNames: ['email', 'email', 'status', 'status'],
            optionalConditionCompression: {
              branches: [
                optionalCompressionBinding(compiledSql, 'email', '($1 is null or email = $2) and').branches[0],
                optionalCompressionBinding(compiledSql, 'status', 'and ($3 is null or status = $4)').branches[0],
              ],
            },
          }, {
            optionalConditionCompression: {
              enabled: true,
              branches: [
                optionalCompressionAnalysis(sourceSql, 'email', '(:email is null or email = :email) and').branches[0],
                optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or status = :status)').branches[0],
              ],
            },
          })),
        { email: null, status: null }, {
          optionalConditionCompression: true,
        },
      );

      expect(calls).toEqual([{
        sql: 'select * from users ',
        values: [],
      }]);
    }
  });

  test('compresses optional conditions in CTE and root query scopes independently', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'with cte as (select * from t where (:p is null or col = :p)) select * from cte where (:id is null or id = :id)';
    const compiledSql = 'with cte as (select * from t where ($1 is null or col = $2)) select * from cte where ($3 is null or id = $4)';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['p', 'p', 'id', 'id'],
          optionalConditionCompression: {
            branches: [
              optionalCompressionBinding(compiledSql, 'p', 'where ($1 is null or col = $2)').branches[0],
              optionalCompressionBinding(compiledSql, 'id', 'where ($3 is null or id = $4)').branches[0],
            ],
          },
        }, {
          optionalConditionCompression: {
            enabled: true,
            branches: [
              optionalCompressionAnalysis(sourceSql, 'p', 'where (:p is null or col = :p)').branches[0],
              optionalCompressionAnalysis(sourceSql, 'id', 'where (:id is null or id = :id)').branches[0],
            ],
          },
        })),
      { p: null, id: null }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'with cte as (select * from t ) select * from cte ',
      values: [],
    }]);
  });

  test('keeps required predicates in CTE and root query scopes when optional filters are removed', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'with cte as (select * from t where (:p is null or col = :p) and tenant_id = :tenant_id) select * from cte where (:id is null or id = :id) and status = :status';
    const compiledSql = 'with cte as (select * from t where ($1 is null or col = $2) and tenant_id = $3) select * from cte where ($4 is null or id = $5) and status = $6';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['p', 'p', 'tenant_id', 'id', 'id', 'status'],
          optionalConditionCompression: {
            branches: [
              optionalCompressionBinding(compiledSql, 'p', '($1 is null or col = $2) and').branches[0],
              optionalCompressionBinding(compiledSql, 'id', '($4 is null or id = $5) and').branches[0],
            ],
          },
        }, {
          optionalConditionCompression: {
            enabled: true,
            branches: [
              optionalCompressionAnalysis(sourceSql, 'p', '(:p is null or col = :p) and').branches[0],
              optionalCompressionAnalysis(sourceSql, 'id', '(:id is null or id = :id) and').branches[0],
            ],
          },
        })),
      { p: null, tenant_id: 10, id: null, status: 'active' }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'with cte as (select * from t where tenant_id = $1) select * from cte where status = $2',
      values: [10, 'active'],
    }]);
  });

  test('compresses optional conditions in derived subquery and root query scopes independently', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from (select * from t where (:p is null or col = :p)) s where (:id is null or id = :id)';
    const compiledSql = 'select * from (select * from t where ($1 is null or col = $2)) s where ($3 is null or id = $4)';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['p', 'p', 'id', 'id'],
          optionalConditionCompression: {
            branches: [
              optionalCompressionBinding(compiledSql, 'p', 'where ($1 is null or col = $2)').branches[0],
              optionalCompressionBinding(compiledSql, 'id', 'where ($3 is null or id = $4)').branches[0],
            ],
          },
        }, {
          optionalConditionCompression: {
            enabled: true,
            branches: [
              optionalCompressionAnalysis(sourceSql, 'p', 'where (:p is null or col = :p)').branches[0],
              optionalCompressionAnalysis(sourceSql, 'id', 'where (:id is null or id = :id)').branches[0],
            ],
          },
        })),
      { p: null, id: null }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'select * from (select * from t ) s ',
      values: [],
    }]);
  });

  test('compresses optional condition ranges independent of branch source order', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'with cte as (select * from t where (:p is null or col = :p)) select * from cte where (:id is null or id = :id)';
    const compiledSql = 'with cte as (select * from t where ($1 is null or col = $2)) select * from cte where ($3 is null or id = $4)';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['p', 'p', 'id', 'id'],
          optionalConditionCompression: {
            branches: [
              optionalCompressionBinding(compiledSql, 'id', 'where ($3 is null or id = $4)').branches[0],
              optionalCompressionBinding(compiledSql, 'p', 'where ($1 is null or col = $2)').branches[0],
            ],
          },
        }, {
          optionalConditionCompression: {
            enabled: true,
            branches: [
              optionalCompressionAnalysis(sourceSql, 'id', 'where (:id is null or id = :id)').branches[0],
              optionalCompressionAnalysis(sourceSql, 'p', 'where (:p is null or col = :p)').branches[0],
            ],
          },
        })),
      { p: null, id: null }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'with cte as (select * from t ) select * from cte ',
      values: [],
    }]);
  });

  test('keeps non-SSSQL true sentinel when optional branch removal leaves valid SQL', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where 1=1 and (:id is null or id = :id)';
    const compiledSql = 'select * from users where 1=1 and ($1 is null or id = $2)';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['id', 'id'],
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'id', 'and ($1 is null or id = $2)'),
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'id', 'and (:id is null or id = :id)'),
        })),
      { id: null }, {
        optionalConditionCompression: true,
      },
    );

    expect(calls).toEqual([{
      sql: 'select * from users where 1=1 ',
      values: [],
    }]);
  });

  test('keeps optional conditions when compression is not enabled', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select * from users where tenant_id = :tenant_id and (:status is null or status = :status)';
    const compiledSql = 'select * from users where tenant_id = $1 and ($2 is null or status = $3)';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['tenant_id', 'status', 'status'],
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'status', 'and ($2 is null or status = $3)'),
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or status = :status)'),
        })),
      { tenant_id: 10, status: null },{},
    );

    expect(calls).toEqual([{
      sql: compiledSql,
      values: [10, null, null],
    }]);
  });

  test('rejects optional condition compression when metadata is missing', async () => {
    let called = false;
    const sourceSql = 'select * from users where id = :id';
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
        sql: 'select * from users where id = $1',
        orderedNames: ['id'],
      })), { id: 1 },{
      optionalConditionCompression: true})).rejects.toMatchObject({
      code: 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_REQUIRED',
      nextAction: 'Regenerate the query model with optional condition compression metadata, or disable optionalConditionCompression for this execution.',
    });
    expect(called).toBe(false);
  });

  test('rejects optional condition compression when query model AST analysis failed', async () => {
    let called = false;
    const sourceSql = 'select * from users where id = :id';
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
        sql: 'select * from users where id = $1',
        orderedNames: ['id'],
        optionalConditionCompression: { branches: [] },
      }, {
        astParse: 'failed',
        optionalConditionCompression: { enabled: true, branches: [] },
      })), { id: 1 },{
      optionalConditionCompression: true})).rejects.toMatchObject({
      code: 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_UNSUPPORTED_QUERY_MODEL',
      nextAction: 'Fix the SQL shape or parser support, then regenerate the query model before enabling optionalConditionCompression.',
    });
    expect(called).toBe(false);
  });

  test('combines optional condition compression, named parameters, and safe sort metadata', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a where a.tenant_id = :tenant_id and (:status is null or a.status = :status) limit :limit';
    const compiledSql = 'select a.user_id as id from users a where a.tenant_id = $1 and ($2 is null or a.status = $3) limit $4';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['tenant_id', 'status', 'status', 'limit'],
          safeSortInsertion: { index: compiledSql.indexOf('limit $4') },
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'status', 'and ($2 is null or a.status = $3)'),
        }, {
          rootQueryShape: 'simple-select',
          safeSort: {
            insertion: { status: 'ready', index: sourceSql.indexOf('limit :limit'), mode: 'order-by' },
            sortable: { id: { sql: 'a.user_id' } },
          },
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or a.status = :status)'),
        })),
      { tenant_id: 7, status: null, limit: 10 },{
        optionalConditionCompression: true,
        sort: [{ key: 'id', direction: 'desc' }]},
    );

    expect(calls).toEqual([{
      sql: 'select a.user_id as id from users a where a.tenant_id = $1 order by a.user_id desc limit $2',
      values: [7, 10],
    }]);
  });

  test('combines optional compression and safe sort with generated binding metadata', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a where a.tenant_id = :tenant_id and (:status is null or a.status = :status) limit :limit';
    const compiledSql = 'select a.user_id as id from users a where a.tenant_id = $1 and ($2 is null or a.status = $3) limit $4';
    const compression = optionalCompressionBinding(compiledSql, 'status', 'and ($2 is null or a.status = $3)');
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['tenant_id', 'status', 'status', 'limit'],
          safeSortInsertion: { index: compiledSql.indexOf('limit $4') },
          optionalConditionCompression: {
            branches: compression.branches.map((branch) => ({
              parameterName: branch.parameterName,
              removalRange: {
                start: branch.removalRange.start,
                end: branch.removalRange.end,
              },
              presentReplacement: branch.presentReplacement,
            })),
          },
        }, {
          rootQueryShape: 'simple-select',
          safeSort: {
            insertion: { status: 'ready', index: sourceSql.indexOf('limit :limit'), mode: 'order-by' },
            sortable: { id: { sql: 'a.user_id' } },
          },
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or a.status = :status)'),
        })),
      { tenant_id: 7, status: null, limit: 10 }, {
        optionalConditionCompression: true,
        sort: [{ key: 'id', direction: 'desc' }],
      },
    );

    expect(calls).toEqual([{
      sql: 'select a.user_id as id from users a where a.tenant_id = $1 order by a.user_id desc limit $2',
      values: [7, 10],
    }]);
    expect(calls[0]?.sql).not.toContain('limi order by');
  });

  test('renumbers placeholders above $10 after optional condition compression and safe sort', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const beforeNames = Array.from({ length: 9 }, (_, index) => `p${String(index + 1).padStart(2, '0')}`);
    const afterNames = Array.from({ length: 3 }, (_, index) => `p${String(index + 10).padStart(2, '0')}`);
    const beforeSource = beforeNames.map((name) => `a.${name} = :${name}`).join(' and ');
    const afterSource = afterNames.map((name) => `a.${name} = :${name}`).join(' and ');
    const beforeCompiled = beforeNames.map((name, index) => `a.${name} = $${index + 1}`).join(' and ');
    const afterCompiled = afterNames.map((name, index) => `a.${name} = $${index + 12}`).join(' and ');
    const afterRenumbered = afterNames.map((name, index) => `a.${name} = $${index + 10}`).join(' and ');
    const sourceSql = `select a.user_id as id from users a where ${beforeSource} and (:status is null or a.status = :status) and ${afterSource} order by a.created_at`;
    const compiledSql = `select a.user_id as id from users a where ${beforeCompiled} and ($10 is null or a.status = $11) and ${afterCompiled} order by a.created_at`;
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: [...beforeNames, 'status', 'status', ...afterNames],
          safeSortInsertion: { index: compiledSql.length },
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'status', 'and ($10 is null or a.status = $11)'),
        }, {
          rootQueryShape: 'simple-select',
          safeSort: {
            insertion: { status: 'ready', index: sourceSql.length, mode: 'comma' },
            sortable: { id: { sql: 'a.user_id' } },
          },
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or a.status = :status)'),
        })),
      Object.fromEntries([
        ...beforeNames.map((name, index) => [name, index + 1] as const),
        ['status', null] as const,
        ...afterNames.map((name, index) => [name, index + 10] as const),
      ]),{
        optionalConditionCompression: true,
        sort: [{ key: 'id' }]},
    );

    expect(calls).toEqual([{
      sql: `select a.user_id as id from users a where ${beforeCompiled}  and ${afterRenumbered} order by a.created_at, a.user_id asc`,
      values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    }]);
  });

  test('keeps SQL-like parameter values bound when optional condition compression and safe sort compose', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a where a.tenant_id = :tenant_id and (:status is null or a.status = :status) and (:email is null or a.email = :email)';
    const compiledSql = 'select a.user_id as id from users a where a.tenant_id = $1 and ($2 is null or a.status = $3) and ($4 is null or a.email = $5)';
    const injectedEmail = "x@example.test' or 1=1; drop table users;--";
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['tenant_id', 'status', 'status', 'email', 'email'],
          safeSortInsertion: { index: compiledSql.length },
          optionalConditionCompression: {
            branches: [
              ...optionalCompressionBinding(compiledSql, 'status', 'and ($2 is null or a.status = $3)').branches,
              ...optionalCompressionBinding(compiledSql, 'email', 'and ($4 is null or a.email = $5)').branches,
            ],
          },
        }, {
          rootQueryShape: 'simple-select',
          safeSort: {
            insertion: { status: 'ready', index: sourceSql.length, mode: 'order-by' },
            sortable: { id: { sql: 'a.user_id' } },
          },
          optionalConditionCompression: {
            enabled: true,
            branches: [
              ...optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or a.status = :status)').branches,
              ...optionalCompressionAnalysis(sourceSql, 'email', 'and (:email is null or a.email = :email)').branches,
            ],
          },
        })),
      { tenant_id: 7, status: null, email: injectedEmail },{
        optionalConditionCompression: true,
        sort: [{ key: 'id', direction: 'desc' }]},
    );

    expect(calls).toEqual([{
      sql: 'select a.user_id as id from users a where a.tenant_id = $1  and a.email = $2 order by a.user_id desc',
      values: [7, injectedEmail],
    }]);
    expect(calls[0]?.sql).not.toContain(injectedEmail);
  });

  test('does not renumber placeholder-like text inside strings or comments during optional condition compression', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const beforeNames = Array.from({ length: 9 }, (_, index) => `p${String(index + 1).padStart(2, '0')}`);
    const beforeSource = beforeNames.map((name) => `a.${name} = :${name}`).join(' and ');
    const beforeCompiled = beforeNames.map((name, index) => `a.${name} = $${index + 1}`).join(' and ');
    const sourceSql = `select '$12 is literal' as note from users a where ${beforeSource} and (:status is null or a.status = :status) and a.email = :email -- $13 is a comment`;
    const compiledSql = `select '$12 is literal' as note from users a where ${beforeCompiled} and ($10 is null or a.status = $11) and a.email = $12 -- $13 is a comment`;
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: [...beforeNames, 'status', 'status', 'email'],
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'status', 'and ($10 is null or a.status = $11)'),
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or a.status = :status)'),
        })),
      Object.fromEntries([
        ...beforeNames.map((name, index) => [name, index + 1] as const),
        ['status', null] as const,
        ['email', 'safe@example.test'] as const,
      ]),{
        optionalConditionCompression: true},
    );

    expect(calls).toEqual([{
      sql: `select '$12 is literal' as note from users a where ${beforeCompiled}  and a.email = $10 -- $13 is a comment`,
      values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 'safe@example.test'],
    }]);
  });

  test('ignores placeholder-like text across Postgres lexical contexts during optional condition compression', async () => {
    const lexicalCases = [
      {
        label: 'escape string',
        sourcePrefix: "select E'\\\\$12 is literal' as note",
        compiledPrefix: "select E'\\\\$12 is literal' as note",
      },
      {
        label: 'double quoted identifier',
        sourcePrefix: 'select "$12_identifier" as note',
        compiledPrefix: 'select "$12_identifier" as note',
      },
      {
        label: 'dollar quoted string',
        sourcePrefix: 'select $$ $12 is literal $$ as note',
        compiledPrefix: 'select $$ $12 is literal $$ as note',
      },
      {
        label: 'tagged dollar quoted string',
        sourcePrefix: 'select $tag$ $12 is literal $tag$ as note',
        compiledPrefix: 'select $tag$ $12 is literal $tag$ as note',
      },
      {
        label: 'block comment',
        sourcePrefix: 'select 1 /* $12 is a comment */',
        compiledPrefix: 'select 1 /* $12 is a comment */',
      },
    ];

    for (const lexicalCase of lexicalCases) {
      const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
      const sourceSql = `${lexicalCase.sourcePrefix} from users a where a.p01 = :p01 and (:status is null or a.status = :status) and a.email = :email`;
      const compiledSql = `${lexicalCase.compiledPrefix} from users a where a.p01 = $1 and ($2 is null or a.status = $3) and a.email = $4`;
      const client: NodePostgresQueryable = {
        async query(sql, values) {
          calls.push({ sql, values });
          return { rows: [], rowCount: 0 };
        },
      };
      const adapter = createPostgresAdapter(client);

      await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
            sql: compiledSql,
            orderedNames: ['p01', 'status', 'status', 'email'],
            optionalConditionCompression: optionalCompressionBinding(compiledSql, 'status', 'and ($2 is null or a.status = $3)'),
          }, {
            optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or a.status = :status)'),
          })),
        { p01: 1, status: null, email: `${lexicalCase.label}' or 1=1;--` },{
          optionalConditionCompression: true},
      );

      expect(calls, lexicalCase.label).toEqual([{
        sql: `${lexicalCase.compiledPrefix} from users a where a.p01 = $1  and a.email = $2`,
        values: [1, `${lexicalCase.label}' or 1=1;--`],
      }]);
    }
  });

  test('property: optional condition compression and safe sort keep SQL shape and bound values stable', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        beforeCount: fc.integer({ min: 1, max: 14 }),
        afterCount: fc.integer({ min: 0, max: 8 }),
        hasExistingOrderBy: fc.boolean(),
        direction: fc.constantFrom<'asc' | 'desc'>('asc', 'desc'),
      }),
      async ({ beforeCount, afterCount, hasExistingOrderBy, direction }) => {
        const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
        const beforeNames = Array.from({ length: beforeCount }, (_, index) => `p${String(index + 1).padStart(2, '0')}`);
        const afterNames = Array.from({ length: afterCount }, (_, index) => `q${String(index + 1).padStart(2, '0')}`);
        const selectSql = "select a.user_id as id, '$999 is literal' as note from users a";
        const beforeSource = beforeNames.map((name) => `a.${name} = :${name}`).join(' and ');
        const beforeCompiled = beforeNames.map((name, index) => `a.${name} = $${index + 1}`).join(' and ');
        const sourceBranch = 'and (:status is null or a.status = :status)';
        const compiledBranch = `and ($${beforeCount + 1} is null or a.status = $${beforeCount + 2})`;
        const afterSource = afterNames.length > 0
          ? ` and ${afterNames.map((name) => `a.${name} = :${name}`).join(' and ')}`
          : '';
        const afterCompiled = afterNames.length > 0
          ? ` and ${afterNames.map((name, index) => `a.${name} = $${beforeCount + 3 + index}`).join(' and ')}`
          : '';
        const afterRenumbered = afterNames.length > 0
          ? `  and ${afterNames.map((name, index) => `a.${name} = $${beforeCount + 1 + index}`).join(' and ')}`
          : '';
        const orderSource = hasExistingOrderBy ? ' order by a.created_at' : '';
        const sourceSql = `${selectSql} where ${beforeSource} ${sourceBranch}${afterSource}${orderSource}`;
        const compiledSql = `${selectSql} where ${beforeCompiled} ${compiledBranch}${afterCompiled}${orderSource}`;
        const client: NodePostgresQueryable = {
          async query(sql, values) {
            calls.push({ sql, values });
            return { rows: [], rowCount: 0 };
          },
        };
        const adapter = createPostgresAdapter(client);
        const paramEntries = [
          ...beforeNames.map((name, index) => [name, `before-${index + 1}' ; drop table before;--`] as const),
          ['status', null] as const,
          ...afterNames.map((name, index) => [name, `after-${index + 1}' ; drop table after;--`] as const),
        ];

        await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
              sql: compiledSql,
              orderedNames: [...beforeNames, 'status', 'status', ...afterNames],
              safeSortInsertion: { index: compiledSql.length },
              optionalConditionCompression: optionalCompressionBinding(compiledSql, 'status', compiledBranch),
            }, {
              rootQueryShape: 'simple-select',
              safeSort: {
                insertion: {
                  status: 'ready',
                  index: sourceSql.length,
                  mode: hasExistingOrderBy ? 'comma' : 'order-by',
                },
                sortable: { id: { sql: 'a.user_id' } },
              },
              optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'status', sourceBranch),
            })),
          Object.fromEntries(paramEntries),{
            optionalConditionCompression: true,
            sort: [{ key: 'id', direction }]},
        );

        const compressedWhere = `${beforeCompiled}${afterRenumbered || (hasExistingOrderBy ? ' ' : '')}`;
        const expectedSql = hasExistingOrderBy
          ? `${selectSql} where ${compressedWhere} order by a.created_at, a.user_id ${direction}`
          : `${selectSql} where ${compressedWhere} order by a.user_id ${direction}`;
        const expectedValues = [
          ...beforeNames.map((_, index) => `before-${index + 1}' ; drop table before;--`),
          ...afterNames.map((_, index) => `after-${index + 1}' ; drop table after;--`),
        ];

        expect(calls).toEqual([{ sql: expectedSql, values: expectedValues }]);
        for (const value of expectedValues) {
          expect(calls[0]?.sql).not.toContain(value);
        }
      },
    ), { numRuns: 100 });
  });

  test('combines optional condition compression with mixed optional parameters and comma-mode safe sort', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a where a.tenant_id = :tenant_id and (:status is null or a.status = :status) and (:email is null or a.email = :email) order by a.created_at';
    const compiledSql = 'select a.user_id as id from users a where a.tenant_id = $1 and ($2 is null or a.status = $3) and ($4 is null or a.email = $5) order by a.created_at';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['tenant_id', 'status', 'status', 'email', 'email'],
          safeSortInsertion: { index: compiledSql.length },
          optionalConditionCompression: {
            branches: [
              ...optionalCompressionBinding(compiledSql, 'status', 'and ($2 is null or a.status = $3)').branches,
              ...optionalCompressionBinding(compiledSql, 'email', 'and ($4 is null or a.email = $5)').branches,
            ],
          },
        }, {
          rootQueryShape: 'simple-select',
          safeSort: {
            insertion: { status: 'ready', index: sourceSql.length, mode: 'comma' },
            sortable: { id: { sql: 'a.user_id' } },
          },
          optionalConditionCompression: {
            enabled: true,
            branches: [
              ...optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or a.status = :status)').branches,
              ...optionalCompressionAnalysis(sourceSql, 'email', 'and (:email is null or a.email = :email)').branches,
            ],
          },
        })),
      { tenant_id: 7, status: null, email: 'a@example.test' },{
        optionalConditionCompression: true,
        sort: [{ key: 'id' }]},
    );

    expect(calls).toEqual([{
      sql: 'select a.user_id as id from users a where a.tenant_id = $1  and a.email = $2 order by a.created_at, a.user_id asc',
      values: [7, 'a@example.test'],
    }]);
  });

  test('keeps comma-mode safe sort before LIMIT after optional cleanup shifts insertion left', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a where (:status is null or a.status = :status) order by a.created_at limit :limit';
    const compiledSql = 'select a.user_id as id from users a where ($1 is null or a.status = $2) order by a.created_at limit $3';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['status', 'status', 'limit'],
          safeSortInsertion: { index: compiledSql.indexOf(' limit $3') },
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'status', 'where ($1 is null or a.status = $2)'),
        }, {
          rootQueryShape: 'simple-select',
          safeSort: {
            insertion: { status: 'ready', index: sourceSql.indexOf(' limit :limit'), mode: 'comma' },
            sortable: { id: { sql: 'a.user_id' } },
          },
          optionalConditionCompression: {
            enabled: true,
            branches: optionalCompressionAnalysis(sourceSql, 'status', 'where (:status is null or a.status = :status)').branches,
          },
        })),
      { status: null, limit: 10 }, {
        optionalConditionCompression: true,
        sort: [{ key: 'id' }],
      },
    );

    expect(calls).toEqual([{
      sql: 'select a.user_id as id from users a  order by a.created_at, a.user_id asc limit $1',
      values: [10],
    }]);
  });

  test('does not compress missing optional parameters as absent before parameter validation', async () => {
    let called = false;
    const sourceSql = 'select * from users where tenant_id = :tenant_id and (:status is null or status = :status)';
    const compiledSql = 'select * from users where tenant_id = $1 and ($2 is null or status = $3)';
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['tenant_id', 'status', 'status'],
          optionalConditionCompression: optionalCompressionBinding(compiledSql, 'status', 'and ($2 is null or status = $3)'),
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or status = :status)'),
        })),
      { tenant_id: 10 },{
        optionalConditionCompression: true},
    )).rejects.toMatchObject({
      code: 'ASHIBA_MISSING_PARAMETER',
      parameterNames: ['status'],
    });
    expect(called).toBe(false);
  });

  test('rejects stale optional condition compression range text before broken SQL can be emitted', async () => {
    let called = false;
    const sourceSql = 'select * from users where tenant_id = :tenant_id and (:status is null or status = :status)';
    const compiledSql = 'select * from users where tenant_id = $1 and ($2 is null or status = $3)';
    const staleBinding = optionalCompressionBinding(compiledSql, 'status', 'and ($2 is null or status = $3)');
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['tenant_id', 'status', 'status'],
          optionalConditionCompression: {
            branches: [{
              ...staleBinding.branches[0],
              removalRange: {
                ...staleBinding.branches[0]!.removalRange,
                text: 'and ($2 is null or hacked = $3)',
              },
            }],
          },
        }, {
          optionalConditionCompression: optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or status = :status)'),
        })),
      { tenant_id: 10, status: null },{
        optionalConditionCompression: true},
    )).rejects.toMatchObject({
      code: 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE',
    });
    expect(called).toBe(false);
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

    await adapter.execute(querySource(sourceSql, {
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
        }),
      {},{
        sort: [{ key: 'id' }]},
    );

    expect(calls).toEqual([{ sql: 'select a.user_id as id from users a order by a.user_id asc', values: [] }]);
  });

  test('prepends safe sort before existing ORDER BY terms by default', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a order by a.name';
    const insertionIndex = sourceSql.indexOf('a.name');
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'simple-select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql(sourceSql),
            safeSort: {
              insertion: { status: 'ready', index: insertionIndex, mode: 'prepend-comma' },
              sortable: { id: { sql: 'a.user_id' } },
            },
          },
          bindings: queryModelFor(sourceSql, {
            safeSortInsertion: { index: insertionIndex },
          }).bindings,
        }),
      {},{
        sort: [{ key: 'id', direction: 'desc' }]},
    );

    expect(calls).toEqual([{ sql: 'select a.user_id as id from users a order by a.user_id desc, a.name', values: [] }]);
  });

  test('prepends safe sort before a multiline stable ORDER BY suffix', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = [
      'select a.user_id as id',
      'from users a',
      'order by a.name',
      'limit 10',
    ].join('\n');
    const insertionIndex = sourceSql.indexOf('a.name');
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'simple-select',
            hasTopLevelOrderBy: true,
            sourceHash: hashSql(sourceSql),
            safeSort: {
              insertion: { status: 'ready', index: insertionIndex, mode: 'prepend-comma' },
              sortable: { id: { sql: 'a.user_id' } },
            },
          },
          bindings: queryModelFor(sourceSql, {
            safeSortInsertion: { index: insertionIndex },
          }).bindings,
        }),
      {},{
        sort: [{ key: 'id', direction: 'desc' }]},
    );

    expect(calls).toEqual([{
      sql: [
        'select a.user_id as id',
        'from users a',
        'order by a.user_id desc, a.name',
        'limit 10',
      ].join('\n'),
      values: [],
    }]);
  });

  test('keeps prepend safe sort aligned after multiple optional rewrites', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = [
      'select a.id, a.email from users a',
      'where true',
      '  and (:status is null or a.status = :status)',
      '  and (:tier is null or a.tier = :tier)',
      '  and (:lang is null or a.lang = :lang)',
      '  and (:channel is null or a.channel = :channel)',
      '  and (:tag is null or :tag = any(a.tags))',
      "  and (:keyword is null or a.email ilike '%' || :keyword || '%')",
      'order by a.id',
      'limit :limit',
    ].join('\n');
    const compiledSql = [
      'select a.id, a.email from users a',
      'where true',
      '  and ($1 is null or a.status = $2)',
      '  and ($3 is null or a.tier = $4)',
      '  and ($5 is null or a.lang = $6)',
      '  and ($7 is null or a.channel = $8)',
      '  and ($9 is null or $10 = any(a.tags))',
      "  and ($11 is null or a.email ilike '%' || $12 || '%')",
      'order by a.id',
      'limit $13',
    ].join('\n');
    const insertionIndex = sourceSql.indexOf('order by a.id') + 'order by'.length;
    const compiledInsertionIndex = compiledSql.indexOf('order by a.id') + 'order by'.length;
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: compiledSql,
          orderedNames: ['status', 'status', 'tier', 'tier', 'lang', 'lang', 'channel', 'channel', 'tag', 'tag', 'keyword', 'keyword', 'limit'],
          safeSortInsertion: { index: compiledInsertionIndex },
          optionalConditionCompression: {
            branches: [
              ...optionalCompressionBinding(compiledSql, 'status', 'and ($1 is null or a.status = $2)').branches,
              ...optionalCompressionBinding(compiledSql, 'tier', 'and ($3 is null or a.tier = $4)').branches,
              ...optionalCompressionBinding(compiledSql, 'lang', 'and ($5 is null or a.lang = $6)').branches,
              ...optionalCompressionBinding(compiledSql, 'channel', 'and ($7 is null or a.channel = $8)').branches,
              ...optionalCompressionBinding(compiledSql, 'tag', 'and ($9 is null or $10 = any(a.tags))').branches,
              ...optionalCompressionBinding(compiledSql, 'keyword', "and ($11 is null or a.email ilike '%' || $12 || '%')").branches,
            ],
          },
        }, {
          safeSort: {
            insertion: { status: 'ready', index: insertionIndex, mode: 'prepend-comma' },
            sortable: { priority: { sql: 'a.priority' } },
          },
          optionalConditionCompression: {
            enabled: true,
            branches: [
              ...optionalCompressionAnalysis(sourceSql, 'status', 'and (:status is null or a.status = :status)').branches,
              ...optionalCompressionAnalysis(sourceSql, 'tier', 'and (:tier is null or a.tier = :tier)').branches,
              ...optionalCompressionAnalysis(sourceSql, 'lang', 'and (:lang is null or a.lang = :lang)').branches,
              ...optionalCompressionAnalysis(sourceSql, 'channel', 'and (:channel is null or a.channel = :channel)').branches,
              ...optionalCompressionAnalysis(sourceSql, 'tag', 'and (:tag is null or :tag = any(a.tags))').branches,
              ...optionalCompressionAnalysis(sourceSql, 'keyword', "and (:keyword is null or a.email ilike '%' || :keyword || '%')").branches,
            ],
          },
        })),
      { status: null, tier: null, lang: null, channel: null, tag: null, keyword: 'login', limit: 10 }, {
        optionalConditionCompression: true,
        sort: [{ key: 'priority', direction: 'desc' }],
      },
    );

    expect(calls).toEqual([{
      sql: [
        'select a.id, a.email from users a',
        'where true',
        '  ',
        '  ',
        '  ',
        '  ',
        '  ',
        "  and a.email ilike '%' || $1 || '%'",
        'order by a.priority desc, a.id',
        'limit $2',
      ].join('\n'),
      values: ['login', 10],
    }]);
  });

  test('can append safe sort after existing ORDER BY terms for compatibility', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const sourceSql = 'select a.user_id as id from users a order by a.name';
    const client: NodePostgresQueryable = {
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await adapter.execute(querySource(sourceSql, {
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
        }),
      {},{
        sort: [{ key: 'id', direction: 'desc' }]},
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

    await adapter.execute(querySource(sourceSql, {
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
        }),
      { status: 'active', limit: 10 },{
        sort: [{ key: 'id', direction: 'desc' }]},
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

    await adapter.execute(querySource(sourceSql, {
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
        }),
      { user_id: 1 },{
        sort: [{ key: 'id' }]},
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

    await expect(adapter.execute(querySource('select * from users', {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            rootQueryShape: 'simple-select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql('select * from users'),
            safeSort: { insertion: { status: 'unresolved' } },
          },
        }),
      {},{
        sortProfile: {
          createdAt: { sql: '"created_at"', defaultDirection: 'desc' },
        },
        sort: [{ key: 'createdAt' }]},
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

    await expect(adapter.execute(querySource(sourceSql, {
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
        }),
      { user_id: 1 },{
        sort: [{ key: 'id' }]},
    )).rejects.toMatchObject({ code: 'ASHIBA_SORT_QUERY_MODEL_STALE' });

    expect(called).toBe(false);
  });

  test('rejects SQL-like sort key and direction before execution', async () => {
    let called = false;
    const sourceSql = 'select a.user_id as id from users a';
    const client: NodePostgresQueryable = {
      async query() {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: sourceSql,
          orderedNames: [],
          safeSortInsertion: { index: sourceSql.length },
        }, {
          rootQueryShape: 'simple-select',
          safeSort: {
            insertion: { status: 'ready', index: sourceSql.length, mode: 'order-by' },
            sortable: { id: { sql: 'a.user_id' } },
          },
        })),
      {},{
        sort: [{ key: 'id desc; drop table users;--' }]},
    )).rejects.toMatchObject({ code: 'ASHIBA_UNKNOWN_SORT_KEY' });

    await expect(adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
          sql: sourceSql,
          orderedNames: [],
          safeSortInsertion: { index: sourceSql.length },
        }, {
          rootQueryShape: 'simple-select',
          safeSort: {
            insertion: { status: 'ready', index: sourceSql.length, mode: 'order-by' },
            sortable: { id: { sql: 'a.user_id' } },
          },
        })),
      {},{
        sort: [{ key: 'id', direction: 'desc; drop table users;--' as 'desc' }]},
    )).rejects.toMatchObject({ code: 'ASHIBA_INVALID_SORT_DIRECTION' });

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

    await expect(adapter.execute(querySource(sourceSql, {
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
        }),
      {},{
        sortProfile: {
          id: { sql: 'id' },
        },
        sort: [{ key: 'id' }]},
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

    await expect(adapter.execute(querySource(sourceSql, {
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
        }),
      {},{
        sort: [{ key: 'missing' }]},
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

    await expect(adapter.execute(querySource(sourceSql, {
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
        }),
      {},{
        sortProfile: {
          id: { sql: 'random()' },
        },
        sort: [{ key: 'id' }]},
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

    await expect(adapter.execute(querySource('select * from users', {
          analysis: {
            astParse: 'ok',
            statementKind: 'select',
            hasTopLevelOrderBy: false,
            sourceHash: hashSql('select * from other_users'),
            safeSort: { insertion: { status: 'unresolved' } },
          },
        }),
      {},{
        sortProfile: {
          createdAt: { sql: '"created_at"', defaultDirection: 'desc' },
        },
        sort: [{ key: 'createdAt' }]},
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

    await expect(adapter.execute(querySource('select * from users', {
          analysis: { astParse: 'failed', statementKind: 'unknown', hasTopLevelOrderBy: false },
        }),
      {},{
        sortProfile: {
          createdAt: { sql: '"created_at"', defaultDirection: 'desc' },
        },
        sort: [{ key: 'createdAt' }]},
    )).rejects.toMatchObject({ code: 'ASHIBA_SORT_UNSUPPORTED_QUERY_MODEL' });
  });

  test('rejects safe sort when query model is not a SELECT', async () => {
    const client: NodePostgresQueryable = {
      async query() {
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter(client);

    await expect(adapter.execute(querySource('update users set name = :name', {
          analysis: { astParse: 'ok', statementKind: 'update', hasTopLevelOrderBy: false },
        }),
      {},{
        sortProfile: {
          createdAt: { sql: '"created_at"', defaultDirection: 'desc' },
        },
        sort: [{ key: 'createdAt' }]},
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
    await expect(adapter.execute(querySource(sourceSql, queryModelFor(sourceSql, {
        sql: 'select * from missing where id = $1',
        orderedNames: ['id'],
      })), { id: 1 },{})).rejects.toThrow('relation does not exist');

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

    await expect(adapter.execute(querySource('select :id', queryModelFor('select :id', {
        sql: 'select $1',
        orderedNames: ['id'],
      })), { id: 1, unused: true },{})).rejects.toThrow(AshibaParameterError);
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
  binding: {
    sql?: string;
    orderedNames?: readonly string[];
    safeSortInsertion?: { index: number };
    optionalConditionCompression?: {
      branches: readonly {
        parameterName: string;
          removalRange: {
            start: number;
            end: number;
            text?: string;
          };
          presentReplacement: {
            start: number;
            end: number;
            text: string;
          };
        }[];
      };
  } = {},
  analysis: Record<string, unknown> = {},
) {
  const analysisWithGroups = enrichOptionalCompressionGroups(sourceSql, analysis);
  const bindingWithGroups = binding.optionalConditionCompression
    ? {
      ...binding,
      optionalConditionCompression: enrichBindingOptionalCompressionGroups(
        binding.sql ?? sourceSql,
        binding.optionalConditionCompression,
        analysisWithGroups.optionalConditionCompression,
      ),
    }
    : binding;
  return {
    analysis: {
      astParse: 'ok',
      statementKind: 'select',
      hasTopLevelOrderBy: false,
      sourceHash: hashSql(sourceSql),
      ...analysisWithGroups,
    },
    bindings: {
      postgres: {
        sourceHash: hashSql(sourceSql),
        sql: bindingWithGroups.sql ?? sourceSql,
        orderedNames: bindingWithGroups.orderedNames ?? [],
        ...(bindingWithGroups.safeSortInsertion ? { safeSortInsertion: bindingWithGroups.safeSortInsertion } : {}),
        ...(bindingWithGroups.optionalConditionCompression ? { optionalConditionCompression: bindingWithGroups.optionalConditionCompression } : {}),
      },
    },
  };
}

function optionalCompressionAnalysis(sourceSql: string, parameterName: string, removalText: string) {
  const removalStart = sourceSql.indexOf(removalText);
  if (removalStart < 0) throw new Error(`Missing source removal text: ${removalText}`);
  const sourceText = sourceRangeTextFromRemovalText(removalText);
  const sourceStart = sourceSql.indexOf(sourceText, removalStart);
  const presentText = buildPresentReplacementText(sourceText);
  const removalRange = normalizeTestOptionalRemovalRange(sourceSql, {
    start: removalStart,
    end: removalStart + removalText.length,
  });
  return {
    enabled: true,
    branches: [{
      parameterName,
      kind: 'expression',
      sourceRange: {
        start: sourceStart,
        end: sourceStart + sourceText.length,
        text: sourceText,
      },
      removalRange: {
        ...removalRange,
        text: sourceSql.slice(removalRange.start, removalRange.end),
      },
      presentReplacement: {
        start: sourceStart,
        end: sourceStart + sourceText.length,
        text: presentText,
      },
    }],
  };
}

function optionalCompressionBinding(compiledSql: string, parameterName: string, removalText: string) {
  const removalStart = compiledSql.indexOf(removalText);
  if (removalStart < 0) throw new Error(`Missing compiled removal text: ${removalText}`);
  const sourceText = sourceRangeTextFromRemovalText(removalText);
  const sourceStart = compiledSql.indexOf(sourceText, removalStart);
  const removalRange = normalizeTestOptionalRemovalRange(compiledSql, {
    start: removalStart,
    end: removalStart + removalText.length,
  });
  return {
    branches: [{
      parameterName,
      removalRange: {
        ...removalRange,
        text: compiledSql.slice(removalRange.start, removalRange.end),
      },
      presentReplacement: {
        start: sourceStart,
        end: sourceStart + sourceText.length,
        text: buildPresentReplacementText(sourceText),
      },
    }],
  };
}

function buildPresentReplacementText(branchText: string): string {
  const normalized = branchText.trim().replace(/^(?:where|and|or)\b\s*/i, '');
  const inner = normalized.replace(/^\((.*)\)$/s, '$1');
  const terms = inner.split(/\s+or\s+/i);
  const meaningful = terms.filter((term) => !/^\s*(?::[A-Za-z_][A-Za-z0-9_]*|\$\d+)\s+is\s+null\s*$/i.test(term));
  return meaningful.length === 1 ? meaningful[0]!.trim() : `(${meaningful.map((term) => term.trim()).join(' or ')})`;
}

function sourceRangeTextFromRemovalText(removalText: string): string {
  return removalText
    .replace(/^(?:where|and|or)\s+/i, '')
    .replace(/\s+(?:and|or)\s*$/i, '');
}

function normalizeTestOptionalRemovalRange(sql: string, range: { start: number; end: number }): { start: number; end: number } {
  const rangeText = sql.slice(range.start, range.end);
  const whereAtRangeStart = rangeText.match(/^\s*where\b\s*/i);
  if (whereAtRangeStart?.[0]) {
    if (hasTestRemainingPredicateAfter(sql, range.end)) {
      const danglingConnective = sql.slice(range.end).match(/^\s+(?:and|or)\b\s*/i);
      return {
        start: range.start + whereAtRangeStart[0].length,
        end: danglingConnective?.[0] ? range.end + danglingConnective[0].length : range.end,
      };
    }
    return range;
  }

  const before = sql.slice(0, range.start);
  const whereMatch = before.match(/\bwhere(?:\s|\/\*[\s\S]*?\*\/|--[^\n]*(?:\n|$))*$/i);
  if (!whereMatch || whereMatch.index === undefined) {
    return extendTrailingConnectorWhitespace(sql, range);
  }
  if (hasTestRemainingPredicateAfter(sql, range.end)) {
    const danglingConnective = sql.slice(range.end).match(/^\s+(?:and|or)\b\s*/i);
    if (danglingConnective?.[0]) {
      return { start: range.start, end: range.end + danglingConnective[0].length };
    }
    return extendTrailingConnectorWhitespace(sql, range);
  }
  return { start: whereMatch.index, end: range.end };
}

function extendTrailingConnectorWhitespace(sql: string, range: { start: number; end: number }): { start: number; end: number } {
  const text = sql.slice(range.start, range.end);
  if (!/(?:^|\s)(?:and|or)$/i.test(text.trimEnd())) {
    return range;
  }
  const trailingWhitespace = sql.slice(range.end).match(/^\s*/)?.[0] ?? '';
  return { start: range.start, end: range.end + trailingWhitespace.length };
}

function enrichOptionalCompressionGroups(sourceSql: string, analysis: Record<string, unknown>): Record<string, unknown> {
  const optionalConditionCompression = analysis.optionalConditionCompression as
    | { branches?: Array<{ sourceRange: { start: number; end: number }; removalRange: { start: number; end: number; text?: string } }>; groups?: unknown[] }
    | undefined;
  if (!optionalConditionCompression?.branches || optionalConditionCompression.groups) {
    return analysis;
  }
  const groups = buildTestOptionalCompressionGroups(sourceSql, optionalConditionCompression.branches);
  return {
    ...analysis,
    optionalConditionCompression: {
      ...optionalConditionCompression,
      ...(groups.length > 0 ? { groups } : {}),
    },
  };
}

function enrichBindingOptionalCompressionGroups(
  compiledSql: string,
  binding: {
    branches: readonly {
      parameterName: string;
      removalRange: { start: number; end: number; text?: string };
      presentReplacement: { start: number; end: number; text: string };
    }[];
    groups?: readonly {
      branchIndexes: readonly number[];
      removalRange: { start: number; end: number; text?: string };
    }[];
  },
  analysisCompression: unknown,
): typeof binding {
  if (binding.groups) return binding;
  const groups = (analysisCompression as { groups?: Array<{ branchIndexes: number[]; removalRange: { text?: string } }> } | undefined)?.groups;
  if (!groups || groups.length === 0) return binding;
  const bindingGroups = groups.map((group) => {
    const firstBranch = binding.branches[group.branchIndexes[0] ?? -1];
    const lastBranch = binding.branches[group.branchIndexes[group.branchIndexes.length - 1] ?? -1];
    if (!firstBranch || !lastBranch) return undefined;
    const branchEnd = Math.max(...group.branchIndexes.map((index) => binding.branches[index]?.removalRange.end ?? -1));
    const removesWholeWhere = /^\s*where\b/i.test(group.removalRange.text ?? '');
    const start = removesWholeWhere
      ? compiledSql.slice(0, firstBranch.removalRange.start).match(/\bwhere(?:\s|\/\*[\s\S]*?\*\/|--[^\n]*(?:\n|$))*$/i)?.index ?? firstBranch.removalRange.start
      : firstBranch.removalRange.start;
    const trailingConnective = removesWholeWhere ? '' : compiledSql.slice(branchEnd).match(/^\s+(?:and|or)\b\s*/i)?.[0] ?? '';
    const end = branchEnd + trailingConnective.length;
    return {
      branchIndexes: [...group.branchIndexes],
      removalRange: {
        start,
        end,
        text: compiledSql.slice(start, end),
      },
    };
  }).filter((group): group is { branchIndexes: number[]; removalRange: { start: number; end: number; text: string } } => group !== undefined);
  return {
    ...binding,
    ...(bindingGroups.length > 0 ? { groups: bindingGroups } : {}),
  };
}

function buildTestOptionalCompressionGroups(
  sql: string,
  branches: readonly { sourceRange?: { start: number; end: number }; removalRange: { start: number; end: number; text?: string } }[],
): Array<{ branchIndexes: number[]; removalRange: { start: number; end: number; text: string } }> {
  const sourceLikeRanges = branches.map((branch) => branch.sourceRange ?? branch.removalRange);
  const groups: Array<{ branchIndexes: number[]; removalRange: { start: number; end: number; text: string } }> = [];
  const consumed = new Set<number>();
  for (let index = 0; index < sourceLikeRanges.length; index += 1) {
    if (consumed.has(index)) continue;
    const range = sourceLikeRanges[index];
    if (!range) continue;
    const prefix = sql.slice(0, range.start).match(/\bwhere(?:\s|\/\*[\s\S]*?\*\/|--[^\n]*(?:\n|$))*$/i);
    if (!prefix?.[0] || prefix.index === undefined) continue;
    const groupIndexes: number[] = [];
    let cursor = range.start;
    for (let branchIndex = index; branchIndex < sourceLikeRanges.length; branchIndex += 1) {
      const branchRange = sourceLikeRanges[branchIndex];
      if (!branchRange) break;
      const between = sql.slice(cursor, branchRange.start).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*(?:\n|$)/g, ' ').trim();
      if (groupIndexes.length === 0 ? between !== '' : !/^(?:and|or)\b\s*$/i.test(between)) break;
      groupIndexes.push(branchIndex);
      cursor = branchRange.end;
    }
    const lastRange = sourceLikeRanges[groupIndexes[groupIndexes.length - 1] ?? -1];
    if (groupIndexes.length < 2 || !lastRange) continue;
    const remainingPredicateAfterGroup = hasTestRemainingPredicateAfter(sql, lastRange.end);
    const trailingConnective = remainingPredicateAfterGroup
      ? sql.slice(lastRange.end).match(/^\s+(?:and|or)\b\s*/i)?.[0] ?? ''
      : '';
    const whereKeyword = prefix[0].match(/\bwhere\b\s*/i)?.[0] ?? 'where';
    const start = remainingPredicateAfterGroup ? prefix.index + whereKeyword.length : prefix.index;
    const end = lastRange.end + trailingConnective.length;
    groups.push({
      branchIndexes: groupIndexes,
      removalRange: {
        start,
        end,
        text: sql.slice(start, end),
      },
    });
    for (const groupIndex of groupIndexes) consumed.add(groupIndex);
  }
  return groups;
}

function hasTestRemainingPredicateAfter(sql: string, index: number): boolean {
  const after = sql.slice(index).trimStart();
  if (after.length === 0 || after.startsWith(';')) return false;
  if (/^(?:and|or)\b/i.test(after)) return hasTestRemainingPredicateAfter(after.replace(/^(?:and|or)\b\s*/i, ''), 0);
  return !/^(?:group\s+by|order\s+by|having|window|limit|offset|fetch|for|union|intersect|except)\b|^\)|^;/i.test(after);
}
