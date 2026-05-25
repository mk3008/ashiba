import { describe, expect, test } from 'vitest';
import { compileNamedParameters } from '../src/parameter-metadata.js';

describe('CLI parameter metadata generation', () => {
  test('compiles colon parameters for postgres metadata', () => {
    const result = compileNamedParameters('select * from users where id = :id and team_id = :teamId');

    expect(result.sql).toBe('select * from users where id = $1 and team_id = $2');
    expect(result.orderedNames).toEqual(['id', 'teamId']);
  });

  test('compiles at parameters for question placeholders', () => {
    const result = compileNamedParameters('select * from users where id = @id', {
      parameterStyle: 'at',
      placeholderStyle: 'question',
    });

    expect(result.sql).toBe('select * from users where id = ?');
    expect(result.orderedNames).toEqual(['id']);
  });

  test('does not rewrite strings, comments, quoted identifiers, or postgres casts', () => {
    const sql = [
      "select ':not_param' as literal,",
      '"@not_param" as ident,',
      'created_at::date as created_date',
      'from users',
      '-- :not_param',
      'where id = :id',
    ].join('\n');

    const result = compileNamedParameters(sql);

    expect(result.sql).toContain("':not_param'");
    expect(result.sql).toContain('"@not_param"');
    expect(result.sql).toContain('created_at::date');
    expect(result.sql).toContain('-- :not_param');
    expect(result.sql).toContain('where id = $1');
    expect(result.orderedNames).toEqual(['id']);
  });

  test('ignores named-parameter-like text inside SQL comments', () => {
    const sql = [
      'select *',
      'from users',
      '-- :line_comment_param should stay a comment',
      '/* :block_comment_param should also stay a comment */',
      'where id = :id',
    ].join('\n');

    const result = compileNamedParameters(sql);

    expect(result.sql).toContain('-- :line_comment_param should stay a comment');
    expect(result.sql).toContain('/* :block_comment_param should also stay a comment */');
    expect(result.sql).toContain('where id = $1');
    expect(result.orderedNames).toEqual(['id']);
  });

  test('ignores named-parameter-like text inside postgres dollar-quoted strings', () => {
    const sql = [
      'select $tag$',
      '  :not_param and @also_not_param',
      '$tag$ as body',
      'from users',
      'where id = :id',
    ].join('\n');

    const result = compileNamedParameters(sql);

    expect(result.sql).toContain(':not_param and @also_not_param');
    expect(result.sql).toContain('where id = $1');
    expect(result.orderedNames).toEqual(['id']);
  });

  test('ignores named-parameter-like text after escaped quotes in postgres escape strings', () => {
    const sql = String.raw`select E'it\'s :not_param' as body from users where id = :id`;

    const result = compileNamedParameters(sql);

    expect(result.sql).toBe(String.raw`select E'it\'s :not_param' as body from users where id = $1`);
    expect(result.orderedNames).toEqual(['id']);
  });
});
