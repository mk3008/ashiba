import { describe, expect, test } from 'vitest';
import { compileNamedParameters } from '../src/compiler.js';
describe('compileNamedParameters', () => {
  test('models repeated logical values by driver semantics', () => {
    const sql = 'select :id, :id, @team';
    expect(compileNamedParameters(sql)).toEqual({ style: 'indexed', sql: 'select $1, $1, $2', parameterNames: ['id', 'team'] });
    expect(compileNamedParameters(sql, { rendering: { style: 'named', prefix: '@' } })).toEqual({ style: 'named', sql: 'select @id, @id, @team', parameterNames: ['id', 'team'] });
    expect(compileNamedParameters(sql, { rendering: { style: 'anonymous', token: '?' } })).toEqual({ style: 'anonymous', sql: 'select ?, ?, ?', valueNames: ['id', 'id', 'team'] });
  });
  test('does not rewrite lexical non-code contexts', () => {
    const sql = "select ':ignored', \"@ignored\", value::text /* :ignored */ where id = :id and team = @team";
    expect(compileNamedParameters(sql)).toEqual({ style: 'indexed', sql: "select ':ignored', \"@ignored\", value::text /* :ignored */ where id = $1 and team = $2", parameterNames: ['id', 'team'] });
  });
});
