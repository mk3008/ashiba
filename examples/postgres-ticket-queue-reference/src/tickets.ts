import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import type { Pool } from 'pg';
import { queries } from './queries.js';
import type { AssignParams, AuditParams, GetParams, ListParams, Ticket } from './types.js';

const order = {
  priority: "case t.priority when 'urgent' then 1 when 'normal' then 2 when 'low' then 3 else 4 end",
  createdAt: 't.created_at',
  subject: 't.subject',
} as const;

export type Sort = { key: keyof typeof order; direction: 'asc' | 'desc' };

export function ticketOrderBy(sort: readonly Sort[] = []): string {
  if (sort.length > 3) throw new Error('At most three sort keys are allowed.');
  const seen = new Set<string>();
  const terms = sort.map(({ key, direction }) => {
    // Business-owned finite allowlist: inherited keys are never valid input.
    if (!Object.hasOwn(order, key)) throw new Error('Invalid sort key.');
    if (direction !== 'asc' && direction !== 'desc') throw new Error('Invalid sort direction.');
    if (seen.has(key)) throw new Error('Duplicate sort key.');
    seen.add(key);
    return `${order[key]} ${direction}`;
  });

  return `order by ${[...terms, 't.id asc'].join(', ')}`;
}

function withTicketOrder(sort: readonly Sort[] = []) {
  const statement = queries.list;
  const anchor = 'order by t.id asc';
  if (!statement.sql.includes(anchor)) throw new Error('Expected stable ticket ordering is missing.');
  return { ...statement, sql: statement.sql.replace(anchor, ticketOrderBy(sort)) };
}

export async function listTickets(
  pool: Pool,
  input: {
    status?: string;
    customerId?: string;
    assignee?: undefined | null | string;
    limit?: number;
    offset?: number;
    sort?: Sort[];
  } = {},
): Promise<Ticket[]> {
  const params: ListParams = {
    status: input.status ?? null,
    customerId: input.customerId ?? null,
    assigneeMode: input.assignee === undefined ? 'any' : input.assignee === null ? 'unassigned' : 'assigned',
    assigneeId: input.assignee ?? null,
    limit: input.limit ?? 50,
    offset: input.offset ?? 0,
  };
  const prepared = bindNamedParameters(withTicketOrder(input.sort), params);
  return (await pool.query<Ticket>(prepared.sql, [...prepared.values])).rows;
}

export async function getTicket(pool: Pool, id: string): Promise<Ticket | undefined> {
  const prepared = bindNamedParameters(queries.get, { id });
  return (await pool.query<Ticket>(prepared.sql, [...prepared.values])).rows[0];
}

export async function assignTicket(
  pool: Pool,
  input: { ticketId: string; assigneeId: string; actorId: string; note?: string },
): Promise<Ticket> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const assigned = bindNamedParameters(queries.assign, { ticketId: input.ticketId, assigneeId: input.assigneeId });
    const ticket = (await client.query<Ticket>(assigned.sql, [...assigned.values])).rows[0];
    if (!ticket) throw new Error('Ticket not found.');

    const audit = bindNamedParameters(queries.audit, {
      ticketId: input.ticketId,
      actorId: input.actorId,
      note: input.note ?? null,
    });
    await client.query(audit.sql, [...audit.values]);
    await client.query('COMMIT');
    return ticket;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
