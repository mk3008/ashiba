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
});
