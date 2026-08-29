import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { preparePostgresQuery } from '../src/index.js';

const sql = 'select $1::int as owner_id, $2::text as state, $1::int as repeated_owner';
const source = {
  sql: 'select :owner_id::int as owner_id, :state::text as state, :owner_id::int as repeated_owner',
  queryModel: {
    analysis: {
      astParse: 'ok' as const,
      statementKind: 'select' as const,
      hasTopLevelOrderBy: false as const,
      sourceHash: hash('select :owner_id::int as owner_id, :state::text as state, :owner_id::int as repeated_owner'),
    },
    bindings: {
      postgres: {
        style: 'indexed' as const,
        sql,
        parameterNames: ['owner_id', 'state'],
        sourceHash: hash('select :owner_id::int as owner_id, :state::text as state, :owner_id::int as repeated_owner'),
      },
    },
  },
};

describe('@ashiba-ts/driver-adapter-pg preparation', () => {
  test('returns native pg SQL and values without executing a query', () => {
    const hostile = "open'; select pg_sleep(9); --";
    expect(preparePostgresQuery(source, { owner_id: 7, state: hostile })).toMatchObject({
      sql,
      parameterNames: ['owner_id', 'state'],
      values: [7, hostile],
    });
    expect(preparePostgresQuery(source, { owner_id: 7, state: hostile }).sql).not.toContain(hostile);
  });

  test('rejects missing, unused, and stale binding inputs before native execution', () => {
    expect(() => preparePostgresQuery(source, { owner_id: 7 } as never)).toThrow('Missing SQL parameter');
    expect(() => preparePostgresQuery(source, { owner_id: 7, state: 'open', extra: true } as never)).toThrow('Unused SQL parameter');
    expect(() => preparePostgresQuery({ ...source, sql: `${source.sql} -- stale` }, { owner_id: 7, state: 'open' })).toThrow('generated from different source SQL');
  });

  test('prepares compressed optional conditions for direct native pg execution', () => {
    const sourceSql = 'select * from users where tenant_id = :tenant_id and (:status is null or status = :status)';
    const compiledSql = 'select * from users where tenant_id = $1 and ($2 is null or status = $3)';
    const sourceBranch = 'and (:status is null or status = :status)';
    const compiledBranch = 'and ($2 is null or status = $3)';
    const sourceBranchStart = sourceSql.indexOf(sourceBranch);
    const compiledBranchStart = compiledSql.indexOf(compiledBranch);
    const sourceExpressionStart = sourceSql.indexOf('(:status is null or status = :status)');
    const compiledExpressionStart = compiledSql.indexOf('($2 is null or status = $3)');
    const query = {
      sql: sourceSql,
      queryModel: {
        analysis: {
          astParse: 'ok' as const,
          statementKind: 'select' as const,
          hasTopLevelOrderBy: false as const,
          sourceHash: hash(sourceSql),
          optionalConditionCompression: {
            enabled: true as const,
            branches: [{
              parameterName: 'status',
              kind: 'expression' as const,
              sourceRange: {
                start: sourceExpressionStart,
                end: sourceExpressionStart + '(:status is null or status = :status)'.length,
                text: '(:status is null or status = :status)',
              },
              removalRange: {
                start: sourceBranchStart,
                end: sourceBranchStart + sourceBranch.length,
                text: sourceBranch,
              },
              presentReplacement: {
                start: sourceExpressionStart,
                end: sourceExpressionStart + '(:status is null or status = :status)'.length,
                text: 'status = :status',
              },
            }],
          },
        },
        bindings: {
          postgres: {
            style: 'indexed' as const,
            sql: compiledSql,
            parameterNames: ['tenant_id', 'status', 'status'],
            sourceHash: hash(sourceSql),
            optionalConditionCompression: {
              branches: [{
                parameterName: 'status',
                removalRange: {
                  start: compiledBranchStart,
                  end: compiledBranchStart + compiledBranch.length,
                  text: compiledBranch,
                },
                presentReplacement: {
                  start: compiledExpressionStart,
                  end: compiledExpressionStart + '($2 is null or status = $3)'.length,
                  text: 'status = $3',
                },
              }],
            },
          },
        },
      },
    };

    expect(preparePostgresQuery(query, { tenant_id: 10, status: null }, {
      optionalConditionCompression: true,
    })).toMatchObject({
      sql: 'select * from users where tenant_id = $1 ',
      values: [10],
      parameterNames: ['tenant_id'],
    });
  });
});

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
