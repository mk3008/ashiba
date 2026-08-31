import { createKyselyTicketStore } from './tickets/infrastructure/kysely-ticket-store.js';
import { TicketUseCases } from './tickets/application/ticket-use-cases.js';
import type { Application, Runtime } from './tickets/types.js';

/**
 * Composition stays deliberately small: the supplied application boundary owns
 * the lifecycle, while ticket behaviour remains in its vertical slice.
 */
export function createApplication(runtime: Runtime): Application {
  const tickets = createKyselyTicketStore(runtime);
  const useCases = new TicketUseCases(tickets);
  let closed = false;

  function requireOpen(): void {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'Application has been closed');
    }
  }

  return {
    async list(input) { requireOpen(); return useCases.list(input); },
    async get(input) { requireOpen(); return useCases.get(input); },
    async create(input) { requireOpen(); return useCases.create(input); },
    async assign(input) { requireOpen(); return useCases.assign(input); },
    async close() {
      if (closed) return;
      closed = true;
      await tickets.close();
    },
  };
}

export function applicationError<C extends 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED'>(
  code: C,
  message: string,
): Error & { code: C } {
  const error = new Error(message) as Error & { code: C };
  error.code = code;
  return error;
}
