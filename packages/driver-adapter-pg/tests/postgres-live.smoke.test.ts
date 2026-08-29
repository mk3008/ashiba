import { Client } from 'pg';
import { describe, expect, test } from 'vitest';
import { preparePostgresQuery } from '../src/index.js';

const databaseUrl = process.env.ASHIBA_TEST_DATABASE_URL ?? process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('@ashiba-ts/driver-adapter-pg native pg live preparation', () => {
  test('prepares SQL and lets the application-owned pg client execute it', async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const canonical = 'select :value::int as value';
      const hash = await import('node:crypto').then(({ createHash }) => `sha256:${createHash('sha256').update(canonical).digest('hex')}`);
      const prepared = preparePostgresQuery({
        sql: canonical,
        queryModel: {
          analysis: { astParse: 'ok', statementKind: 'select', hasTopLevelOrderBy: false, sourceHash: hash },
          bindings: { postgres: { style: 'indexed', sql: 'select $1::int as value', parameterNames: ['value'], sourceHash: hash } },
        },
      }, { value: 7 });
      const result = await client.query(prepared.sql, prepared.values);
      expect(result.rows).toEqual([{ value: 7 }]);
    } finally {
      await client.end();
    }
  });
});
