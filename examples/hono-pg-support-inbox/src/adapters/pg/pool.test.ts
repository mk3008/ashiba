import { describe, expect, test } from 'vitest';

import { createPgSqlClient } from './pool.js';

const source = {
  id: 'pool-test',
  sql: 'select :id::integer as id',
  binding: {
    style: 'indexed' as const,
    sql: 'select $1::integer as id',
    parameterNames: ['id'],
  },
};

describe('application-owned native pg logging boundary', () => {
  test('emits masked values by default and raw values only for an explicit local observer', async () => {
    const defaultEvents: Array<Record<string, unknown>> = [];
    const rawEvents: Array<Record<string, unknown>> = [];
    const queryable = {
      async query(sql: string, values: readonly unknown[]) {
        expect(sql).toBe('select $1::integer as id');
        expect(values).toEqual([7]);
        return { rows: [{ id: 7 }], rowCount: 1 };
      },
    };

    await createPgSqlClient(queryable, {
      observer: { emit: (event) => defaultEvents.push(event) },
    }).query(source as never, { id: 7 } as never);
    await createPgSqlClient(queryable, {
      includeUnmaskedParamsInEvents: true,
      observer: { emit: (event) => rawEvents.push(event) },
    }).query(source as never, { id: 7 } as never);

    expect(defaultEvents.at(-1)).toMatchObject({
      phase: 'end',
      maskedParams: ['<masked>'],
    });
    expect(defaultEvents.at(-1)).not.toHaveProperty('params');
    expect(rawEvents.at(-1)).toMatchObject({
      phase: 'end',
      params: [7],
      maskedParams: ['<masked>'],
    });
  });
});
