import { describe, expect, test } from 'vitest';
import {
  buildPostgresOptionalConditionCompressionBindingMetadata,
  buildPostgresSafeSortBindingMetadata,
} from '../src/commands/model-gen.js';
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

  test('preserves the registered PostgreSQL lexical corpus including nested block comments', () => {
    const sql = [
      'select',
      '  :id::bigint as id,',
      '  :id2::bigint as id2,',
      '  :id::bigint as repeated_id,',
      '  value::text as cast_value,',
      "  ':not_a_parameter'::text as literal,",
      '  value as "identifier:still_not_parameter",',
      "  E'escaped \\\\ :not_a_parameter'::text as escaped_literal,",
      '  $$ :not_a_parameter $$::text as dollar_literal,',
      '  $body$',
      '    :not_a_parameter',
      '  $body$::text as tagged_dollar_literal,',
      '  $function$',
      '  BEGIN',
      '    -- :not_a_parameter',
      '  END',
      '  $function$::text as function_body',
      'from (select :value::text as value) source',
      '-- :not_a_parameter',
      '/* :not_a_parameter */',
      '/* outer /* nested :not_a_parameter */ outer again */',
      'where :id::bigint = :id::bigint;',
    ].join('\n');

    const result = compileNamedParameters(sql);

    expect(result.orderedNames).toEqual(['id', 'id2', 'id', 'value', 'id', 'id']);
    expect(result.sql).toContain('/* outer /* nested :not_a_parameter */ outer again */');
    expect(result.sql).toContain('$function$\n  BEGIN\n    -- :not_a_parameter\n  END\n  $function$');
    expect(result.sql).toContain('where $5::bigint = $6::bigint;');
  });

  test('ignores named-parameter-like text after escaped quotes in postgres escape strings', () => {
    const sql = String.raw`select E'it\'s :not_param' as body from users where id = :id`;

    const result = compileNamedParameters(sql);

    expect(result.sql).toBe(String.raw`select E'it\'s :not_param' as body from users where id = $1`);
    expect(result.orderedNames).toEqual(['id']);
  });

  test('stores full-query placeholder ranges for optional compression binding metadata', () => {
    const sql = 'select * from users where tenant_id = :tenant_id and (:status is null or status = :status) limit :limit';
    const removalText = 'and (:status is null or status = :status)';
    const removalStart = sql.indexOf(removalText);
    const metadata = buildPostgresOptionalConditionCompressionBindingMetadata(sql, {
      enabled: true,
      branches: [{
        parameterName: 'status',
        kind: 'expression',
        sourceRange: {
          start: sql.indexOf('(:status is null or status = :status)'),
          end: sql.indexOf('(:status is null or status = :status)') + '(:status is null or status = :status)'.length,
          text: '(:status is null or status = :status)',
        },
        removalRange: {
          start: removalStart,
          end: removalStart + removalText.length,
          text: removalText,
        },
        presentReplacement: {
          start: sql.indexOf('(:status is null or status = :status)'),
          end: sql.indexOf('(:status is null or status = :status)') + '(:status is null or status = :status)'.length,
          text: 'status = :status',
        },
      }],
    });

    expect(metadata.optionalConditionCompression?.branches).toEqual([{
      parameterName: 'status',
      removalRange: {
        start: 'select * from users where tenant_id = $1 '.length,
        end: 'select * from users where tenant_id = $1 and ($2 is null or status = $3)'.length,
      },
      presentReplacement: {
        start: 'select * from users where tenant_id = $1 and '.length,
        end: 'select * from users where tenant_id = $1 and ($2 is null or status = $3)'.length,
        text: 'status = $2',
      },
    }]);
  });

  test('keeps optional and safe-sort compiled coordinates aligned after nested comments', () => {
    const sql = [
      'select id',
      'from users',
      '/* outer /* nested :not_a_parameter */ outer */',
      'where tenant_id = :tenant_id',
      '  and (:status is null or status = :status)',
      'order by id',
      'limit :limit',
    ].join('\n');
    const compiled = compileNamedParameters(sql, { placeholderStyle: 'postgres' });
    const branchText = '(:status is null or status = :status)';
    const branchStart = sql.indexOf(branchText);
    const removalText = 'and ' + branchText;
    const removalStart = sql.indexOf(removalText);
    const optional = buildPostgresOptionalConditionCompressionBindingMetadata(sql, {
      enabled: true,
      branches: [{
        parameterName: 'status',
        kind: 'expression',
        sourceRange: { start: branchStart, end: branchStart + branchText.length, text: branchText },
        removalRange: { start: removalStart, end: removalStart + removalText.length, text: removalText },
        presentReplacement: {
          start: branchStart,
          end: branchStart + branchText.length,
          text: 'status = :status',
        },
      }],
    });
    const safeSort = buildPostgresSafeSortBindingMetadata(sql, {
      insertion: { status: 'ready', index: sql.indexOf('order by') },
      sortable: {},
    });

    expect(compiled.orderedNames).toEqual(['tenant_id', 'status', 'status', 'limit']);
    expect(optional.optionalConditionCompression?.branches[0]).toMatchObject({
      removalRange: {
        start: compiled.sql.indexOf('and ($2 is null or status = $3)'),
        end: compiled.sql.indexOf('and ($2 is null or status = $3)') + 'and ($2 is null or status = $3)'.length,
      },
      presentReplacement: {
        start: compiled.sql.indexOf('($2 is null or status = $3)'),
        end: compiled.sql.indexOf('($2 is null or status = $3)') + '($2 is null or status = $3)'.length,
        text: 'status = $2',
      },
    });
    expect(safeSort.safeSortInsertion).toEqual({ index: compiled.sql.indexOf('order by') });
  });
});
