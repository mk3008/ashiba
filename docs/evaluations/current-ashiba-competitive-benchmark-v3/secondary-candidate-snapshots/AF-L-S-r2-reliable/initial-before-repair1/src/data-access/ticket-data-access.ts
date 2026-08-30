import type { Pool, PoolClient } from 'pg';
import {
  assignTicket,
  createTicket,
  getTicket,
  insertTicketAudit,
  listTicketsByCreatedAtAsc,
  listTicketsByCreatedAtDesc,
  listTicketsByIdAsc,
  listTicketsByIdDesc,
  listTicketsByPriorityAsc,
  listTicketsByPriorityDesc,
} from '../generated/queries_sql.js';
import type { TicketDto } from '../contracts/ticket-dto.js';

type QueryClient = Parameters<typeof getTicket>[0];
export type TicketStatus = TicketDto['status'];
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListFilters {
  status?: TicketStatus;
  assignee?: string | null;
  sort?: TicketSort;
  direction?: SortDirection;
  offset?: number;
  limit?: number;
}

function queryClient(client: Pool | PoolClient): QueryClient {
  return client as unknown as QueryClient;
}

function mapTicket(row: Awaited<ReturnType<typeof getTicket>> extends infer Result ? Exclude<Result, null> : never): TicketDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status as TicketStatus,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

function listArgs(input: ListFilters) {
  const assigneeProvided = Object.hasOwn(input, 'assignee');
  return {
    statusFilter: input.status ?? '',
    assigneeMode: !assigneeProvided ? 0 : input.assignee === null ? 1 : 2,
    assigneeValue: typeof input.assignee === 'string' ? input.assignee : '',
    offsetCount: String(input.offset ?? 0),
    limitCount: String(input.limit ?? 50),
  };
}

const listQueries = {
  'id:asc': listTicketsByIdAsc,
  'id:desc': listTicketsByIdDesc,
  'priority:asc': listTicketsByPriorityAsc,
  'priority:desc': listTicketsByPriorityDesc,
  'createdAt:asc': listTicketsByCreatedAtAsc,
  'createdAt:desc': listTicketsByCreatedAtDesc,
} as const;

export async function listTickets(pool: Pool, input: ListFilters): Promise<TicketDto[]> {
  const sort = input.sort ?? 'id';
  const direction = input.direction ?? 'asc';
  const query = listQueries[`${sort}:${direction}` as keyof typeof listQueries];
  const rows = await query(queryClient(pool), listArgs(input));
  return rows.map((row) => mapTicket(row as Awaited<ReturnType<typeof getTicket>> extends infer Result ? Exclude<Result, null> : never));
}

export async function findTicket(pool: Pool, id: string): Promise<TicketDto | null> {
  const row = await getTicket(queryClient(pool), { id });
  return row === null ? null : mapTicket(row);
}

export async function insertTicket(pool: Pool, input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata: Record<string, unknown> }): Promise<TicketDto> {
  const row = await createTicket(queryClient(pool), { ...input, metadata: JSON.stringify(input.metadata) });
  if (row === null) throw new Error('create query returned no row');
  return mapTicket(row);
}

export async function assignWithAudit(pool: Pool, id: string, assignee: string | null): Promise<{ id: string; assignee: string | null } | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const assigned = await assignTicket(queryClient(client), { id, assignee });
    if (assigned === null) {
      await client.query('ROLLBACK');
      return null;
    }
    await insertTicketAudit(queryClient(client), { ticketId: id, detail: assignee ?? 'unassigned' });
    await client.query('COMMIT');
    return assigned;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
