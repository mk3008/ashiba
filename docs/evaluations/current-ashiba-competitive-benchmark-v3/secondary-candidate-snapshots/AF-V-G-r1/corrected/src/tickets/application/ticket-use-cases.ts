import type { Pool, PoolClient } from 'pg';

import type { TransactionRunner } from '../../platform/transaction.js';
import { ticketFromRow } from '../query/ticket-read-model.js';
import type { TicketDto, TicketStatus } from '../dto.js';

/** Feature-local use-case seam. */
export const ticketUseCaseBoundary = 'vertical-slice';

export interface CreateTicketInput {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
}

export async function createTicket(pool: Pool, input: CreateTicketInput): Promise<TicketDto> {
  const result = await pool.query(`
    INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5::jsonb)
    RETURNING id, title, status, assignee, priority, created_at, metadata
  `, [input.title, input.status, input.assignee, input.priority, JSON.stringify(input.metadata ?? {})]);
  return ticketFromRow(result.rows[0]);
}

export async function assignTicket(
  transactions: TransactionRunner,
  id: string,
  assignee: string | null,
): Promise<{ id: string; assignee: string | null } | null> {
  return transactions.inTransaction(async (client) => assignAndAudit(client, id, assignee));
}

async function assignAndAudit(
  client: PoolClient,
  id: string,
  assignee: string | null,
): Promise<{ id: string; assignee: string | null } | null> {
  const update = await client.query<{ id: string; assignee: string | null }>(`
    UPDATE tickets
    SET assignee = $2
    WHERE id = $1
    RETURNING id, assignee
  `, [id, assignee]);
  const ticket = update.rows[0];
  if (ticket === undefined) {
    return null;
  }

  await client.query(`
    INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
    VALUES ($1, 'assigned', $2, CURRENT_TIMESTAMP)
  `, [id, JSON.stringify({ assignee })]);
  return { id: String(ticket.id), assignee: ticket.assignee };
}
