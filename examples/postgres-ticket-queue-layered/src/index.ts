import { PgPoolAdapter } from './adapter/pgPool.js';
import { SqlTicketAccess } from './access/ticketAccess.js';
import { TicketService } from './application/ticketService.js';

export function createTicketService(databaseUrl = process.env.DATABASE_URL): { service: TicketService; pool: PgPoolAdapter } {
  const pool = new PgPoolAdapter({ connectionString: databaseUrl });
  return { pool, service: new TicketService(pool, new SqlTicketAccess()) };
}
