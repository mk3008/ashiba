import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import { prepareNamedSql } from '../sql.js';
import type { Ticket } from './types.js';

const updateSql = readFileSync(fileURLToPath(new URL('./assign-ticket.sql', import.meta.url)), 'utf8');
const eventSql = readFileSync(fileURLToPath(new URL('./insert-event.sql', import.meta.url)), 'utf8');
export async function assignTicket(pool: Pool, input: { ticketId: number; assigneeId: number; actorId: number; note?: string }): Promise<Ticket | undefined> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const update = prepareNamedSql(updateSql, input);
    const ticket = (await client.query<Ticket>(update.sql, update.values)).rows[0];
    if (!ticket) throw new Error(`Ticket not found: ${input.ticketId}`);
    const event = prepareNamedSql(eventSql, { ...input, note: input.note ?? null });
    await client.query(event.sql, event.values);
    await client.query('COMMIT');
    return ticket;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
