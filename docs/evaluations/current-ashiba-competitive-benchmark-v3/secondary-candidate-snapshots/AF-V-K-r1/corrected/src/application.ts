import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import { createTicketUseCases, type TicketApplication } from './tickets/application/ticket-use-cases.js';
import type { Database } from './tickets/query/ticket-read-model.js';

export interface Runtime {
  connectionString: string;
  schema: string;
}

/**
 * The Kysely PostgreSQL dialect owns the application's normal database path.
 * The runner supplies a role whose search_path is already scoped to schema.
 */
export function createApplication(runtime: Runtime): TicketApplication {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const database = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return createTicketUseCases(database);
}
