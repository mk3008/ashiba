import { drizzle } from 'drizzle-orm/node-postgres';

import { PostgresPoolProvider } from './platform/pool.js';
import { TicketApplicationError, TicketUseCases } from './tickets/application/ticket-use-cases.js';
import type { CreateTicketInput, TicketDto, TicketListInput } from './tickets/dto.js';
import { ticketReadModel } from './tickets/query/ticket-read-model.js';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Application {
  list(input?: TicketListInput): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: CreateTicketInput): Promise<TicketDto>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

/** The G1 application boundary owns runtime lifecycle and feature wiring. */
export function createApplication(runtime: Runtime): Application {
  const poolProvider = new PostgresPoolProvider(runtime.connectionString);
  const tables = ticketReadModel(runtime.schema);
  const db = drizzle(poolProvider.pool);
  let closePromise: Promise<void> | undefined;

  const ensureOpen = () => {
    if (closePromise !== undefined) {
      throw new TicketApplicationError('APPLICATION_CLOSED', 'application is closed');
    }
  };
  const useCases = new TicketUseCases(db, tables, ensureOpen);

  return {
    list: (input) => useCases.list(input),
    get: (input) => useCases.get(input),
    create: (input) => useCases.create(input),
    assign: (input) => useCases.assign(input),
    close: () => {
      closePromise ??= poolProvider.close();
      return closePromise;
    },
  };
}
