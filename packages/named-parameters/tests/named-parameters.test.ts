import { describe, expect, test } from 'vitest';
import { NamedParameterError, bindNamedParameters } from '../src/index.js';
describe('@ashiba-ts/named-parameters', () => {
  test('is strict by default and keeps hostile values outside indexed SQL', () => {
    const statement = { style: 'indexed' as const, sql: 'select $1, $1, $2', parameterNames: ['id', 'name'] };
    const hostile = "x'); drop table tickets; --";
    expect(bindNamedParameters(statement, { id: 7, name: hostile }).values).toEqual([7, hostile]);
    expect(() => bindNamedParameters(statement, { id: 7 })).toThrow(NamedParameterError);
    expect(() => bindNamedParameters(statement, { id: 7, name: hostile, extra: true })).toThrow(NamedParameterError);
    expect(bindNamedParameters(statement, { id: 7, name: hostile, extra: true }, { allowUnusedParameters: true }).sql).not.toContain(hostile);
  });
  test('permits only verified rewrite exceptions', () => {
    const statement = { style: 'indexed' as const, sql: 'select $1', parameterNames: ['id'] };
    expect(bindNamedParameters(statement, { id: 7, omittedStatus: null }, { allowedUnusedNames: new Set(['omittedStatus']) }).values).toEqual([7]);
    expect(() => bindNamedParameters(statement, { id: 7, unrelated: true }, { allowedUnusedNames: new Set(['omittedStatus']) })).toThrow(NamedParameterError);
  });
});
