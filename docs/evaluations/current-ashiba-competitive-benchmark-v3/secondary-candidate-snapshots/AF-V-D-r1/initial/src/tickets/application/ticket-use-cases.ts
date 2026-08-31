import { sql } from 'drizzle-orm';

import type { DrizzleDatabase, TransactionRunner } from '../../platform/transaction.js';
import { toTicketDto, type TicketDto, type TicketStatus } from '../dto.js';

/** Feature-local use-case seam. Implement ticket operations here or beside it. */
export const ticketUseCaseBoundary = 'vertical-slice';

export class ApplicationError extends Error {
  readonly code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';
  constructor(code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED', message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

export interface CreateTicketInput {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
}

export class TicketUseCases {
  constructor(private readonly database: DrizzleDatabase, private readonly transactionRunner: TransactionRunner) {}

  async create(input: CreateTicketInput): Promise<TicketDto> {
    const result = await this.database.execute(sql`
      INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
      VALUES (${input.title}, ${input.status}::ticket_status, ${input.assignee}, ${input.priority}, CURRENT_TIMESTAMP, ${JSON.stringify(input.metadata ?? {})}::jsonb)
      RETURNING id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
    `);
    return toTicketDto((result.rows as unknown[])[0] as Parameters<typeof toTicketDto>[0]);
  }

  async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
    return this.transactionRunner.inTransaction(async (client) => {
      const database = client as DrizzleDatabase;
      const updated = await database.execute(sql`
        UPDATE tickets SET assignee = ${input.assignee}
        WHERE id = ${input.id}::bigint
        RETURNING id::text AS id, assignee
      `);
      const row = (updated.rows as Array<{ id: string; assignee: string | null }>)[0];
      if (row === undefined) throw new ApplicationError('NOT_FOUND', 'Ticket was not found');
      await database.execute(sql`
        INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
        VALUES (${input.id}::bigint, ${'assigned'}, ${JSON.stringify({ assignee: input.assignee })}, CURRENT_TIMESTAMP)
      `);
      return row;
    });
  }
}
