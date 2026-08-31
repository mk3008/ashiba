import { NativePgPool } from './platform/pool.js';
import { NativePgTransactionRunner } from './platform/transaction.js';
import {
  ApplicationError,
  TicketUseCases,
  type CreateInput,
  type ListInput,
} from './tickets/application/ticket-use-cases.js';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Application {
  list(input?: ListInput): Promise<import('./tickets/dto.js').TicketDto[]>;
  get(input: { id: string }): Promise<import('./tickets/dto.js').TicketDto | null>;
  create(input: CreateInput): Promise<import('./tickets/dto.js').TicketDto>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

export { ApplicationError };

/** Application composition root; ticket data access remains feature-local. */
export function createApplication(runtime: Runtime): Application {
  const pool = new NativePgPool(runtime.connectionString);
  const tickets = new TicketUseCases(new NativePgTransactionRunner(pool.pool));
  let closed = false;
  let closePromise: Promise<void> | undefined;

  const requireOpen = (): void => {
    if (closed) throw new ApplicationError('APPLICATION_CLOSED');
  };

  return {
    list: async (input) => {
      requireOpen();
      return pool.withPool((client) => tickets.list(client, input));
    },
    get: async (input) => {
      requireOpen();
      return pool.withPool((client) => tickets.get(client, input));
    },
    create: async (input) => {
      requireOpen();
      return pool.withPool((client) => tickets.create(client, input));
    },
    assign: async (input) => {
      requireOpen();
      return pool.withPool((client) => tickets.assign(client, input));
    },
    close: async () => {
      if (closePromise !== undefined) return closePromise;
      closed = true;
      closePromise = pool.close();
      return closePromise;
    },
  };
}
