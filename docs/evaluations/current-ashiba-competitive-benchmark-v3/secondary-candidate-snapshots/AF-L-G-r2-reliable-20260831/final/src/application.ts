import { Pool, type PoolClient } from 'pg';

type TicketStatus = 'open' | 'pending' | 'closed';
type TicketSort = 'id' | 'priority' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface Runtime {
  connectionString: string;
  schema: string;
}

interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';
}

const SORT_TERMS: Record<TicketSort, Record<SortDirection, string>> = {
  id: { asc: 'id ASC', desc: 'id DESC' },
  priority: { asc: 'priority ASC', desc: 'priority DESC' },
  createdAt: { asc: 'created_at ASC', desc: 'created_at DESC' },
};

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function isStatus(value: unknown): value is TicketStatus {
  return value === 'open' || value === 'pending' || value === 'closed';
}

function isSort(value: unknown): value is TicketSort {
  return value === 'id' || value === 'priority' || value === 'createdAt';
}

function isDirection(value: unknown): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

function parsePositiveId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    throw applicationError('VALIDATION', `${name} must be a positive integer string`);
  }
  return value;
}

function mapTicket(row: Record<string, unknown>): Ticket {
  const created = row.createdAt;
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as TicketStatus,
    assignee: row.assignee === null ? null : String(row.assignee),
    priority: Number(row.priority),
    createdAt: created instanceof Date ? created.toISOString() : new Date(String(created)).toISOString(),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

const TICKET_COLUMNS = `
  id::text AS id,
  title,
  status::text AS status,
  assignee,
  priority,
  created_at AS "createdAt",
  metadata
`;

/** Candidate entrypoint for the ordinary layered application boundary. */
export function createApplication(runtime: Runtime) {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;

  function assertOpen(): void {
    if (closed) throw applicationError('APPLICATION_CLOSED', 'application is closed');
  }

  async function list(input: {
    status?: TicketStatus;
    assignee?: string | null;
    sort?: TicketSort;
    direction?: SortDirection;
    offset?: number;
    limit?: number;
  } = {}): Promise<Ticket[]> {
    assertOpen();
    if (input.status !== undefined && !isStatus(input.status)) throw applicationError('VALIDATION', 'unsupported status');
    const sort = input.sort ?? 'id';
    const direction = input.direction ?? 'asc';
    if (!isSort(sort) || !isDirection(direction)) throw applicationError('VALIDATION', 'unsupported sort');
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 100;
    if (!Number.isInteger(offset) || offset < 0 || offset > 10_000 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw applicationError('VALIDATION', 'invalid pagination');
    }
    const hasAssigneeFilter = Object.hasOwn(input, 'assignee');
    if (hasAssigneeFilter && input.assignee !== null && typeof input.assignee !== 'string') {
      throw applicationError('VALIDATION', 'invalid assignee filter');
    }
    const orderTerm = SORT_TERMS[sort][direction];
    const result = await pool.query<Record<string, unknown>>(
      `SELECT ${TICKET_COLUMNS}
       FROM tickets
       WHERE ($1::text IS NULL OR status::text = $1::text)
         AND (NOT $2::boolean OR assignee IS NOT DISTINCT FROM $3::text)
       ORDER BY ${orderTerm}, id ASC
       LIMIT $4::integer OFFSET $5::integer`,
      [input.status ?? null, hasAssigneeFilter, hasAssigneeFilter ? input.assignee ?? null : null, limit, offset],
    );
    return result.rows.map(mapTicket);
  }

  async function get(input: { id: string }): Promise<Ticket | null> {
    assertOpen();
    const id = parsePositiveId(input?.id, 'id');
    const result = await pool.query<Record<string, unknown>>(
      `SELECT ${TICKET_COLUMNS} FROM tickets WHERE id = $1::bigint`,
      [id],
    );
    return result.rows[0] ? mapTicket(result.rows[0]) : null;
  }

  async function create(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<Ticket> {
    assertOpen();
    if (!input || typeof input.title !== 'string' || !isStatus(input.status) || (input.assignee !== null && typeof input.assignee !== 'string') || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) {
      throw applicationError('VALIDATION', 'invalid ticket input');
    }
    const result = await pool.query<Record<string, unknown>>(
      `INSERT INTO tickets (title, status, assignee, priority, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       RETURNING ${TICKET_COLUMNS}`,
      [input.title, input.status, input.assignee, input.priority, JSON.stringify(input.metadata ?? {})],
    );
    return mapTicket(result.rows[0]);
  }

  async function assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
    assertOpen();
    const id = parsePositiveId(input?.id, 'id');
    if (input.assignee !== null && typeof input.assignee !== 'string') throw applicationError('VALIDATION', 'invalid assignee');
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const updated = await client.query<{ id: string; assignee: string | null }>(
        'UPDATE tickets SET assignee = $2 WHERE id = $1::bigint RETURNING id::text AS id, assignee',
        [id, input.assignee],
      );
      if (!updated.rows[0]) throw applicationError('NOT_FOUND', 'ticket not found');
      await client.query(
        'INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES ($1::bigint, $2, $3, NOW())',
        [id, 'assigned', input.assignee ?? 'unassigned'],
      );
      await client.query('COMMIT');
      return updated.rows[0];
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client?.release();
    }
  }

  return {
    list,
    get,
    create,
    assign,
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
