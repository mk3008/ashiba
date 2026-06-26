import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';

import { fromPg } from '../../../src/adapters/pg/sql-client.js';
import type { FeatureQuerySource } from '../../../src/features/_shared/featureQueryExecutor.js';

describe('fromPg', () => {
  test('compiles named parameters to node-postgres placeholders', async () => {
    const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
    const client = fromPg({
      async query(text, values) {
        calls.push({ text, values });
        return { rows: [{ destination_definition_id: '1' }] };
      },
    });

    const sql =
      'select * from transfer_destination_definition where destination_definition_name = any(:names) and is_enabled = :enabled';
    const sourceHash = `sha256:${createHash('sha256').update(sql).digest('hex')}`;
    const query: FeatureQuerySource = {
      id: 'resolve-transfer-destination-definitions',
      path: 'resolve-transfer-destination-definitions.sql',
      sqlPath: 'resolve-transfer-destination-definitions.sql',
      sql,
      queryModel: {
        analysis: {
          astParse: 'ok',
          statementKind: 'select',
          rootQueryShape: 'simple-select',
          hasTopLevelOrderBy: false,
          sourceHash,
        },
        bindings: {
          postgres: {
            sourceHash,
            sql: 'select * from transfer_destination_definition where destination_definition_name = any($1) and is_enabled = $2',
            orderedNames: ['names', 'enabled'],
          },
        },
      },
    };

    const rows = await client.query<{ destination_definition_id: string }>(query, {
      names: ['journal', 'ledger'],
      enabled: true,
    });

    expect(rows).toEqual([{ destination_definition_id: '1' }]);
    expect(calls).toEqual([
      {
        text: 'select * from transfer_destination_definition where destination_definition_name = any($1) and is_enabled = $2',
        values: [['journal', 'ledger'], true],
      },
    ]);
  });
});
