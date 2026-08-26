import { describe, expect, test } from 'vitest';
import {
  buildPostgresOptionalConditionCompressionBindingMetadata,
  buildPostgresSafeSortBindingMetadata,
} from '../src/commands/model-gen.js';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

describe('CLI parameter metadata generation', () => {
  test('stores compiled coordinates for optional compression', () => {
    const sql = 'select * from users where tenant_id = :tenant_id and (:status is null or status = :status) limit :limit';
    const removalText = 'and (:status is null or status = :status)';
    const removalStart = sql.indexOf(removalText);
    const metadata = buildPostgresOptionalConditionCompressionBindingMetadata(sql, {
      enabled: true,
      branches: [{
        parameterName: 'status',
        kind: 'expression',
        sourceRange: { start: sql.indexOf('(:status'), end: sql.indexOf('(:status') + '(:status is null or status = :status)'.length, text: '(:status is null or status = :status)' },
        removalRange: { start: removalStart, end: removalStart + removalText.length, text: removalText },
        presentReplacement: { start: sql.indexOf('(:status'), end: sql.indexOf('(:status') + '(:status is null or status = :status)'.length, text: 'status = :status' },
      }],
    });

    expect(metadata.optionalConditionCompression?.branches[0]).toMatchObject({
      parameterName: 'status',
      removalRange: {
        start: 'select * from users where tenant_id = $1 '.length,
        end: 'select * from users where tenant_id = $1 and ($2 is null or status = $3)'.length,
      },
      presentReplacement: { text: 'status = $2' },
    });
  });

  test('keeps optional and safe-sort compiled coordinates aligned', () => {
    const sql = [
      'select id from users',
      '/* outer comment /* nested :not_a_parameter */ still outer */',
      'where tenant_id = :tenant_id and (:status is null or status = :status)',
      'order by id limit :limit',
    ].join('\n');
    const branch = '(:status is null or status = :status)';
    const branchStart = sql.indexOf(branch);
    const optional = buildPostgresOptionalConditionCompressionBindingMetadata(sql, {
      enabled: true,
      branches: [{
        parameterName: 'status', kind: 'expression',
        sourceRange: { start: branchStart, end: branchStart + branch.length, text: branch },
        removalRange: { start: sql.indexOf(`and ${branch}`), end: sql.indexOf(`and ${branch}`) + `and ${branch}`.length, text: `and ${branch}` },
        presentReplacement: { start: branchStart, end: branchStart + branch.length, text: 'status = :status' },
      }],
    });
    const compiled = compileNamedParameters(sql, { rendering: { style: 'indexed', prefix: '$' } });
    const safeSort = buildPostgresSafeSortBindingMetadata(sql, { insertion: { status: 'ready', index: sql.indexOf('order by') }, sortable: {} });

    expect(compiled.parameterNames).toEqual(['tenant_id', 'status', 'limit']);
    expect(optional.optionalConditionCompression?.branches[0]?.presentReplacement.text).toBe('status = $2');
    expect(safeSort.safeSortInsertion).toEqual({ index: compiled.sql.indexOf('order by') });
  });
});
