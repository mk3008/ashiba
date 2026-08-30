import { describe, expect, it } from 'vitest';
import { bindNamedParameters, NamedParameterError } from '@ashiba-ts/named-parameters';
import { queryBindings } from '../src/tickets/sql/bindings.js';
import { createTicketApplication, type DbClient } from '../src/tickets/application/tickets.js';

type FakeResult = { rows: any[] };

class FakeClient implements DbClient {
  readonly calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
  released = false;

  async query<T>(sql: string, values?: readonly unknown[]): Promise<FakeResult & { rows: T[] }> {
    this.calls.push({ sql, values });
    if (sql.startsWith('update tickets')) {
      return { rows: [{ id: 7, subject: 'A ticket', status: 'open', assigneeId: 12, createdAt: new Date(), auditCount: 0 }] } as FakeResult & { rows: T[] };
    }
    return { rows: [] } as FakeResult & { rows: T[] };
  }

  release(): void { this.released = true; }
}

class FakePool {
  readonly client = new FakeClient();
  readonly calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
  async query<T>(sql: string, values?: readonly unknown[]): Promise<{ rows: T[] }> {
    this.calls.push({ sql, values });
    return { rows: [] };
  }
  async connect(): Promise<FakeClient> { return this.client; }
  async end(): Promise<void> { /* no-op */ }
}

describe('ticket slice', () => {
  it('rejects missing and unused binding names', () => {
    expect(() => bindNamedParameters(queryBindings.get, {})).toThrowError(NamedParameterError);
    expect(() => bindNamedParameters(queryBindings.get, { ticketId: 7, extra: true })).toThrowError(NamedParameterError);
  });

  it('binds a hostile SQL-looking status as a value', async () => {
    const pool = new FakePool();
    const app = createTicketApplication({ pool });
    const hostile = "open' OR 1=1 --";
    await app.list({ status: hostile, limit: 10, offset: 0 });
    expect(pool.calls[0]?.sql).not.toContain(hostile);
    expect(pool.calls[0]?.values).toContain(hostile);
  });

  it('rolls back assignment when audit insertion fails', async () => {
    const pool = new FakePool();
    const app = createTicketApplication({ pool, injectAuditFailure: true });
    await expect(app.assign(7, 12)).rejects.toThrow('injected audit failure');
    expect(pool.client.calls.map((call) => call.sql)).toEqual([
      'begin',
      expect.stringContaining('update tickets'),
      'rollback',
    ]);
    expect(pool.client.calls.some((call) => call.sql === 'commit')).toBe(false);
    expect(pool.client.released).toBe(true);
  });
});
