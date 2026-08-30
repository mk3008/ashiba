import { createTicketQueries, type TicketRuntime } from './tickets/query/ticket-queries.js';

export function createApplication(runtime: TicketRuntime) {
  let closed = false;
  const queries = createTicketQueries(runtime);
  const open = () => {
    if (closed) throw Object.assign(new Error('application is closed'), { code: 'APPLICATION_CLOSED' as const });
  };
  return {
    list: async (input?: Parameters<typeof queries.list>[0]) => { open(); return queries.list(input); },
    get: async (input: Parameters<typeof queries.get>[0]) => { open(); return queries.get(input); },
    create: async (input: Parameters<typeof queries.create>[0]) => { open(); return queries.create(input); },
    assign: async (input: Parameters<typeof queries.assign>[0]) => { open(); return queries.assign(input); },
    close: async () => { if (!closed) { closed = true; await queries.close(); } },
  };
}
