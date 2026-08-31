import type { TicketDto } from '../dto.js';
import type { Queryable } from '../../platform/pool.js';
import type { TransactionRunner } from '../../platform/transaction.js';
import {
  type CreateTicketParams,
  type ListTicketsParams,
  TicketQueries,
} from '../sql/generated/tickets.sql.js';

/** Feature-local use-case seam. Ticket query ownership stays in this slice. */
export const ticketUseCaseBoundary = 'vertical-slice';

export class TicketUseCases {
  constructor(
    private readonly database: Queryable,
    private readonly transactions: TransactionRunner,
  ) {}

  async list(params: ListTicketsParams): Promise<TicketDto[]> {
    const rows = await new TicketQueries(this.database).listTickets(params);
    return rows.map(toTicketDto);
  }

  async get(id: string): Promise<TicketDto | null> {
    const row = await new TicketQueries(this.database).getTicket({ id });
    return row === null ? null : toTicketDto(row);
  }

  async create(params: CreateTicketParams): Promise<TicketDto> {
    const row = await new TicketQueries(this.database).createTicket(params);
    return toTicketDto(row);
  }

  async assign(id: string, assignee: string | null): Promise<{ id: string; assignee: string | null } | null> {
    return this.transactions.inTransaction(async (client) => {
      const queries = new TicketQueries(client);
      const updated = await queries.assignTicket({ id, assignee });
      if (updated === null) return null;
      await queries.insertTicketAssignmentAudit({ ticketId: updated.id, assignee });
      return { id: updated.id, assignee: updated.assignee };
    });
  }
}

function toTicketDto(row: {
  id: string;
  title: string;
  status: 'open' | 'pending' | 'closed';
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: Record<string, unknown>;
}): TicketDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: new Date(row.created_at).toISOString(),
    metadata: row.metadata,
  };
}
