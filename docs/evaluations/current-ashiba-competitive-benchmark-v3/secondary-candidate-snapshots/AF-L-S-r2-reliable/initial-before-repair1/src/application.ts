import { Pool } from 'pg';
import { ApplicationError, createTicketService } from './application/ticket-service.js';

export function createApplication(runtime: { connectionString: string }) {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const service = createTicketService(pool);
  let closed = false;
  const open = (): void => {
    if (closed) throw new ApplicationError('APPLICATION_CLOSED', 'application is closed');
  };
  return {
    list: async (input?: Parameters<typeof service.list>[0]) => { open(); return service.list(input); },
    get: async (input: Parameters<typeof service.get>[0]) => { open(); return service.get(input); },
    create: async (input: Parameters<typeof service.create>[0]) => { open(); return service.create(input); },
    assign: async (input: Parameters<typeof service.assign>[0]) => { open(); return service.assign(input); },
    close: async () => { if (!closed) { closed = true; await pool.end(); } },
  };
}
