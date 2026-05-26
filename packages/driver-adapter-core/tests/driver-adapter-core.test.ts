import { describe, expect, test } from 'vitest';
import { AshibaSortError, maskParams, normalizeError, renderSafeOrderBy } from '../src/index.js';

describe('@ashiba/driver-adapter-core', () => {
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
});
