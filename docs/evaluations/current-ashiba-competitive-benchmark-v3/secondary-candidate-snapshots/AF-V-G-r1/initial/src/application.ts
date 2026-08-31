import { createNativePool, createPoolProvider } from './platform/pool.js';
import { createTransactionRunner } from './platform/transaction.js';
import { ApplicationError, TicketUseCases } from './tickets/application/ticket-use-cases.js';
import type { CreateTicketInput, ListTicketsInput, TicketDto } from './tickets/dto.js';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Application {
  list(input?: ListTicketsInput): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: CreateTicketInput): Promise<TicketDto>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

/** Wires the ordinary native-pg seams to the feature-local ticket slice. */
export function createApplication(runtime: Runtime): Application {
  const pool = createNativePool(runtime.connectionString);
  const pools = createPoolProvider(pool);
  const tickets = new TicketUseCases(pools, createTransactionRunner(pool));
  let closed = false;
  let closePromise: Promise<void> | undefined;

  const requireOpen = (): void => {
    if (closed) throw new ApplicationError('APPLICATION_CLOSED', 'application is closed');
  };

  return {
    async list(input?: ListTicketsInput): Promise<TicketDto[]> {
      requireOpen();
      return tickets.list(input);
    },
    async get(input: { id: string }): Promise<TicketDto | null> {
      requireOpen();
      if (input === null || typeof input !== 'object') throw new ApplicationError('VALIDATION', 'get input is invalid');
      return tickets.get(input.id);
    },
    async create(input: CreateTicketInput): Promise<TicketDto> {
      requireOpen();
      return tickets.create(input);
    },
    async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
      requireOpen();
      if (input === null || typeof input !== 'object') throw new ApplicationError('VALIDATION', 'assign input is invalid');
      return tickets.assign(input.id, input.assignee);
    },
    close(): Promise<void> {
      if (closePromise === undefined) {
        closed = true;
        closePromise = pools.close();
      }
      return closePromise;
    },
  };
}
