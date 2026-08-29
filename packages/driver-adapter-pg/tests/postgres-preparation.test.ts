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
});

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
