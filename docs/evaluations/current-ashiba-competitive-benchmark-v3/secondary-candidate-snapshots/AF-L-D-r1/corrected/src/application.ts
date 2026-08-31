import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import { TicketService, type TicketApplication } from './application/ticket-service.js';
import { TicketDataAccess } from './data-access/ticket-data-access.js';

export interface Runtime {
  connectionString: string;
  schema: string;
}

/**
 * Candidate entrypoint for the ordinary layered application boundary.
 *
 * The runner prepares the connection's nonce-schema search path.  The data
 * access layer deliberately uses unqualified application table names so this
 * application does not need to own the runner's schema lifecycle.
 */
export function createApplication(runtime: Runtime): TicketApplication {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const database = drizzle({ client: pool });
  const tickets = new TicketDataAccess(database);

  return new TicketService(tickets, async () => {
    await pool.end();
  });
}
