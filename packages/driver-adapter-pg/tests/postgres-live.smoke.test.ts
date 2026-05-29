import { describe, expect, test } from 'vitest';
import pg from 'pg';
import { createHash } from 'node:crypto';
import { createPostgresAdapter } from '../src/index.js';
import type { AshibaSqlExecutionEvent } from '@ashiba-ts/driver-adapter-core';

const databaseUrl =
  process.env.ASHIBA_TEST_DATABASE_URL ??
  process.env.ASHIBA_POSTGRES_DATABASE_URL ??
  process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('@ashiba-ts/driver-adapter-pg live PostgreSQL smoke', () => {
  test('executes named parameters and observer events through pg.Client', async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    const events: AshibaSqlExecutionEvent[] = [];
    await client.connect();
    try {
      const adapter = createPostgresAdapter(client, {
        observer: {
          emit(event) {
            events.push(event);
          },
        },
      });

      const sourceSql = 'select :value::int as value';
      const result = await adapter.execute<{ value: number }>(
        {
          sql: sourceSql,
          sqlPath: 'smoke/driver-live-smoke.sql',
          queryModel: {
            analysis: {
              astParse: 'ok',
              statementKind: 'select',
              hasTopLevelOrderBy: false,
              sourceHash: hashSql(sourceSql),
            },
            bindings: {
              postgres: {
                sourceHash: hashSql(sourceSql),
                sql: 'select $1::int as value',
                orderedNames: ['value'],
              },
            },
          },
        },
        { value: 7 },
        {
          metadata: { queryId: 'driver-live-smoke' },
        },
      );

      expect(result.rows).toEqual([{ value: 7 }]);
      expect(events.map((event) => event.phase)).toEqual(['start', 'end']);
      expect(events[0]?.compiledSql).toContain('$1::int');
      expect(events[0]?.maskedParams).toEqual(['<masked>']);
    } finally {
      await client.end();
    }
  });
});

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}
