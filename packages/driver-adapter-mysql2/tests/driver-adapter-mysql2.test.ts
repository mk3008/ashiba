import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import {
  AshibaMysql2ParameterError,
  createMysql2Adapter,
  type AshibaMysql2QueryModel,
  type Mysql2Queryable,
} from '../src/index.js';

describe('@ashiba/driver-adapter-mysql2', () => {
  test('executes named-parameter SQL through a mysql2 compatible client', async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client: Mysql2Queryable = {
      async execute(sql, values) {
        calls.push({ sql, values });
        return [[{ user_id: 1 }], []];
      },
    };
    const adapter = createMysql2Adapter(client);
    const sourceSql = 'select * from users where id = :id and status = :status';

    const result = await adapter.execute(querySource(sourceSql), { id: 1, status: 'active' });

    expect(result.rows).toEqual([{ user_id: 1 }]);
    expect(calls).toEqual([{ sql: 'select * from users where id = ? and status = ?', values: [1, 'active'] }]);
  });

  test('rejects missing and unused parameters before calling mysql2', async () => {
    let called = false;
    const client: Mysql2Queryable = {
      async execute() {
        called = true;
        return [[], []];
      },
    };
    const adapter = createMysql2Adapter(client);

    await expect(adapter.execute(querySource('select * from users where id = :id'), {}))
      .rejects.toBeInstanceOf(AshibaMysql2ParameterError);
    await expect(adapter.execute(querySource('select * from users where id = :id'), { id: 1, extra: true }))
      .rejects.toMatchObject({ code: 'ASHIBA_UNUSED_PARAMETER' });
    expect(called).toBe(false);
  });

  test('rejects stale query model metadata', async () => {
    const client: Mysql2Queryable = {
      async execute() {
        return [[], []];
      },
    };
    const adapter = createMysql2Adapter(client);

    await expect(adapter.execute(querySource('select * from users where id = :id', {
      analysis: {
        astParse: 'ok',
        statementKind: 'select',
        hasTopLevelOrderBy: false,
        sourceHash: hashSql('select * from accounts where id = :id'),
      },
      bindings: {
        mysql2: {
          sourceHash: hashSql('select * from accounts where id = :id'),
          sql: 'select * from accounts where id = ?',
          orderedNames: ['id'],
        },
      },
    }), { id: 1 })).rejects.toMatchObject({ code: 'ASHIBA_QUERY_MODEL_STALE' });
  });
});

function querySource(sql: string, queryModel: AshibaMysql2QueryModel = queryModelFor(sql)) {
  return {
    sql,
    sqlPath: 'users.sql',
    queryModel,
  };
}

function queryModelFor(sourceSql: string): AshibaMysql2QueryModel {
  return {
    analysis: {
      astParse: 'ok',
      statementKind: 'select',
      hasTopLevelOrderBy: false,
      sourceHash: hashSql(sourceSql),
    },
    bindings: {
      mysql2: {
        sourceHash: hashSql(sourceSql),
        sql: sourceSql.replace(/:\w+/g, '?'),
        orderedNames: [...sourceSql.matchAll(/:(\w+)/g)].map((match) => match[1] ?? ''),
      },
    },
  };
}

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}
