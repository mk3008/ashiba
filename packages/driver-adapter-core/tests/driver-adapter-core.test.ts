import { describe, expect, test } from 'vitest';
import { AshibaSortError, renderSafeOrderBy } from '../src/index.js';

describe('@ashiba-ts/driver-adapter-core', () => {
  test('renders reviewed safe sort SQL only', () => {
    expect(renderSafeOrderBy(
      { createdAt: { sql: '"created_at"', defaultDirection: 'desc' } },
      [{ key: 'createdAt' }],
    )).toBe('order by "created_at" desc');
  });

  test('rejects unknown, duplicate, and SQL-like sort input', () => {
    const profile = { name: { sql: 'u.name', allowedDirections: ['asc'] as const } };
    expect(() => renderSafeOrderBy(profile, [{ key: 'raw sql' }])).toThrow(AshibaSortError);
    expect(() => renderSafeOrderBy(profile, [{ key: 'name' }, { key: 'name' }])).toThrow(AshibaSortError);
    expect(() => renderSafeOrderBy(profile, [{ key: 'name desc; drop table users;--' }])).toThrow(AshibaSortError);
  });
});
