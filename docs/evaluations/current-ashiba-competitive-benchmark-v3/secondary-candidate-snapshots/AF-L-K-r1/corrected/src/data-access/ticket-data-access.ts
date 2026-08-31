/** Data-access seam. Canonical SQL/query code may remain in this ordinary layer. */
export const ticketDataAccessBoundary = 'layered';

import type { Generated, Kysely } from 'kysely';

import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsInput,
  TicketDto,
  TicketSort,
} from '../contracts/ticket-dto.js';
import type { TransactionRunner } from '../platform/transaction.js';

interface TicketsTable {
  id: Generated<string>;
  title: string;
  status: TicketDto['status'];
  assignee: string | null;
  priority: number;
  created_at: Date;
  metadata: Record<string, unknown>;
}

interface TicketAuditTable {
  audit_id: Generated<string>;
  ticket_id: string;
  action: string;
  detail: string;
  created_at: Date;
}

export interface TicketDatabase {
  tickets: TicketsTable;
  ticket_audit: TicketAuditTable;
}

type TicketRow = Omit<TicketsTable, 'id'> & { id: string };

const sortColumns: Record<TicketSort, 'id' | 'priority' | 'created_at'> = {
  id: 'id',
  priority: 'priority',
  createdAt: 'created_at',
};

function toTicket(row: TicketRow): TicketDto {
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString(),
    metadata: row.metadata,
  };
}

export class TicketDataAccess {
  constructor(
    private readonly database: Kysely<TicketDatabase>,
    private readonly transactions: TransactionRunner<TicketDatabase>,
  ) {}

  async list(input: Required<Pick<ListTicketsInput, 'sort' | 'direction' | 'offset' | 'limit'>> & ListTicketsInput): Promise<TicketDto[]> {
    let query = this.database.selectFrom('tickets').selectAll();

    if (input.status !== undefined) {
      query = query.where('status', '=', input.status);
    }
    if (input.assignee !== undefined) {
      query = input.assignee === null
        ? query.where('assignee', 'is', null)
        : query.where('assignee', '=', input.assignee);
    }

    const rows = await query
      .orderBy(sortColumns[input.sort], input.direction)
      .orderBy('id', 'asc')
      .offset(input.offset)
      .limit(input.limit)
      .execute();
    return rows.map(toTicket);
  }

  async get(id: string): Promise<TicketDto | null> {
    const row = await this.database
      .selectFrom('tickets')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row === undefined ? null : toTicket(row);
  }

  async create(input: CreateTicketInput): Promise<TicketDto> {
    const row = await this.database
      .insertInto('tickets')
      .values({
        title: input.title,
        status: input.status,
        assignee: input.assignee,
        priority: input.priority,
        created_at: new Date(),
        metadata: input.metadata ?? {},
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toTicket(row);
  }

  async assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null } | null> {
    return this.transactions.inTransaction(async (transaction) => {
      const ticket = await transaction
        .updateTable('tickets')
        .set({ assignee: input.assignee })
        .where('id', '=', input.id)
        .returning(['id', 'assignee'])
        .executeTakeFirst();

      if (ticket === undefined) {
        return null;
      }

      await transaction
        .insertInto('ticket_audit')
        .values({
          ticket_id: ticket.id,
          action: 'assigned',
          detail: JSON.stringify({ assignee: input.assignee }),
          created_at: new Date(),
        })
        .execute();

      return { id: String(ticket.id), assignee: ticket.assignee };
    });
  }
}
