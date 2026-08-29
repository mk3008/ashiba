import { describe, expect, test } from 'vitest';
import {
  AshibaSortError,
  FeatureQueryCardinalityError,
  maskParams,
  normalizeError,
  queryMany,
  queryOne,
  queryOneOrNull,
  renderSafeOrderBy,
  type FeatureQueryExecutor,
  type FeatureQuerySource,
} from '../src/index.js';

describe('@ashiba-ts/driver-adapter-core', () => {
  test('masks params by default', () => {
    expect(maskParams([1, null, 'secret'])).toEqual(['<masked>', '<nullish>', '<masked>']);
  });

  test('can return unmasked params when policy allows it', () => {
    expect(maskParams([1, 'visible'], 'never')).toEqual([1, 'visible']);
  });

  test('renders safe order by from whitelisted profile', () => {
    const sql = renderSafeOrderBy(
      {
        createdAt: { sql: '"created_at"', defaultDirection: 'desc' },
        name: { sql: '"name"' },
      },
      [{ key: 'createdAt' }, { key: 'name', direction: 'asc' }],
    );

    expect(sql).toBe('order by "created_at" desc, "name" asc');
  });

  test('rejects unknown sort keys', () => {
    expect(() => renderSafeOrderBy({ name: { sql: '"name"' } }, [{ key: 'raw sql' }])).toThrow(AshibaSortError);
  });

  test('requires exact sort key matches from the whitelist', () => {
    const profile = { createdAt: { sql: '"created_at"' } };

    expect(renderSafeOrderBy(profile, [{ key: 'createdAt' }])).toBe('order by "created_at" asc');
    expect(() => renderSafeOrderBy(profile, [{ key: 'createdat' }])).toThrow(AshibaSortError);
    expect(() => renderSafeOrderBy(profile, [{ key: '"created_at"' }])).toThrow(AshibaSortError);
  });

  test('does not allow a direction that is absent from source-visible ORDER BY metadata', () => {
    const profile = {
      priority: {
        sql: 't.priority',
        defaultDirection: 'desc' as const,
        allowedDirections: ['desc'] as const,
      },
    };

    expect(renderSafeOrderBy(profile, [{ key: 'priority' }])).toBe('order by t.priority desc');
    expect(() => renderSafeOrderBy(profile, [{ key: 'priority', direction: 'asc' }]))
      .toThrow(AshibaSortError);
  });

  test('rejects duplicate keys so the finite sort surface cannot grow through repetition', () => {
    const profile = { name: { sql: 'u.name', allowedDirections: ['asc'] as const } };

    expect(() => renderSafeOrderBy(profile, [
      { key: 'name', direction: 'asc' },
      { key: 'name', direction: 'asc' },
    ])).toThrow(AshibaSortError);
  });

  test('rejects SQL-like sort input instead of rendering it', () => {
    const profile = { name: { sql: '"name"' } };

    expect(() => renderSafeOrderBy(profile, [{ key: 'name desc; drop table users;--' }]))
      .toThrow(AshibaSortError);
    expect(() => renderSafeOrderBy(profile, [{ key: 'name', direction: 'desc; drop table users;--' as 'desc' }]))
      .toThrow(AshibaSortError);
  });

  test('normalizes thrown errors', () => {
    const error = new AshibaSortError('ASHIBA_UNKNOWN_SORT_KEY', 'Nope');

    expect(normalizeError(error)).toEqual({
      name: 'AshibaSortError',
      message: 'Nope',
      code: 'ASHIBA_UNKNOWN_SORT_KEY',
      cause: 'The requested sort key is not present in the reviewed safe sort profile.',
      nextAction: 'Use one of the sortable keys recorded in the query model, or update the SQL and regenerate metadata.',
    });
  });

  test('provides feature query cardinality helpers without changing SQL meaning', async () => {
    const source = buildFeatureQuerySource<{ limit: number }, { id: string }>('users-list');
    const executor: FeatureQueryExecutor<typeof source> = {
      async query(query, params) {
        expect(query).toBe(source);
        expect(params).toEqual({ limit: 2 });
        return [{ id: '1' }, { id: '2' }];
      },
    };

    await expect(queryMany(executor, source, { limit: 2 }))
      .resolves.toEqual([{ id: '1' }, { id: '2' }]);
  });

  test('queryOne requires exactly one row', async () => {
    const source = buildFeatureQuerySource<{ [key: string]: never }, { id: string }>('user-detail');
    const oneRowExecutor: FeatureQueryExecutor<typeof source> = {
      async query() {
        return [{ id: '1' }];
      },
    };
    const emptyExecutor: FeatureQueryExecutor<typeof source> = {
      async query() {
        return [];
      },
    };
    const manyExecutor: FeatureQueryExecutor<typeof source> = {
      async query() {
        return [{ id: '1' }, { id: '2' }];
      },
    };

    await expect(queryOne(oneRowExecutor, source, {})).resolves.toEqual({ id: '1' });
    await expect(queryOne(emptyExecutor, source, {})).rejects.toMatchObject({
      name: 'FeatureQueryCardinalityError',
      code: 'ASHIBA_QUERY_EXPECTED_ONE_ROW',
      queryId: 'user-detail',
      rowCount: 0,
      causeText: 'The selected feature query cardinality helper received a row count outside its contract.',
      nextAction: 'Use queryMany for mutation workflows that need to handle zero rows, or use queryOne only when the SQL contract really guarantees exactly one row.',
    });
    await expect(queryOne(manyExecutor, source, {})).rejects.toBeInstanceOf(FeatureQueryCardinalityError);
  });

  test('queryOneOrNull allows no row but rejects multiple rows', async () => {
    const source = buildFeatureQuerySource<{ [key: string]: never }, { id: string }>('maybe-user');
    const emptyExecutor: FeatureQueryExecutor<typeof source> = {
      async query() {
        return [];
      },
    };
    const manyExecutor: FeatureQueryExecutor<typeof source> = {
      async query() {
        return [{ id: '1' }, { id: '2' }];
      },
    };

    await expect(queryOneOrNull(emptyExecutor, source, {})).resolves.toBeNull();
    await expect(queryOneOrNull(manyExecutor, source, {})).rejects.toMatchObject({
      code: 'ASHIBA_QUERY_EXPECTED_ZERO_OR_ONE_ROW',
      queryId: 'maybe-user',
      rowCount: 2,
      causeText: 'The selected feature query cardinality helper received a row count outside its contract.',
      nextAction: 'Use queryMany when multiple rows are valid, or tighten the SQL so queryOneOrNull can only receive zero or one row.',
    });
  });

  test('normalizes feature query cardinality errors with cause and next action', () => {
    const error = new FeatureQueryCardinalityError(
      'ASHIBA_QUERY_EXPECTED_ONE_ROW',
      buildFeatureQuerySource('user-insert'),
      0,
    );

    expect(normalizeError(error)).toEqual({
      name: 'FeatureQueryCardinalityError',
      message: 'user-insert query expected one row, but got 0.',
      code: 'ASHIBA_QUERY_EXPECTED_ONE_ROW',
      cause: 'The selected feature query cardinality helper received a row count outside its contract.',
      nextAction: 'Use queryMany for mutation workflows that need to handle zero rows, or use queryOne only when the SQL contract really guarantees exactly one row.',
    });
  });

});

function buildFeatureQuerySource<Params extends object = Record<string, unknown>, Row = unknown>(id: string): FeatureQuerySource<Params, Row> {
  return {
    id,
    path: `${id}.sql`,
    sqlPath: `${id}.sql`,
    sql: 'select 1',
    queryModel: {
      analysis: {
        astParse: 'ok',
        statementKind: 'select',
        rootQueryShape: 'simple-select',
        hasTopLevelOrderBy: false,
        sourceHash: 'sha256:test',
      },
    },
  };
}
