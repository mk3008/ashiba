import { Pool } from 'pg';
import { createTicketService } from './application/ticket-service.js';
import { TicketDataAccess } from './data-access/ticket-data-access.js';

export function createApplication(runtime: { connectionString: string; schema: string }) {
  const pool = new Pool({ connectionString: runtime.connectionString, max: 4 });
  const dataAccess = new TicketDataAccess(pool);
  return createTicketService(pool, dataAccess);
}
