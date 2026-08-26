import { describe, expect, test } from 'vitest';
import { compileNamedParameters } from '../src/compiler.js';

describe('compileNamedParameters', () => {
  test('models repeated logical values by driver semantics', () => {
    const sql = 'select :id, :id, @team';

    expect(compileNamedParameters(sql)).toEqual({
      style: 'indexed', sql: 'select $1, $1, $2', parameterNames: ['id', 'team'],
    });
    expect(compileNamedParameters(sql, { rendering: { style: 'named', prefix: '@' } })).toEqual({
      style: 'named', sql: 'select @id, @id, @team', parameterNames: ['id', 'team'],
    });
    expect(compileNamedParameters(sql, { rendering: { style: 'anonymous', token: '?' } })).toEqual({
      style: 'anonymous', sql: 'select ?, ?, ?', valueNames: ['id', 'id', 'team'],
    });
  });

  test('does not rewrite strings, quoted identifiers, comments, or PostgreSQL casts', () => {
    const sql = [
      "select ':not_param' as literal,", '"@not_param" as ident,', 'created_at::date as created_date',
      'from users', '-- :line_comment_param', '/* @block_comment_param */',
      'where id = :id and team_id = @teamId',
    ].join('\n');

    expect(compileNamedParameters(sql)).toEqual({
      style: 'indexed',
      sql: [
        "select ':not_param' as literal,", '"@not_param" as ident,', 'created_at::date as created_date',
        'from users', '-- :line_comment_param', '/* @block_comment_param */',
        'where id = $1 and team_id = $2',
      ].join('\n'),
      parameterNames: ['id', 'teamId'],
    });
  });

  test('preserves the PostgreSQL lexical corpus including nested comments and escape strings', () => {
    const sql = [
      'select', '  :id::bigint as id,', '  :id2::bigint as id2,', '  :id::bigint as repeated_id,',
      "  ':not_a_parameter'::text as literal,", '  value as "identifier:still_not_parameter",',
      "  E'escaped \\\\ :not_a_parameter'::text as escaped_literal,", '  $$ :not_a_parameter $$::text as dollar_literal,',
      '  $body$', '    :not_a_parameter', '  $body$::text as tagged_dollar_literal',
      'from (select :value::text as value) source', '-- :not_a_parameter', '/* :not_a_parameter */',
      '/* outer /* nested :not_a_parameter */ outer again */', 'where :id::bigint = :id::bigint;',
    ].join('\n');
    const compiled = compileNamedParameters(sql);

    expect(compiled).toMatchObject({ style: 'indexed', parameterNames: ['id', 'id2', 'value'] });
    expect(compiled.sql).toContain('  $1::bigint as id,');
    expect(compiled.sql).toContain('  $2::bigint as id2,');
    expect(compiled.sql).toContain('  $1::bigint as repeated_id,');
    expect(compiled.sql).toContain("E'escaped \\\\ :not_a_parameter'::text");
    expect(compiled.sql).toContain('$body$\n    :not_a_parameter\n  $body$');
    expect(compiled.sql).toContain('/* outer /* nested :not_a_parameter */ outer again */');
    expect(compiled.sql).toContain('where $1::bigint = $1::bigint;');
  });

  test('ignores named-parameter-like text after escaped quotes in PostgreSQL escape strings', () => {
    const sql = String.raw`select E'it\'s :not_param' as body from users where id = :id`;

    expect(compileNamedParameters(sql)).toEqual({
      style: 'indexed',
      sql: String.raw`select E'it\'s :not_param' as body from users where id = $1`,
      parameterNames: ['id'],
    });
  });
});
