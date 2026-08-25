import { describe, expect, test } from 'vitest';
import { compileNamedParameters } from '../src/compiler.js';

describe('compileNamedParameters', () => {
  test('preserves repeated names and supports every driver placeholder output', () => {
    const sql = 'select :id, :id, @team';
    expect(compileNamedParameters(sql)).toEqual({ sql: 'select $1, $2, $3', orderedNames: ['id', 'id', 'team'] });
    expect(compileNamedParameters(sql, { placeholderStyle: 'question' }).sql).toBe('select ?, ?, ?');
    expect(compileNamedParameters(sql, { placeholderStyle: 'named-at' }).sql).toBe('select @id, @id, @team');
    expect(compileNamedParameters('select @id', { parameterStyle: 'at', placeholderStyle: 'postgres' }))
      .toEqual({ sql: 'select $1', orderedNames: ['id'] });
  });

  test('does not rewrite strings, quoted identifiers, comments, casts, or dollar quotes', () => {
    const sql = [
      "select ':string' as literal, E'it\\'s :escaped' as escaped,",
      '"@identifier" as identifier, value::text,',
      '$$ :dollar $$, $tag$ :tagged $tag$',
      '/* outer /* :nested */ comment */ -- :line',
      'where id = :id and team = @team',
    ].join('\n');
    const result = compileNamedParameters(sql);

    expect(result.orderedNames).toEqual(['id', 'team']);
    expect(result.sql).toContain("':string'");
    expect(result.sql).toContain("E'it\\'s :escaped'");
    expect(result.sql).toContain('"@identifier"');
    expect(result.sql).toContain('value::text');
    expect(result.sql).toContain('$$ :dollar $$');
    expect(result.sql).toContain('$tag$ :tagged $tag$');
    expect(result.sql).toContain('/* outer /* :nested */ comment */');
    expect(result.sql).toContain('-- :line');
    expect(result.sql).toContain('where id = $1 and team = $2');
  });

  test('keeps the PostgreSQL lexical regression corpus intact', () => {
    const sql = [
      'select :id::bigint, :id2::bigint, :id::bigint,',
      "':not_a_parameter'::text, E'escaped \\ :not_a_parameter'::text,",
      '$$ :not_a_parameter $$::text, $body$ :not_a_parameter $body$::text,',
      '/* outer /* nested :not_a_parameter */ outer */',
      'from (select :value::text as value) source',
      'where :id::bigint = :id::bigint;',
    ].join('\n');
    const result = compileNamedParameters(sql);

    expect(result.orderedNames).toEqual(['id', 'id2', 'id', 'value', 'id', 'id']);
    expect(result.sql).toContain('/* outer /* nested :not_a_parameter */ outer */');
    expect(result.sql).toContain('where $5::bigint = $6::bigint;');
  });
});
