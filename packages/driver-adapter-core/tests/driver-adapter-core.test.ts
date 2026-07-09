import { describe, expect, test } from 'vitest';
import {
  AshibaSortError,
  FeatureQueryCardinalityError,
  AshibaRetryPolicyError,
  maskParams,
  normalizeError,
  queryMany,
  queryOne,
  queryOneOrNull,
  renderSafeOrderBy,
  withAshibaRetry,
  type AshibaRetryEvent,
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
    const source = buildFeatureQuerySource('users-list');
    const executor: FeatureQueryExecutor = {
      async query<T = unknown>(query: FeatureQuerySource, params: Record<string, unknown>): Promise<T[]> {
        expect(query).toBe(source);
        expect(params).toEqual({ limit: 2 });
        return [{ id: '1' }, { id: '2' }] as T[];
      },
    };

    await expect(queryMany<{ id: string }>(executor, source, { limit: 2 }))
      .resolves.toEqual([{ id: '1' }, { id: '2' }]);
  });

  test('queryOne requires exactly one row', async () => {
    const source = buildFeatureQuerySource('user-detail');
    const oneRowExecutor: FeatureQueryExecutor = {
      async query<T = unknown>(): Promise<T[]> {
        return [{ id: '1' }] as T[];
      },
    };
    const emptyExecutor: FeatureQueryExecutor = {
      async query<T = unknown>(): Promise<T[]> {
        return [] as T[];
      },
    };
    const manyExecutor: FeatureQueryExecutor = {
      async query<T = unknown>(): Promise<T[]> {
        return [{ id: '1' }, { id: '2' }] as T[];
      },
    };

    await expect(queryOne<{ id: string }>(oneRowExecutor, source, {})).resolves.toEqual({ id: '1' });
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
    const source = buildFeatureQuerySource('maybe-user');
    const emptyExecutor: FeatureQueryExecutor = {
      async query<T = unknown>(): Promise<T[]> {
        return [] as T[];
      },
    };
    const manyExecutor: FeatureQueryExecutor = {
      async query<T = unknown>(): Promise<T[]> {
        return [{ id: '1' }, { id: '2' }] as T[];
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

  test('runs caller-owned work under an explicit retry policy', async () => {
    const events: AshibaRetryEvent[] = [];
    const attempts: number[] = [];
    const result = await withAshibaRetry(
      {
        maxAttempts: 3,
        retryOn(error) {
          return {
            retry: error instanceof Error && error.message === 'transient',
            reason: 'test-transient',
          };
        },
        observer: {
          emit(event) {
            events.push(event);
          },
        },
      },
      async ({ attempt }) => {
        attempts.push(attempt);
        if (attempt < 2) {
          throw new Error('transient');
        }
        return 'ok';
      },
    );

    expect(result).toBe('ok');
    expect(attempts).toEqual([1, 2]);
    expect(events).toEqual([
      expect.objectContaining({
        phase: 'retry',
        attempt: 1,
        maxAttempts: 3,
        reason: 'test-transient',
        error: { name: 'Error', message: 'transient' },
      }),
    ]);
  });

  test('does not retry when the explicit policy rejects the error', async () => {
    const events: AshibaRetryEvent[] = [];
    const fatal = new Error('fatal');

    await expect(withAshibaRetry(
      {
        maxAttempts: 3,
        retryOn: () => false,
        observer: {
          emit(event) {
            events.push(event);
          },
        },
      },
      async () => {
        throw fatal;
      },
    )).rejects.toBe(fatal);

    expect(events).toEqual([
      expect.objectContaining({
        phase: 'give-up',
        attempt: 1,
        maxAttempts: 3,
        error: { name: 'Error', message: 'fatal' },
      }),
    ]);
  });

  test('stops retrying at maxAttempts and rethrows the original error', async () => {
    const events: AshibaRetryEvent[] = [];
    const errors = [new Error('transient-1'), new Error('transient-2')];
    let callCount = 0;

    await expect(withAshibaRetry(
      {
        maxAttempts: 2,
        retryOn: () => true,
        delayMs: ({ attempt }) => attempt,
        observer: {
          emit(event) {
            events.push(event);
          },
        },
      },
      async () => {
        const error = errors[callCount] ?? new Error('unexpected');
        callCount += 1;
        throw error;
      },
    )).rejects.toBe(errors[1]);

    expect(callCount).toBe(2);
    expect(events).toEqual([
      expect.objectContaining({ phase: 'retry', attempt: 1, delayMs: 1 }),
      expect.objectContaining({ phase: 'give-up', attempt: 2 }),
    ]);
  });

  test('decision delay overrides policy delay and invalid delays are clamped', async () => {
    const events: AshibaRetryEvent[] = [];
    let callCount = 0;

    await expect(withAshibaRetry(
      {
        maxAttempts: 2,
        retryOn() {
          return { retry: true, delayMs: Number.POSITIVE_INFINITY };
        },
        delayMs: 99,
        observer: {
          emit(event) {
            events.push(event);
          },
        },
      },
      async () => {
        callCount += 1;
        if (callCount === 1) {
          throw new Error('transient');
        }
        return 'ok';
      },
    )).resolves.toBe('ok');

    expect(events).toEqual([
      expect.objectContaining({ phase: 'retry', attempt: 1, delayMs: 0 }),
    ]);

    events.length = 0;
    callCount = 0;
    await expect(withAshibaRetry(
      {
        maxAttempts: 2,
        retryOn: () => true,
        delayMs: () => -1,
        observer: {
          emit(event) {
            events.push(event);
          },
        },
      },
      async () => {
        callCount += 1;
        if (callCount === 1) {
          throw new Error('transient');
        }
        return 'ok';
      },
    )).resolves.toBe('ok');

    expect(events).toEqual([
      expect.objectContaining({ phase: 'retry', attempt: 1, delayMs: 0 }),
    ]);
  });

  test('normalizes non-error throws in retry events', async () => {
    const events: AshibaRetryEvent[] = [];

    await expect(withAshibaRetry(
      {
        maxAttempts: 2,
        retryOn: () => false,
        observer: {
          emit(event) {
            events.push(event);
          },
        },
      },
      async () => {
        throw 'string error';
      },
    )).rejects.toBe('string error');

    expect(events).toEqual([
      expect.objectContaining({
        phase: 'give-up',
        error: { name: 'Error', message: 'string error' },
      }),
    ]);
  });

  test('allows omitted observer and ignores observer failures', async () => {
    const original = new Error('original');

    await expect(withAshibaRetry(
      {
        maxAttempts: 1,
        retryOn: () => false,
      },
      async () => {
        throw original;
      },
    )).rejects.toBe(original);

    await expect(withAshibaRetry(
      {
        maxAttempts: 1,
        retryOn: () => false,
        observer: {
          emit() {
            throw new Error('logger failed');
          },
        },
      },
      async () => {
        throw original;
      },
    )).rejects.toBe(original);
  });

  test('surfaces retryOn failures without dropping the operation failure', async () => {
    const operationError = new Error('operation failed');
    const policyError = new Error('classifier failed');
    const events: AshibaRetryEvent[] = [];

    await expect(withAshibaRetry(
      {
        maxAttempts: 2,
        retryOn() {
          throw policyError;
        },
        observer: {
          emit(event) {
            events.push(event);
          },
        },
      },
      async () => {
        throw operationError;
      },
    )).rejects.toMatchObject({
      name: 'AshibaRetryPolicyError',
      code: 'ASHIBA_RETRY_POLICY_INVALID',
      cause: policyError,
      details: {
        operationError: { name: 'Error', message: 'operation failed' },
        policyError: { name: 'Error', message: 'classifier failed' },
      },
    });

    expect(events).toEqual([
      expect.objectContaining({
        phase: 'give-up',
        reason: 'retryOn threw while classifying the operation failure',
        error: { name: 'Error', message: 'operation failed' },
      }),
    ]);
  });

  test('requires a visible retry policy', async () => {
    await expect(withAshibaRetry(
      {
        maxAttempts: 0,
        retryOn: () => true,
      },
      async () => 'never',
    )).rejects.toBeInstanceOf(AshibaRetryPolicyError);
  });
});

function buildFeatureQuerySource(id: string): FeatureQuerySource {
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
