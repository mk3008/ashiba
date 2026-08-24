import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import { prepareNamedSql } from '../sql.js';
import type { AssignTicketSqlParams, InsertTicketEventSqlParams, Ticket } from './types.js';

const updateSql = readFileSync(fileURLToPath(new URL('./assign-ticket.sql', import.meta.url)), 'utf8');
const eventSql = readFileSync(fileURLToPath(new URL('./insert-event.sql', import.meta.url)), 'utf8');
export async function assignTicket(pool: Pool, input: { ticketId: string; assigneeId: string; actorId: string; note?: string }): Promise<Ticket | undefined> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updateParams: AssignTicketSqlParams = { assigneeId: input.assigneeId, ticketId: input.ticketId };
    const update = prepareNamedSql(updateSql, updateParams);
    const ticket = (await client.query<Ticket>(update.sql, update.values)).rows[0];
    if (!ticket) throw new Error(`Ticket not found: ${input.ticketId}`);
    const eventParams: InsertTicketEventSqlParams = {
      ticketId: input.ticketId, actorId: input.actorId, note: input.note ?? null,
    };
    const event = prepareNamedSql(eventSql, eventParams);
    await client.query(event.sql, event.values);
    await client.query('COMMIT');
    return ticket;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
