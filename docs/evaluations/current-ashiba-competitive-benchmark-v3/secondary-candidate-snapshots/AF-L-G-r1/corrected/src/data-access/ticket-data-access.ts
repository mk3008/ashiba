import type { Pool, PoolClient } from 'pg';
import type { CreateTicketInput, ListTicketsInput, TicketDto } from '../contracts/ticket-dto.js';

/** Data-access seam. Canonical SQL/query code remains in this ordinary layer. */
export const ticketDataAccessBoundary = 'layered';

type Queryable = Pool | PoolClient;

interface TicketRow {
  id: string;
  title: string;
  status: TicketDto['status'];
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: unknown;
}

const TICKET_COLUMNS = `
  id::text AS id,
  title,
  status::text AS status,
  assignee,
  priority,
  created_at,
  metadata
`;

function toTicket(row: TicketRow): TicketDto {
  const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: new Date(row.created_at).toISOString(),
    metadata: JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>,
  };
}

export class TicketDataAccess {
  public async list(pool: Queryable, input: Required<Pick<ListTicketsInput, 'sort' | 'direction' | 'offset' | 'limit'>> & Pick<ListTicketsInput, 'status' | 'assignee'>): Promise<TicketDto[]> {
    const filters: string[] = [];
    const values: Array<string | number> = [];

    if (input.status !== undefined) {
      values.push(input.status);
      filters.push(`status = $${values.length}`);
    }
    if (input.assignee !== undefined) {
      if (input.assignee === null) {
        filters.push('assignee IS NULL');
      } else {
        values.push(input.assignee);
        filters.push(`assignee = $${values.length}`);
      }
    }

    const sortColumns = { id: 'id', priority: 'priority', createdAt: 'created_at' } as const;
    const directions = { asc: 'ASC', desc: 'DESC' } as const;
    const where = filters.length === 0 ? '' : `WHERE ${filters.join(' AND ')}`;
    values.push(input.limit, input.offset);
    const sql = `
      SELECT ${TICKET_COLUMNS}
      FROM tickets
      ${where}
      ORDER BY ${sortColumns[input.sort]} ${directions[input.direction]}, id ASC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
    const result = await pool.query<TicketRow>(sql, values);
    return result.rows.map(toTicket);
  }

  public async get(pool: Queryable, id: string): Promise<TicketDto | null> {
    const result = await pool.query<TicketRow>(`SELECT ${TICKET_COLUMNS} FROM tickets WHERE id = $1`, [id]);
    return result.rows[0] === undefined ? null : toTicket(result.rows[0]);
  }

  public async create(pool: Queryable, input: CreateTicketInput): Promise<TicketDto> {
    const result = await pool.query<TicketRow>(
      `INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5::jsonb)
       RETURNING ${TICKET_COLUMNS}`,
      [input.title, input.status, input.assignee, input.priority, JSON.stringify(input.metadata ?? {})],
    );
    return toTicket(result.rows[0]);
  }

  public async assign(client: PoolClient, id: string, assignee: string | null): Promise<{ id: string; assignee: string | null } | null> {
    const updated = await client.query<{ id: string; assignee: string | null }>(
      'UPDATE tickets SET assignee = $2 WHERE id = $1 RETURNING id::text AS id, assignee',
      [id, assignee],
    );
    const ticket = updated.rows[0];
    if (ticket === undefined) {
      return null;
    }
    await client.query(
      'INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [id, 'assign', JSON.stringify({ assignee })],
    );
    return ticket;
  }
}
