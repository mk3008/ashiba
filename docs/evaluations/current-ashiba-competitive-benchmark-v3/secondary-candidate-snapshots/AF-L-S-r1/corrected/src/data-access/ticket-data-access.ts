/** Data-access seam. Canonical SQL/query code may remain in this ordinary layer. */
export const ticketDataAccessBoundary = 'layered';

import {
  createTicket,
  getTicket,
  insertAssignmentAudit,
  listTicketsByCreatedAtAsc,
  listTicketsByCreatedAtDesc,
  listTicketsByIdAsc,
  listTicketsByIdDesc,
  listTicketsByPriorityAsc,
  listTicketsByPriorityDesc,
  updateTicketAssignee,
} from './generated/queries_sql.js';
import type { TicketDto, TicketSort, SortDirection } from '../contracts/ticket-dto.js';

type QueryClient = Parameters<typeof getTicket>[0];
type TicketRow = Awaited<ReturnType<typeof getTicket>>;

export interface TicketFilters {
  hasStatus: boolean;
  status: string;
  hasAssignee: boolean;
  assignee: string | null;
  offset: number;
  limit: number;
}

const listQuery = {
  id: { asc: listTicketsByIdAsc, desc: listTicketsByIdDesc },
  priority: { asc: listTicketsByPriorityAsc, desc: listTicketsByPriorityDesc },
  createdAt: { asc: listTicketsByCreatedAtAsc, desc: listTicketsByCreatedAtDesc },
} as const;

function metadata(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return metadata(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toTicket(row: Exclude<TicketRow, null>): TicketDto {
  return {
    id: String(row.id),
    title: row.title,
    status: row.status as TicketDto['status'],
    assignee: row.assignee,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
    metadata: metadata(row.metadata),
  };
}

export class TicketDataAccess {
  async list(client: QueryClient, filters: TicketFilters, sort: TicketSort, direction: SortDirection): Promise<TicketDto[]> {
    const query = listQuery[sort][direction];
    const rows = await query(client, {
      hasStatus: filters.hasStatus,
      status: filters.status,
      hasAssignee: filters.hasAssignee,
      assignee: filters.assignee as unknown as string,
      pageOffset: filters.offset,
      pageLimit: filters.limit,
    });
    return rows.map(toTicket);
  }

  async get(client: QueryClient, id: string): Promise<TicketDto | null> {
    const row = await getTicket(client, { id });
    return row === null ? null : toTicket(row);
  }

  async create(client: QueryClient, input: { title: string; status: string; assignee: string | null; priority: number; metadata: string }): Promise<TicketDto> {
    const row = await createTicket(client, {
      title: input.title,
      status: input.status,
      assignee: input.assignee as unknown as string,
      priority: input.priority,
      metadata: input.metadata,
    });
    if (row === null) {
      throw new Error('insert did not return a ticket');
    }
    return toTicket(row);
  }

  async assign(client: QueryClient, id: string, assignee: string | null): Promise<{ id: string; assignee: string | null } | null> {
    const updated = await updateTicketAssignee(client, { id, assignee: assignee as unknown as string });
    if (updated === null) {
      return null;
    }
    await insertAssignmentAudit(client, {
      ticketId: id,
      detail: JSON.stringify({ assignee }),
    });
    return { id: String(updated.id), assignee: updated.assignee };
  }
}
