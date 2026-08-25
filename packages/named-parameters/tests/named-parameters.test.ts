import { describe, expect, test } from 'vitest';
import { NamedParameterError, bindNamedParameters } from '../src/index.js';

describe('@ashiba-ts/named-parameters', () => {
  const statement = { sql: 'select $1, $2, $3', orderedNames: ['id', 'name', 'id'] } as const;

  test('keeps build-time SQL unchanged and orders repeated values', () => {
    const hostile = "x'); drop table tickets; --";
    const bound = bindNamedParameters(statement, { id: 7, name: hostile }, { strict: true });

    expect(bound).toEqual({ sql: statement.sql, orderedNames: statement.orderedNames, values: [7, hostile, 7] });
    expect(bound.sql).not.toContain(hostile);
  });

  test('rejects missing and unused inputs', () => {
    expect(() => bindNamedParameters(statement, { id: 7 }, { strict: true }))
      .toThrow(NamedParameterError);
    expect(() => bindNamedParameters(statement, { id: 7, name: 'a', extra: true }, { strict: true }))
      .toThrow(NamedParameterError);
  });

  test('permits only explicitly removed names after a verified rewrite', () => {
    const rewritten = { sql: 'select $1', orderedNames: ['id'] } as const;

    expect(bindNamedParameters(rewritten, { id: 7, omittedStatus: null }, {
      strict: true,
      allowedUnusedNames: new Set(['omittedStatus']),
    }).values).toEqual([7]);
    expect(() => bindNamedParameters(rewritten, { id: 7, unrelated: true }, {
      strict: true,
      allowedUnusedNames: new Set(['omittedStatus']),
    })).toThrow(NamedParameterError);
  });
});
