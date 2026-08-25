import { createPostgresPreparedQuerySource, preparePostgresQuery, type AshibaPostgresQuerySource } from '@ashiba-ts/driver-adapter-pg';
import type { Pool } from 'pg';
import { queries } from './generated/queries.js';
import type { AssignParams, AuditParams, GetParams, ListParams, Ticket } from './types.js';

type Query<P extends object> = AshibaPostgresQuerySource<P>;

const query = <P extends object>(entry: typeof queries[keyof typeof queries]): Query<P> => ({
  ...createPostgresPreparedQuerySource<P>(entry.sql, {
    sourceHash: entry.sourceHash,
    sql: entry.postgres.sql,
    orderedNames: entry.postgres.orderedNames,
  }),
});

const listQuery = query<ListParams>(queries.list);
const getQuery = query<GetParams>(queries.get);
const assignQuery = query<AssignParams>(queries.assign);
const auditQuery = query<AuditParams>(queries.audit);

const order = {
  priority: "case t.priority when 'urgent' then 1 when 'normal' then 2 when 'low' then 3 else 4 end",
  createdAt: 't.created_at',
  subject: 't.subject',
} as const;

export type Sort = { key: keyof typeof order; direction: 'asc' | 'desc' };

export function orderTickets(sql: string, sort: readonly Sort[] = []): string {
  if (sort.length > 3) throw new Error('At most three sort keys are allowed.');
  const seen = new Set<string>();
  const terms = sort.map(({ key, direction }) => {
    if (!(key in order)) throw new Error('Invalid sort key.');
    if (direction !== 'asc' && direction !== 'desc') throw new Error('Invalid sort direction.');
    if (seen.has(key)) throw new Error('Duplicate sort key.');
    seen.add(key);
    return `${order[key]} ${direction}`;
  });

  if (!sql.includes('order by t.id asc')) throw new Error('Expected stable ticket ordering is missing.');
  return sql.replace('order by t.id asc', `order by ${[...terms, 't.id asc'].join(', ')}`);
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
  const prepared = preparePostgresQuery(listQuery, params, { strictParameterNames: true });
  return (await pool.query<Ticket>(orderTickets(prepared.sql, input.sort), [...prepared.values])).rows;
}

export async function getTicket(pool: Pool, id: string): Promise<Ticket | undefined> {
  const prepared = preparePostgresQuery(getQuery, { id }, { strictParameterNames: true });
  return (await pool.query<Ticket>(prepared.sql, [...prepared.values])).rows[0];
}

export async function assignTicket(
  pool: Pool,
  input: { ticketId: string; assigneeId: string; actorId: string; note?: string },
): Promise<Ticket | undefined> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const assigned = preparePostgresQuery(
      assignQuery,
      { ticketId: input.ticketId, assigneeId: input.assigneeId },
      { strictParameterNames: true },
    );
    const ticket = (await client.query<Ticket>(assigned.sql, [...assigned.values])).rows[0];
    if (!ticket) throw new Error('Ticket not found.');

    const audit = preparePostgresQuery(
      auditQuery,
      { ticketId: input.ticketId, actorId: input.actorId, note: input.note ?? null },
      { strictParameterNames: true },
    );
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
