import { describe, expect, test } from 'vitest';
import { createPostgresTestkitClient, PostgresTestkitClient } from '../src/index.js';

describe('@ashiba-ts/testkit-adapter-pg', () => {
  test('exposes the Postgres testkit adapter surface', () => {
    expect(typeof createPostgresTestkitClient).toBe('function');
    expect(typeof PostgresTestkitClient).toBe('function');
  });
});
