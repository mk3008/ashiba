import pg from 'pg';
import { listTickets, getTicketById, assignTicketWithAudit } from '../query/ticketQueries.mjs';

export function createTicketApplication(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString });
  return {
    list: (options) => listTickets(pool, options),
    get: (ticketId) => getTicketById(pool, ticketId),
    assign: (ticketId, assigneeId, options) => assignTicketWithAudit(pool, ticketId, assigneeId, options),
    close: () => pool.end(),
  };
}
