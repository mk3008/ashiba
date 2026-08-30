import postgres from '@prisma/orm-postgres/runtime';
import contractJson from '../prisma/contract.json' with { type: 'json' };

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface TicketRow {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface TicketRuntime {
  connectionString: string;
}

type PrismaScope = {
  query(plan: unknown): Promise<unknown[]>;
  execute(plan: unknown): Promise<unknown>;
};

const sortToken: Record<TicketSort, number> = { id: 1, priority: 2, createdAt: 3 };

function ensureInteger(value: unknown, min: number, max: number, label: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw validation(`${label} is out of range`);
  return value as number;
}

function validation(message: string): Error & { code: 'VALIDATION' } {
  return Object.assign(new Error(message), { code: 'VALIDATION' as const });
}

function rowSpec(db: any) {
  const columns = db.sql.tickets.columns;
  return {
    id: columns.id,
    title: columns.title,
    status: columns.status,
    assignee: columns.assignee,
    priority: columns.priority,
    createdAt: columns.createdAt,
    metadata: columns.metadata,
  };
}

function mapTicket(row: any): TicketRow {
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as TicketStatus,
    assignee: row.assignee === null ? null : String(row.assignee),
    priority: Number(row.priority),
    createdAt: new Date(row.createdAt).toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

export function createTicketQueries(runtime: TicketRuntime) {
  const db: any = postgres({ contractJson, url: runtime.connectionString, verifyMarker: false });
  const specs = rowSpec(db);

  const query = async (scope: PrismaScope, plan: unknown): Promise<any[]> => scope.query(plan) as Promise<any[]>;

  const list = async (input: {
    status?: TicketStatus;
    assignee?: string | null;
    sort?: TicketSort;
    direction?: SortDirection;
    offset?: number;
    limit?: number;
  } = {}): Promise<TicketRow[]> => {
    const status = input.status;
    if (status !== undefined && !['open', 'pending', 'closed'].includes(status)) throw validation('unsupported status');
    const sort = input.sort ?? 'id';
    const direction = input.direction ?? 'asc';
    if (!(sort in sortToken) || !['asc', 'desc'].includes(direction)) throw validation('unsupported sort');
    const offset = ensureInteger(input.offset ?? 0, 0, 10_000, 'offset');
    const limit = ensureInteger(input.limit ?? 100, 1, 100, 'limit');
    const hasStatus = status !== undefined;
    const safeStatus = status ?? 'open';
    const assigneeMode = input.assignee === undefined ? 0 : input.assignee === null ? 1 : 2;
    const safeAssignee = typeof input.assignee === 'string' ? input.assignee : '';
    const token = sortToken[sort];
    const order = direction === 'asc'
      ? db.raw.sql`
          SELECT id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata
          FROM tickets
          WHERE (${hasStatus} = false OR status = ${safeStatus}::ticket_status)
            AND (${assigneeMode} = 0 OR (${assigneeMode} = 1 AND assignee IS NULL) OR (${assigneeMode} = 2 AND assignee = ${safeAssignee}))
          ORDER BY
            CASE WHEN ${token} = 1 THEN id END ASC,
            CASE WHEN ${token} = 2 THEN priority END ASC,
            CASE WHEN ${token} = 3 THEN created_at END ASC,
            id ASC
          OFFSET ${offset} LIMIT ${limit}
        `.returnsRow(specs).build()
      : db.raw.sql`
          SELECT id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata
          FROM tickets
          WHERE (${hasStatus} = false OR status = ${safeStatus}::ticket_status)
            AND (${assigneeMode} = 0 OR (${assigneeMode} = 1 AND assignee IS NULL) OR (${assigneeMode} = 2 AND assignee = ${safeAssignee}))
          ORDER BY
            CASE WHEN ${token} = 1 THEN id END DESC,
            CASE WHEN ${token} = 2 THEN priority END DESC,
            CASE WHEN ${token} = 3 THEN created_at END DESC,
            id ASC
          OFFSET ${offset} LIMIT ${limit}
        `.returnsRow(specs).build();
    return (await query(db.runtime() as PrismaScope, order)).map(mapTicket);
  };

  const get = async ({ id }: { id: string }): Promise<TicketRow | null> => {
    if (!/^\d+$/.test(id) || BigInt(id) <= 0n) throw validation('id must be positive');
    const plan = db.raw.sql`
      SELECT id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata
      FROM tickets WHERE id = ${id}::bigint
    `.returnsRow(specs).build();
    const rows = await query(db.runtime() as PrismaScope, plan);
    return rows[0] ? mapTicket(rows[0]) : null;
  };

  const create = async (input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<TicketRow> => {
    if (!input.title || !['open', 'pending', 'closed'].includes(input.status)) throw validation('invalid ticket');
    ensureInteger(input.priority, 1, 5, 'priority');
    const metadata = JSON.stringify(input.metadata ?? {});
    const plan = input.assignee === null
      ? db.raw.sql`
          INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
          VALUES (${input.title}, ${input.status}::ticket_status, NULL, ${input.priority}, now(), ${metadata}::jsonb)
          RETURNING id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata
        `.returnsRow(specs).build()
      : db.raw.sql`
          INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
          VALUES (${input.title}, ${input.status}::ticket_status, ${input.assignee}, ${input.priority}, now(), ${metadata}::jsonb)
          RETURNING id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata
        `.returnsRow(specs).build();
    const rows = await query(db.runtime() as PrismaScope, plan);
    return mapTicket(rows[0]);
  };

  const assign = async ({ id, assignee }: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> => {
    if (!/^\d+$/.test(id) || BigInt(id) <= 0n) throw validation('id must be positive');
    return db.transaction(async (tx: PrismaScope) => {
      const update = assignee === null
        ? db.raw.sql`UPDATE tickets SET assignee = NULL WHERE id = ${id}::bigint RETURNING id, assignee`.returnsRow({ id: specs.id, assignee: specs.assignee }).build()
        : db.raw.sql`UPDATE tickets SET assignee = ${assignee} WHERE id = ${id}::bigint RETURNING id, assignee`.returnsRow({ id: specs.id, assignee: specs.assignee }).build();
      const rows = await query(tx, update);
      if (!rows[0]) throw Object.assign(new Error('ticket not found'), { code: 'NOT_FOUND' as const });
      const audit = db.raw.sql`INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES (${id}::bigint, 'assigned', ${assignee ?? 'unassigned'}, now())`.affectedCount().build();
      await tx.execute(audit);
      return { id: String(rows[0].id), assignee: rows[0].assignee === null ? null : String(rows[0].assignee) };
    });
  };

  return { list, get, create, assign, close: () => db.close() };
}
