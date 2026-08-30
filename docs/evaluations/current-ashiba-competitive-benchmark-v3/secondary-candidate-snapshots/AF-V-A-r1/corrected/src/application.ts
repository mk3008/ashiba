import { NativePgPoolProvider } from './platform/pool.js';
import { NativePgTransactionRunner } from './platform/transaction.js';
import { TicketApplicationError, TicketUseCases, type CreateTicketInput } from './tickets/application/ticket-use-cases.js';
import type { TicketListInput } from './tickets/query/ticket-read-model.js';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface Application {
  list(input?: TicketListInput): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: CreateTicketInput): Promise<Ticket>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

class ClosedApplicationError extends Error implements ApplicationError {
  readonly code = 'APPLICATION_CLOSED' as const;

  constructor() {
    super('APPLICATION_CLOSED');
    this.name = 'ClosedApplicationError';
  }
}

class TicketApplication implements Application {
  private closed = false;
  private closePromise: Promise<void> | undefined;

  constructor(
    private readonly pool: NativePgPoolProvider,
    private readonly tickets: TicketUseCases,
  ) {}

  list(input?: TicketListInput): Promise<Ticket[]> {
    this.ensureOpen();
    return this.tickets.list(input);
  }

  get(input: { id: string }): Promise<Ticket | null> {
    this.ensureOpen();
    if (typeof input !== 'object' || input === null) {
      return Promise.reject(new TicketApplicationError('VALIDATION'));
    }
    return this.tickets.get(input.id);
  }

  create(input: CreateTicketInput): Promise<Ticket> {
    this.ensureOpen();
    return this.tickets.create(input);
  }

  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
    this.ensureOpen();
    if (typeof input !== 'object' || input === null) {
      return Promise.reject(new TicketApplicationError('VALIDATION'));
    }
    return this.tickets.assign(input);
  }

  close(): Promise<void> {
    this.closed = true;
    this.closePromise ??= this.pool.close();
    return this.closePromise;
  }

  private ensureOpen(): void {
    if (this.closed) {
      throw new ClosedApplicationError();
    }
  }
}

/** Creates the ordinary application boundary around the feature-local ticket slice. */
export async function createApplication(runtime: Runtime): Promise<Application> {
  if (typeof runtime?.connectionString !== 'string') {
    throw new TicketApplicationError('VALIDATION');
  }
  const pool = new NativePgPoolProvider(runtime.connectionString);
  return pool.withPool(async (nativePool) => {
    const tickets = new TicketUseCases(nativePool, new NativePgTransactionRunner(nativePool));
    return new TicketApplication(pool, tickets);
  });
}
