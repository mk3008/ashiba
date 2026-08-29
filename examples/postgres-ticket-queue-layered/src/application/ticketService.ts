import type { TransactionPool } from '../access/pgTypes.js';
import type { ReviewedSortOrder, TicketAccess, TicketRow } from '../access/ticketAccess.js';

export type Ticket = {
  id: string;
  subject: string;
  status: string;
  assigneeId: string | null;
  createdAt: Date;
  auditCount: number;
  latestEventKind: string | null;
  latestEventAt: Date | null;
};

export type ListInput = {
  status?: string | null;
  assigneeId?: string | null;
  sortField?: 'createdAt' | 'subject';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

const REVIEWED_SORT_ORDER: Record<'createdAt' | 'subject', Record<'asc' | 'desc', ReviewedSortOrder>> = {
  createdAt: {
    asc: 't.created_at ASC, t.id ASC',
    desc: 't.created_at DESC, t.id ASC',
  },
  subject: {
    asc: 't.subject ASC, t.id ASC',
    desc: 't.subject DESC, t.id ASC',
  },
};

export const MAX_PAGE_SIZE = 100;

function mapTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    subject: row.subject,
    status: row.status,
    assigneeId: row.assignee_id,
    createdAt: row.created_at,
    auditCount: row.audit_count,
    latestEventKind: row.latest_event_kind,
    latestEventAt: row.latest_event_at,
  };
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
  const actual = value ?? fallback;
  if (!Number.isInteger(actual) || actual < 0) throw new Error(`${name} must be a non-negative integer`);
  return actual;
}

export class TicketService {
  constructor(private readonly pool: TransactionPool, private readonly access: TicketAccess) {}

  async list(input: ListInput = {}): Promise<Ticket[]> {
    const sortField = input.sortField ?? 'createdAt';
    const sortDirection = input.sortDirection ?? 'asc';
    if (sortField !== 'createdAt' && sortField !== 'subject') throw new Error('unsupported sort field');
    if (sortDirection !== 'asc' && sortDirection !== 'desc') throw new Error('unsupported sort direction');
    const limit = positiveInteger(input.limit, 50, 'limit');
    if (limit > MAX_PAGE_SIZE) throw new Error(`limit must be at most ${MAX_PAGE_SIZE}`);
    const rows = await this.access.list(this.pool, {
      status: input.status ?? null,
      assigneeId: input.assigneeId ?? null,
      limit,
      offset: positiveInteger(input.offset, 0, 'offset'),
    }, REVIEWED_SORT_ORDER[sortField][sortDirection]);
    return rows.map(mapTicket);
  }

  async get(ticketId: string): Promise<Ticket | null> {
    const row = await this.access.get(this.pool, ticketId);
    return row ? mapTicket(row) : null;
  }

  async assign(ticketId: string, assigneeId: string | null): Promise<Ticket | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const row = await this.access.assign(client, ticketId, assigneeId);
      if (!row) {
        await client.query('ROLLBACK');
        return null;
      }
      await this.access.addEvent(client, ticketId, 'assigned');
      const refreshed = await this.access.get(client, ticketId);
      if (!refreshed) throw new Error('assigned ticket disappeared before commit');
      await client.query('COMMIT');
      return mapTicket(refreshed);
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original failure */ }
      throw error;
    } finally {
      client.release();
    }
  }
}
