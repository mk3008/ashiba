import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import type { Pool, PoolClient } from 'pg';
import type { TicketDto } from '../contracts/ticket-dto.js';

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;
type TicketStatus = TicketDto['status'];
type Sort = 'id' | 'priority' | 'createdAt';
type Direction = 'asc' | 'desc';

export type ListInput = {
  status?: TicketStatus;
  assignee?: string | null;
  sort: Sort;
  direction: Direction;
  offset: number;
  limit: number;
};

export type CreateInput = {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata: Record<string, unknown>;
};

const ticketColumns = `
  id::text AS "id",
  title,
  status::text AS "status",
  assignee,
  priority,
  created_at AS "createdAt",
  metadata
`;

const listSqlBySort = new Map<string, ReturnType<typeof compileNamedParameters>>();
const sortTerms: Record<Sort, Record<Direction, string>> = {
  id: { asc: 'id ASC', desc: 'id DESC' },
  priority: { asc: 'priority ASC', desc: 'priority DESC' },
  createdAt: { asc: 'created_at ASC', desc: 'created_at DESC' },
};

for (const [sort, directions] of Object.entries(sortTerms) as [Sort, Record<Direction, string>][]) {
  for (const [direction, orderBy] of Object.entries(directions) as [Direction, string][]) {
    listSqlBySort.set(`${sort}:${direction}`, compileNamedParameters(`
      SELECT ${ticketColumns}
      FROM tickets
      WHERE (CAST(:status AS ticket_status) IS NULL OR status = CAST(:status AS ticket_status))
        AND (:assigneeFilterEnabled::boolean = false OR assignee IS NOT DISTINCT FROM :assignee::text)
      ORDER BY ${orderBy}, id ASC
      LIMIT :limit OFFSET :offset
    `));
  }
}

const getSql = compileNamedParameters(`
  SELECT ${ticketColumns}
  FROM tickets
  WHERE id = :id
`);

const createSql = compileNamedParameters(`
  INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
  VALUES (:title, CAST(:status AS ticket_status), :assignee, :priority, NOW(), CAST(:metadata AS jsonb))
  RETURNING ${ticketColumns}
`);

const assignSql = compileNamedParameters(`
  UPDATE tickets
  SET assignee = :assignee
  WHERE id = :id
  RETURNING id::text AS "id", assignee
`);

const auditSql = compileNamedParameters(`
  INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
  VALUES (:ticketId, 'assigned', :detail, NOW())
`);

function toTicket(row: Record<string, unknown>): TicketDto {
  const createdAt = row.createdAt;
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as TicketStatus,
    assignee: row.assignee == null ? null : String(row.assignee),
    priority: Number(row.priority),
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(String(createdAt)).toISOString(),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

async function run<Row extends Record<string, unknown>>(queryable: Queryable, statement: ReturnType<typeof compileNamedParameters>, params: Record<string, unknown>) {
  const bound = bindNamedParameters(statement, params);
  return queryable.query<Row>(bound.sql, [...bound.values]);
}

export class TicketDataAccess {
  constructor(private readonly pool: Pool) {}

  async list(input: ListInput): Promise<TicketDto[]> {
    const statement = listSqlBySort.get(`${input.sort}:${input.direction}`);
    if (!statement) throw new Error('reviewed sort must be selected before data access');
    const result = await run(this.pool, statement, {
      status: input.status ?? null,
      assigneeFilterEnabled: Object.hasOwn(input, 'assignee'),
      assignee: input.assignee ?? null,
      limit: input.limit,
      offset: input.offset,
    });
    return result.rows.map(toTicket);
  }

  async get(id: string): Promise<TicketDto | null> {
    const result = await run(this.pool, getSql, { id });
    return result.rows[0] ? toTicket(result.rows[0]) : null;
  }

  async create(input: CreateInput): Promise<TicketDto> {
    const result = await run(this.pool, createSql, {
      title: input.title,
      status: input.status,
      assignee: input.assignee,
      priority: input.priority,
      metadata: JSON.stringify(input.metadata),
    });
    return toTicket(result.rows[0]);
  }

  async assign(client: PoolClient, id: string, assignee: string | null): Promise<{ id: string; assignee: string | null } | null> {
    const update = await run(client, assignSql, { id, assignee });
    const row = update.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    await run(client, auditSql, { ticketId: id, detail: JSON.stringify({ assignee }) });
    return { id: String(row.id), assignee: row.assignee == null ? null : String(row.assignee) };
  }
}
