import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import {
  AshibaMssqlParameterError,
  createMssqlAdapter,
  type AshibaMssqlQueryModel,
  type MssqlRequest,
  type MssqlRequestFactory,
} from '../src/index.js';

describe('@ashiba-ts/driver-adapter-mssql', () => {
  test('executes named-parameter SQL through an mssql compatible request factory', async () => {
    const inputs: Array<{ name: string; value: unknown }> = [];
    const queries: string[] = [];
    const factory: MssqlRequestFactory = {
      request<Row>(): MssqlRequest<Row> {
        return {
          input(name, value) {
            inputs.push({ name, value });
            return this;
          },
          async query(sql) {
            queries.push(sql);
            return { recordset: [{ user_id: 1 }] as Row[], rowsAffected: [1] };
          },
        };
      },
    };
    const adapter = createMssqlAdapter(factory);
    const sourceSql = 'select * from users where id = :id and status = :status';

    const result = await adapter.execute(querySource(sourceSql), { id: 1, status: 'active' });

    expect(result.recordset).toEqual([{ user_id: 1 }]);
    expect(inputs).toEqual([{ name: 'id', value: 1 }, { name: 'status', value: 'active' }]);
    expect(queries).toEqual(['select * from users where id = @id and status = @status']);
  });

  test('rejects missing and unused parameters before calling mssql', async () => {
    let called = false;
    const factory: MssqlRequestFactory = {
      request<Row>(): MssqlRequest<Row> {
        return {
          input() {
            return this;
          },
          async query() {
            called = true;
            return { recordset: [] };
          },
        };
      },
    };
    const adapter = createMssqlAdapter(factory);

    await expect(adapter.execute(querySource('select * from users where id = :id'), {}))
      .rejects.toBeInstanceOf(AshibaMssqlParameterError);
    await expect(adapter.execute(querySource('select * from users where id = :id'), { id: 1, extra: true }))
      .rejects.toMatchObject({ code: 'ASHIBA_UNUSED_PARAMETER' });
    expect(called).toBe(false);
  });

  test('rejects stale query model metadata', async () => {
    const factory: MssqlRequestFactory = {
      request<Row>(): MssqlRequest<Row> {
        return {
          input() {
            return this;
          },
          async query() {
            return { recordset: [] };
          },
        };
      },
    };
    const adapter = createMssqlAdapter(factory);

    await expect(adapter.execute(querySource('select * from users where id = :id', {
      analysis: {
        astParse: 'ok',
        statementKind: 'select',
        hasTopLevelOrderBy: false,
        sourceHash: hashSql('select * from accounts where id = :id'),
      },
      bindings: {
        mssql: {
          sourceHash: hashSql('select * from accounts where id = :id'),
          sql: 'select * from accounts where id = @id',
          orderedNames: ['id'],
        },
      },
    }), { id: 1 })).rejects.toMatchObject({ code: 'ASHIBA_QUERY_MODEL_STALE' });
  });
});

function querySource(sql: string, queryModel: AshibaMssqlQueryModel = queryModelFor(sql)) {
  return {
    sql,
    sqlPath: 'users.sql',
    queryModel,
  };
}

function queryModelFor(sourceSql: string): AshibaMssqlQueryModel {
  return {
    analysis: {
      astParse: 'ok',
      statementKind: 'select',
      hasTopLevelOrderBy: false,
      sourceHash: hashSql(sourceSql),
    },
    bindings: {
      mssql: {
        sourceHash: hashSql(sourceSql),
        sql: sourceSql.replace(/:(\w+)/g, '@$1'),
        orderedNames: [...sourceSql.matchAll(/:(\w+)/g)].map((match) => match[1] ?? ''),
      },
    },
  };
}

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}
